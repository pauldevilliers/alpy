# Alpy

**Tiny, cloud-first Linux. Your workspace lives online; the device is just the window.**

Alpy is an Alpine-based graphical Linux workspace designed to run on a small server and open from Windows, macOS, Linux, tablets or phones through a browser.

## What v0.1 includes

- Alpine Linux base
- KasmVNC browser desktop
- Openbox-style minimal desktop
- Terminal, Thunar file manager and Chromium
- Persistent `/config` home/data volume
- Disposable/rebuildable OS image
- One-click Windows launcher installer
- Docker Compose deployment

## Server install

On a small Ubuntu/Debian server with Docker installed:

```bash
git clone https://github.com/pauldevilliers/alpy.git
cd alpy
cp .env.example .env
nano .env
docker compose up -d --build
```

Or:

```bash
curl -fsSL https://raw.githubusercontent.com/pauldevilliers/alpy/main/install-server.sh | bash
```

Alpy listens only on `127.0.0.1:3000` by default. Put an HTTPS reverse proxy or tunnel in front of it.

## Cloudflare Tunnel example

Install `cloudflared`, authenticate it, then:

```bash
cloudflared tunnel --url http://localhost:3000
```

For a permanent setup, create a named tunnel and map a hostname such as `alpy.example.com` to `http://localhost:3000`.

## Windows one-click opener

Download the `windows` folder, then double-click:

```
install-alpy.cmd
```

Enter your Alpy HTTPS URL once. The installer creates a Desktop shortcut and Start Menu shortcut and opens Edge in app mode.

## Persistence

Everything under `./data` is mounted to `/config` inside Alpy. Keep projects, documents, settings and user data there. Rebuilding the container does not wipe that data.

## Update

```bash
git pull
docker compose up -d --build
```

## Recommended production layout

```
Internet
   |
Cloudflare Access / Tunnel
   |
127.0.0.1:3000
   |
Alpy container
   |
persistent /config volume
```

For v0.1, keep the server online continuously. Later versions can add sleep/wake, encrypted object backup, multi-device session handoff and a native Tauri launcher.
