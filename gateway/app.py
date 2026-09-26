import asyncio, base64, hashlib, hmac, html, os, secrets, smtplib, sqlite3, ssl, time, uuid
from email.message import EmailMessage
from urllib.parse import quote
import docker
from aiohttp import ClientSession, WSMsgType, web

DB_PATH=os.getenv("ALPY_DB","/state/alpy.db")
BASE_URL=os.getenv("ALPY_BASE_URL","http://localhost:8080").rstrip("/")
ALPY_IMAGE=os.getenv("ALPY_IMAGE","alpy-desktop:local")
NETWORK=os.getenv("ALPY_DOCKER_NETWORK","alpy-net")
INTERNAL_SECRET=os.getenv("ALPY_INTERNAL_SECRET","")
MAGIC_MINUTES=int(os.getenv("ALPY_MAGIC_MINUTES","10"))
SESSION_DAYS=int(os.getenv("ALPY_SESSION_DAYS","30"))
SMTP_HOST=os.getenv("SMTP_HOST","")
SMTP_PORT=int(os.getenv("SMTP_PORT","587"))
SMTP_USER=os.getenv("SMTP_USER","")
SMTP_PASSWORD=os.getenv("SMTP_PASSWORD","")
SMTP_FROM=os.getenv("SMTP_FROM","Alpy <alpy@example.com>")
SMTP_TLS=os.getenv("SMTP_TLS","true").lower()=="true"
COOKIE_SECURE=os.getenv("ALPY_COOKIE_SECURE","true").lower()=="true"

docker_client=docker.from_env()
http=None

LOGIN="""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alpy</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d0f12;color:#f5f7fa;font-family:system-ui;display:grid;place-items:center;min-height:100vh}
.c{width:min(430px,calc(100vw - 32px));padding:38px;border:1px solid #272b31;border-radius:22px;background:#14171b}
h1{font-size:48px;margin:0 0 8px}.s{color:#9da5b0;margin:0 0 28px;line-height:1.5}input,button{width:100%;height:52px;border-radius:12px;font-size:16px}
input{background:#0d0f12;color:#fff;border:1px solid #343a42;padding:0 16px}button{margin-top:12px;border:0;background:#f4f4f4;color:#111;font-weight:750;cursor:pointer}
small{display:block;color:#727a84;margin-top:18px;line-height:1.5}</style></head><body><main class="c"><h1>Alpy</h1><p class="s">Your Linux workspace lives online.<br>Enter your email for a secure sign-in link.</p><form method="post" action="/auth/request"><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button>Send magic link</button></form><small>No password. Each link expires and works only once.</small></main></body></html>"""
CHECK="""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Check email - Alpy</title><style>body{margin:0;background:#0d0f12;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh}.c{width:min(460px,calc(100vw - 32px));padding:38px;border:1px solid #272b31;border-radius:22px;background:#14171b}p{color:#aab1bb;line-height:1.6}a{color:#fff}</style></head><body><div class="c"><h1>Check your email</h1><p>Alpy has sent a one-time sign-in link.</p><p><a href="/login">Use another email</a></p></div></body></html>"""

def db():
    os.makedirs(os.path.dirname(DB_PATH),exist_ok=True)
    c=sqlite3.connect(DB_PATH); c.row_factory=sqlite3.Row
    c.execute("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,created_at INTEGER NOT NULL)")
    c.execute("CREATE TABLE IF NOT EXISTS magic_links(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER)")
    c.execute("CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL)")
    c.commit(); return c

def h(v): return hashlib.sha256(v.encode()).hexdigest()
def internal_password(uid):
    if not INTERNAL_SECRET:
        raise RuntimeError("ALPY_INTERNAL_SECRET is not configured")
    return hmac.new(INTERNAL_SECRET.encode(),uid.encode(),hashlib.sha256).hexdigest()
def upstream_auth(uid):
    raw=f"alpy:{internal_password(uid)}".encode()
    return "Basic "+base64.b64encode(raw).decode()
def clean_email(v):
    v=(v or "").strip().lower()
    return v if "@" in v and "." in v.rsplit("@",1)[-1] and len(v)<=254 else None

def user_for(request):
    raw=request.cookies.get("alpy_session")
    if not raw: return None
    now=int(time.time())
    with db() as c:
        r=c.execute("SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",(h(raw),now)).fetchone()
    return dict(r) if r else None

def workspace(user):
    uid=user["id"]; short=uid.replace("-","")
    volume=f"alpy-user-{short}"; name=f"alpy-{short}"
    try: docker_client.volumes.get(volume)
    except docker.errors.NotFound:
        docker_client.volumes.create(name=volume,labels={"alpy.user_id":uid})
    try:
        c=docker_client.containers.get(name)
        c.reload()
        if c.status!="running": c.start()
    except docker.errors.NotFound:
        c=docker_client.containers.run(ALPY_IMAGE,detach=True,name=name,hostname="alpy",
            environment={"TITLE":"Alpy","CUSTOM_USER":"alpy","PASSWORD":internal_password(uid),"NO_DECOR":"1","NO_FULL":"1","FM_HOME":"/config","ALPY_USER_ID":uid,"ALPY_EMAIL":user["email"]},
            volumes={volume:{"bind":"/config","mode":"rw"}},network=NETWORK,shm_size="1g",
            restart_policy={"Name":"unless-stopped"},labels={"alpy.user_id":uid})
    return name

