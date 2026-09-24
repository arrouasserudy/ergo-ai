#!/usr/bin/env bash
# Uploads the shared literature library (data/library.db) to the Fly volume and swaps
# it in atomically. The app reopens it on the next search (it watches the file's mtime).
set -euo pipefail

APP=ergo-ai
LOCAL=data/library.db
[ -f "$LOCAL" ] || { echo "No $LOCAL — run pnpm corpus:build first." >&2; exit 1; }

echo "→ Waking the machine…"
curl -fsS -o /dev/null "https://$APP.fly.dev/login"

echo "→ Uploading $(du -h "$LOCAL" | cut -f1)…"
fly ssh console --app "$APP" -C "rm -f /data/library.db.new" >/dev/null
fly ssh sftp put "$LOCAL" /data/library.db.new --app "$APP"

echo "→ Swapping it in…"
fly ssh console --app "$APP" -C "mv /data/library.db.new /data/library.db" >/dev/null
fly ssh console --app "$APP" -C "sqlite3 /data/library.db 'SELECT key, value FROM meta'"
