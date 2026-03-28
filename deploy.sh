#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

if [ ! -f .env.local ]; then
  echo "Missing .env.local in $APP_DIR"
  echo "Copy .env.local.example to .env.local and fill the correct API URL first."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed. Install it first with: npm install -g pm2"
  exit 1
fi

mkdir -p logs

echo "==> Updating source code"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Installing Node.js dependencies"
npm ci

echo "==> Building Next.js app"
npm run build

echo "==> Restarting frontend via PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save

echo "Web deployed successfully."