def send_magic(to,link):
    if not SMTP_HOST: raise RuntimeError("SMTP not configured")
    m=EmailMessage(); m["Subject"]="Sign in to Alpy"; m["From"]=SMTP_FROM; m["To"]=to
    m.set_content(f"Open Alpy:\n\n{link}\n\nThis link expires in {MAGIC_MINUTES} minutes and works once.")
    m.add_alternative(f'<html><body style="font-family:system-ui"><h1>Alpy</h1><p><a href="{html.escape(link)}" style="display:inline-block;padding:14px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Open my Alpy</a></p><p>This link expires in {MAGIC_MINUTES} minutes and works once.</p></body></html>',subtype="html")
    if SMTP_TLS:
        with smtplib.SMTP(SMTP_HOST,SMTP_PORT,timeout=20) as s:
            s.starttls(context=ssl.create_default_context())
            if SMTP_USER: s.login(SMTP_USER,SMTP_PASSWORD)
            s.send_message(m)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST,SMTP_PORT,timeout=20) as s:
            if SMTP_USER: s.login(SMTP_USER,SMTP_PASSWORD)
            s.send_message(m)

async def login(request):
    if user_for(request): raise web.HTTPFound("/")
    return web.Response(text=LOGIN,content_type="text/html")

async def request_magic(request):
    email=clean_email((await request.post()).get("email"))
    if email:
        raw=secrets.token_urlsafe(32); now=int(time.time())
        with db() as c:
            c.execute("DELETE FROM magic_links WHERE expires_at<? OR used_at IS NOT NULL",(now,))
            c.execute("INSERT INTO magic_links(token_hash,email,expires_at) VALUES(?,?,?)",(h(raw),email,now+MAGIC_MINUTES*60)); c.commit()
        try: await asyncio.to_thread(send_magic,email,f"{BASE_URL}/auth/verify?token={quote(raw)}")
        except Exception as e:
            print(f"mail error: {e}",flush=True)
            return web.Response(text="Alpy email delivery is not configured correctly.",status=503)
    return web.Response(text=CHECK,content_type="text/html")

async def verify(request):
    raw=request.query.get("token",""); now=int(time.time())
    if not raw: raise web.HTTPFound("/login")
    with db() as c:
        r=c.execute("SELECT email,expires_at,used_at FROM magic_links WHERE token_hash=?",(h(raw),)).fetchone()
        if not r or r["used_at"] is not None or r["expires_at"]<now: return web.Response(text="Invalid or expired Alpy sign-in link.",status=400)
        email=r["email"]; u=c.execute("SELECT id,email FROM users WHERE email=?",(email,)).fetchone()
        if not u:
            uid=str(uuid.uuid4()); c.execute("INSERT INTO users VALUES(?,?,?)",(uid,email,now)); user={"id":uid,"email":email}
        else: user=dict(u)
        session=secrets.token_urlsafe(40)
        c.execute("UPDATE magic_links SET used_at=? WHERE token_hash=?",(now,h(raw)))
        c.execute("INSERT INTO sessions VALUES(?,?,?,?)",(h(session),user["id"],now+SESSION_DAYS*86400,now)); c.commit()
    await asyncio.to_thread(workspace,user)
    resp=web.HTTPFound("/"); resp.set_cookie("alpy_session",session,max_age=SESSION_DAYS*86400,httponly=True,secure=COOKIE_SECURE,samesite="Lax",path="/"); return resp

async def logout(request):
    raw=request.cookies.get("alpy_session")
    if raw:
        with db() as c: c.execute("DELETE FROM sessions WHERE token_hash=?",(h(raw),)); c.commit()
    resp=web.HTTPFound("/login"); resp.del_cookie("alpy_session",path="/"); return resp

HOP={"connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","transfer-encoding","upgrade","host"}
async def proxy(request):
    user=user_for(request)
    if not user: raise web.HTTPFound("/login")
    name=await asyncio.to_thread(workspace,user)
    target=f"http://{name}:3000{request.rel_url}"
    if request.headers.get("Upgrade","").lower()=="websocket":
        client=web.WebSocketResponse(); await client.prepare(request)
        headers={k:v for k,v in request.headers.items() if k.lower() not in HOP}
        headers["Authorization"]=upstream_auth(user["id"])
        async with http.ws_connect(target,headers=headers) as upstream:
            async def a():
                async for m in client:
                    if m.type==WSMsgType.TEXT: await upstream.send_str(m.data)
                    elif m.type==WSMsgType.BINARY: await upstream.send_bytes(m.data)
            async def b():
                async for m in upstream:
                    if m.type==WSMsgType.TEXT: await client.send_str(m.data)
                    elif m.type==WSMsgType.BINARY: await client.send_bytes(m.data)
            await asyncio.gather(a(),b())
        return client
    headers={k:v for k,v in request.headers.items() if k.lower() not in HOP}
    headers["Authorization"]=upstream_auth(user["id"])
    async with http.request(request.method,target,headers=headers,data=await request.read(),allow_redirects=False) as r:
        body=await r.read(); out={k:v for k,v in r.headers.items() if k.lower() not in HOP and k.lower()!="content-length"}
        return web.Response(body=body,status=r.status,headers=out)

async def start(app):
    global http
    db().close(); http=ClientSession(timeout=None)
async def stop(app):
    if http: await http.close()

app=web.Application(client_max_size=128*1024*1024)
app.router.add_get("/login",login); app.router.add_post("/auth/request",request_magic); app.router.add_get("/auth/verify",verify); app.router.add_get("/logout",logout)
app.router.add_route("*","/{tail:.*}",proxy); app.on_startup.append(start); app.on_cleanup.append(stop)
web.run_app(app,host="0.0.0.0",port=8080)
