#!/usr/bin/env bash
# Opens Drizzle Studio on a fresh, read-only snapshot of the production database.
# The local copy contains health data: it is deleted when Studio exits.
set -euo pipefail

APP=ergo-ai
SNAPSHOT=prod-snapshot.db
REMOTE_SNAPSHOT=/tmp/studio-snapshot.db
PORT=4984 # distinct from `pnpm db:studio` (4983) so both can run side by side

cleanup() { rm -f "$SNAPSHOT" "$SNAPSHOT-wal" "$SNAPSHOT-shm"; }
trap cleanup EXIT

echo "→ Waking the machine…"
curl -fsS -o /dev/null "https://$APP.fly.dev/login"

echo "→ Taking a consistent snapshot on the server…"
fly ssh console --app "$APP" -C "sqlite3 /data/ergoai.db '.backup $REMOTE_SNAPSHOT'" >/dev/null

echo "→ Downloading…"
cleanup
fly ssh sftp get "$REMOTE_SNAPSHOT" "$SNAPSHOT" --app "$APP" >/dev/null
fly ssh console --app "$APP" -C "rm -f $REMOTE_SNAPSHOT" >/dev/null

echo "→ Drizzle Studio: https://local.drizzle.studio?port=$PORT"
echo "  Snapshot only: edits here do NOT affect production. Ctrl+C to quit (the snapshot is then deleted)."
DATABASE_PATH="$SNAPSHOT" pnpm exec drizzle-kit studio --port "$PORT"
