#!/usr/bin/env bash
set -euo pipefail
REPO="https://github.com/pauldevilliers/alpy.git"
TARGET="${ALPY_HOME:-$HOME/alpy}"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required."
  echo "Ubuntu/Debian quick install:"
  echo "  curl -fsSL https://get.docker.com | sh"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required."
  exit 1
fi
if [ ! -d "$TARGET/.git" ]; then git clone "$REPO" "$TARGET"; else git -C "$TARGET" pull --ff-only; fi
cd "$TARGET"
if [ ! -f .env ]; then
  cp .env.example .env
  PASS="$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-20)"
  sed -i "s/change-me-now/$PASS/" .env
  echo
  echo "Generated Alpy password: $PASS"
  echo "Saved in $TARGET/.env"
  echo
fi
docker compose up -d --build
echo
echo "Alpy is running locally on the server:"
echo "  http://127.0.0.1:3000"
echo
echo "Put Cloudflare Tunnel, Tailscale Funnel, Caddy or nginx in front of port 3000 for internet access."
