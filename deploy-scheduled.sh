#!/bin/zsh
# Scheduled deploy — thedataduel.com
# Queued: 2026-06-22 | Target: 2026-06-23 05:50 AM PDT

cd /Users/northstarleadautomation/.openclaw/workspace/projects/thedataduel

echo "[$(date)] Starting scheduled deploy..."

# Build
node build.js
if [ $? -ne 0 ]; then
  echo "[$(date)] BUILD FAILED — aborting deploy" >&2
  exit 1
fi
echo "[$(date)] Build complete."

# Git push
git add -A
git commit -m "Update: About Me section, Moosend pricing $7→$9, discount callouts, CSS v6"
git push origin main

echo "[$(date)] Deploy complete. Site will update on Cloudflare Pages within ~60 seconds."
