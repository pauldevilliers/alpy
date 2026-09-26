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

if [ ! -d "$TARGET/.git" ]; then
  git clone "$REPO" "$TARGET"
else
  git -C "$TARGET" pull --ff-only
fi

cd "$TARGET"

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET="$(openssl rand -hex 32)"
  sed -i "s/replace-with-a-long-random-secret/$SECRET/" .env
  echo
  echo "Created $TARGET/.env"
  echo "Edit it before production use:"
  echo "  nano $TARGET/.env"
  echo
  echo "Set ALPY_BASE_URL and SMTP settings."
fi

echo "Building disposable Alpy desktop image..."
docker build -t alpy-desktop:local .

echo "Starting Alpy gateway..."
docker compose up -d --build gateway

echo
echo "Alpy gateway is listening on:"
echo "  http://127.0.0.1:8080"
echo
echo "Expose only this gateway through your HTTPS reverse proxy or Cloudflare Tunnel."
echo "Each signed-in user receives:"
echo "  - a permanent UUID"
echo "  - a Docker volume named alpy-user-<uuid>"
echo "  - a private Alpy desktop container"
