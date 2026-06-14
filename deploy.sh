#!/bin/bash
set -e

VPS="root@91.218.141.109"
REMOTE_DIR="/opt/habit-tracker"

echo "==> Syncing files to VPS..."
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='.env' \
  --exclude='.git' \
  . "$VPS:$REMOTE_DIR"

echo "==> Installing dependencies and building..."
ssh "$VPS" "cd $REMOTE_DIR && npm install --production=false && npm run build"

echo "==> Done! Now SSH in and:"
echo "    1. Edit $REMOTE_DIR/.env"
echo "    2. Run: cd $REMOTE_DIR && npx tsx scripts/seed.ts"
echo "    3. Run: pm2 start ecosystem.config.js && pm2 save && pm2 startup"
