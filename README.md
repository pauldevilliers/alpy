# Alpy

**Tiny, cloud-first Linux. Your workspace lives online; every device is just a window into it.**

Alpy is an Alpine-based graphical Linux workspace that runs on a server and opens from Windows, macOS, Linux, tablets or phones through a browser.

## v0.2: personal cloud workspaces

Alpy now uses email magic-link sign-in.

Each account receives:

- a permanent UUID
- its own Docker volume: `alpy-user-<uuid>`
- its own private Alpy desktop container
- the same files and settings from every device
- no traditional file-sync layer or duplicate local copy

Changing an email address later does not need to move the workspace because storage is keyed by UUID, not email.

## Architecture

```
Windows app / browser / phone
            |
          HTTPS
            |
       Alpy gateway
      email magic link
            |
        user UUID
            |
      private container
            |
   alpy-user-<uuid> volume
            |
     /config inside Alpy
```

The gateway is the only service that should be exposed externally. Individual desktop containers live only on the private Docker network.

## Persistent data

Inside a user's desktop, persistent data lives under:

```
/config
├── Projects/
├── Documents/
├── Downloads/
└── .config/
```

On the Docker host this is a named Docker volume. List them with:

```bash
docker volume ls --filter name=alpy-user-
```

Inspect a user's volume with:

```bash
docker volume inspect alpy-user-<uuid>
```

The desktop image is disposable. Rebuilding or replacing a desktop container does not remove its user volume.

## Magic-link authentication

The login flow is:

```
email address
    |
send magic link
    |
one-time token (10 min default)
    |
secure session cookie (30 days default)
    |
personal Alpy workspace
```

Magic-link tokens are random, stored only as SHA-256 hashes, expire automatically and are single-use.

Browser sessions use an HttpOnly cookie. In production, keep `ALPY_COOKIE_SECURE=true` and expose Alpy only through HTTPS.

The internal KasmVNC password is derived from a server-only `ALPY_INTERNAL_SECRET`. The gateway injects this credential automatically, so users never see or manage a second desktop password.

## Install

On an Ubuntu/Debian server with Docker + Docker Compose v2:

```bash
curl -fsSL https://raw.githubusercontent.com/pauldevilliers/alpy/main/install-server.sh | bash
```

The installer:

1. clones or updates Alpy
2. creates `.env`
3. generates a private 256-bit internal secret
4. builds the disposable desktop image as `alpy-desktop:local`
5. builds and starts the authentication gateway

Then edit:

```bash
nano ~/alpy/.env
```

At minimum configure:

```dotenv
ALPY_BASE_URL=https://alpy.example.com

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASSWORD=your-password
SMTP_FROM=Alpy <alpy@example.com>
SMTP_TLS=true
```

Do not commit the real `.env`.

## Internet access

The gateway binds only to:

```
127.0.0.1:8080
```

Put Cloudflare Tunnel, Caddy, nginx or another HTTPS reverse proxy in front of it.

Example Cloudflare quick tunnel for testing:

```bash
cloudflared tunnel --url http://localhost:8080
```

For production, use a named tunnel and a stable hostname such as:

```
https://alpy.example.com
```

and set that exact URL as `ALPY_BASE_URL`.

## Updating Alpy

```bash
cd ~/alpy
git pull
docker build -t alpy-desktop:local .
docker compose up -d --build gateway
```

Existing user volumes remain untouched.

## Account database

Authentication state is stored in the `alpy-auth` Docker volume using SQLite.

It contains:

- permanent user UUID
- email address
- hashed one-time magic-link tokens
- hashed session tokens
- expiry timestamps

It does **not** store the raw magic-link or session tokens.

## Backups

The live user filesystem is deliberately a real Linux filesystem rather than S3-mounted storage. That keeps Git, SQLite, locks, symlinks and developer tools behaving normally.

The next storage layer should back up the `alpy-user-*` volumes to encrypted S3/object storage or snapshots. Live access should continue to use the Docker volume.

## Windows

The existing `windows/` launcher can open the Alpy HTTPS address in an app-style window. Because authentication is web-based, Windows, mobile and browser clients all use the same magic-link account and therefore the same cloud workspace.
