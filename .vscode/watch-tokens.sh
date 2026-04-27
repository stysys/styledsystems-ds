#!/bin/bash
# Polls GitHub every 20s and syncs _stysys/ when its content changes.
REPO_PATH="$(git rev-parse --show-toplevel)"
WATCH_PATH="_stysys/"
CHECK_INTERVAL=20

cd "$REPO_PATH" || exit

# Seed with current local tree hash so we don't re-sync on startup
LAST_TREE=$(git ls-tree -d HEAD "$WATCH_PATH" 2>/dev/null | awk '{print $3}')

echo "Watching $WATCH_PATH for GitHub updates (every ${CHECK_INTERVAL}s)..."

while true; do
  if ! git fetch origin main --quiet 2>/dev/null; then
    echo "$(date '+%H:%M:%S') Fetch failed, retrying in ${CHECK_INTERVAL}s..."
    sleep $CHECK_INTERVAL
    continue
  fi

  REMOTE_TREE=$(git ls-tree -d origin/main "$WATCH_PATH" 2>/dev/null | awk '{print $3}')

  if [ -n "$REMOTE_TREE" ] && [ "$REMOTE_TREE" != "$LAST_TREE" ]; then
    echo "$(date '+%H:%M:%S') New tokens detected, syncing..."
    git checkout origin/main -- "$WATCH_PATH" 2>/dev/null
    git reset HEAD -- "$WATCH_PATH" 2>/dev/null  # keep working tree clean
    LAST_TREE="$REMOTE_TREE"
    echo "$(date '+%H:%M:%S') Synced."
  fi

  sleep $CHECK_INTERVAL
done
