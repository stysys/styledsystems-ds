#!/bin/bash
# Polls GitHub every 20 seconds and pulls when _stysys/ changes.
# Run via VS Code task or: bash .vscode/watch-tokens.sh
REPO_PATH="$(git rev-parse --show-toplevel)"
WATCH_PATH="_stysys/"
CHECK_INTERVAL=20

cd "$REPO_PATH" || exit

echo "Watching $WATCH_PATH for GitHub updates (every ${CHECK_INTERVAL}s)..."

while true; do
  git fetch origin main --quiet 2>/dev/null

  if ! git diff --quiet HEAD origin/main -- "$WATCH_PATH"; then
    echo "$(date '+%H:%M:%S') New tokens pushed, syncing..."
    # _stysys/ is always generated — never hand-edited.
    # Force-checkout the exact remote state; no merge, no conflict.
    git checkout origin/main -- "$WATCH_PATH" 2>/dev/null
    echo "Tokens synced from GitHub"
  fi

  sleep $CHECK_INTERVAL
done
