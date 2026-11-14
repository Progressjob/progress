#!/usr/bin/env bash
# Progress Jobs Auto-Deploy Script for VPS
# Strictly isolated to Progress Jobs (/home/d3l1v3ry/htdocs/progress-jobs)
# Never touches or affects Delivery Platform or ClothTrack
# Auto-deployment active via GitHub Webhook

set -e

REPO_DIR="/home/d3l1v3ry/htdocs/progress-jobs"
LOG_FILE="$REPO_DIR/deploy.log"

# Fallback if running from current directory
if [ ! -d "$REPO_DIR" ]; then
  REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  LOG_FILE="$REPO_DIR/deploy.log"
fi

exec >> "$LOG_FILE" 2>&1

echo ""
echo "=================================================="
echo "Deployment started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Working directory: $REPO_DIR"
echo "=================================================="

cd "$REPO_DIR"

# 1. Fetch & pull latest main branch
echo "[1/4] Pulling latest changes from Git..."
git fetch origin main
git reset --hard origin/main

# 2. Update backend, apply migrations & build NestJS
echo "[2/4] Updating backend dependencies and compiling..."
cd "$REPO_DIR/backend"
npm install --include=dev
npx prisma migrate deploy
npm run build

# 3. Build frontend SPA
echo "[3/4] Building frontend application..."
cd "$REPO_DIR/frontend"
npm install --include=dev
npm run build
chmod -R o+rx "$REPO_DIR/frontend/dist"
chmod -R o+rwx "$REPO_DIR/backend/storage" 2>/dev/null || true

# 4. Reload backend in PM2 (strictly isolated to progress-jobs-backend)
echo "[4/4] Reloading PM2 process 'progress-jobs-backend'..."
cd "$REPO_DIR/backend"
if pm2 list | grep -q "progress-jobs-backend"; then
  pm2 restart progress-jobs-backend --update-env
else
  pm2 start dist/main.js --name progress-jobs-backend --update-env
fi
pm2 save

echo "=================================================="
echo "Deployment completed successfully: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
