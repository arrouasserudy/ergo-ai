#!/usr/bin/env bash
# Downloads a consistent snapshot of the production database and keeps it locally.
#
#   pnpm db:snapshot-prod                  # ./prod-snapshot-<UTC stamp>.db (gitignored)
#   pnpm db:snapshot-prod ~/backups/x.db   # any other path
#
# The file contains health data: keep it on an encrypted disk and delete it when done.
set -euo pipefail

APP=ergo-ai
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=${1:-prod-snapshot-$STAMP.db}
REMOTE_SNAPSHOT=/tmp/snapshot-$STAMP.db

[ -e "$OUT" ] && { echo "$OUT already exists." >&2; exit 1; }
command -v fly >/dev/null || { echo "The fly CLI is required." >&2; exit 1; }

echo "→ Waking the machine…"
curl -fsS -o /dev/null "https://$APP.fly.dev/login"

echo "→ Taking a consistent snapshot on the server…"
fly ssh console --app "$APP" -C "sqlite3 /data/ergoai.db '.timeout 5000' '.backup $REMOTE_SNAPSHOT'" >/dev/null
trap 'fly ssh console --app "$APP" -C "rm -f $REMOTE_SNAPSHOT" >/dev/null' EXIT

echo "→ Downloading…"
mkdir -p "$(dirname "$OUT")"
fly ssh sftp get "$REMOTE_SNAPSHOT" "$OUT" --app "$APP" >/dev/null

echo "→ Checking integrity…"
[ "$(sqlite3 "$OUT" 'PRAGMA integrity_check')" = ok ] || { echo "✗ Integrity check failed: $OUT" >&2; exit 1; }

echo "✓ $OUT ($(du -h "$OUT" | cut -f1)). Contains health data: keep it encrypted, delete it when done."
echo "  Browse: DATABASE_PATH=$OUT pnpm db:studio"
