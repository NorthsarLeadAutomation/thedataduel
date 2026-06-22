#!/bin/bash
# ─────────────────────────────────────────────
# THE DATA DUEL — Weekly Auto-Deploy
# Runs every Tuesday at 8:50 AM ET via LaunchAgent
# Builds site → commits → pushes to GitHub → Cloudflare Pages auto-deploys
# ─────────────────────────────────────────────

set -e

PROJECT_DIR="$HOME/.openclaw/workspace/projects/thedataduel"
LOG="$HOME/.openclaw/workspace/memory/thedataduel-deploy.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S %Z')

echo "[$DATE] 🚀 Weekly deploy triggered" >> "$LOG"

cd "$PROJECT_DIR"

# Build the site
echo "[$DATE] Running build..." >> "$LOG"
/opt/homebrew/bin/node build.js >> "$LOG" 2>&1

# Stage all changes
git add -A

# Only commit if there are actual changes
if git diff --cached --quiet; then
  echo "[$DATE] ✅ No changes to commit — site is already up to date." >> "$LOG"
  exit 0
fi

WEEK=$(date '+%Y-W%V')
git commit -m "Weekly update — $WEEK" >> "$LOG" 2>&1

# Push to GitHub (Cloudflare Pages auto-deploys on push)
git push origin main >> "$LOG" 2>&1

echo "[$DATE] ✅ Deploy complete — Cloudflare Pages will rebuild shortly." >> "$LOG"
