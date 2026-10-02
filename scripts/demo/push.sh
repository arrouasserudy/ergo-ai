#!/usr/bin/env bash
# Copies one account of the local database to production, replacing it there
# (default: the demo cabinet, see src/db/demo.ts).
#
#   pnpm demo:push [accountId]
#   DATABASE_PATH=data/other.db pnpm demo:push      # export from another local database
#
# Safety: refuses when the local and production migrations differ, when the account
# exists in production under another name or owner email (a real cabinet), when one of
# its therapists' emails belongs to another production account, or when the production
# account has uploaded documents. Backs up the production database first (last 5 kept),
# applies everything in one transaction, then checks the row counts of the account and
# that every other account is unchanged.
set -euo pipefail

APP=ergo-ai
REMOTE_DB=/data/ergoai.db
LOCAL_DB=${DATABASE_PATH:-data/ergoai.db}
ACCOUNT=${1:-}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

[ -f "$LOCAL_DB" ] || { echo "No local database at $LOCAL_DB." >&2; exit 1; }
command -v fly >/dev/null || { echo "The fly CLI is required." >&2; exit 1; }

# Runs a shell script on the machine (sent base64-encoded: no quoting issues).
remote_sh() {
  local b64 err
  b64=$(printf '%s' "$1" | base64 | tr -d '\n')
  err="$WORK/ssh.err"
  if ! fly ssh console --app "$APP" --quiet -C "sh -c 'echo $b64 | base64 -d | sh'" 2>"$err"; then
    cat "$err" >&2
    return 1
  fi
}
# Runs a local SQL file against the production database (read-mostly checks; small files only).
remote_sql() {
  local b64
  b64=$(base64 < "$1" | tr -d '\n')
  remote_sh "echo $b64 | base64 -d | sqlite3 -batch -bail $REMOTE_DB"
}
wake() { curl -fsS -o /dev/null "https://$APP.fly.dev/login"; }

echo "→ Exporting the account from ${LOCAL_DB}…"
DATABASE_PATH="$LOCAL_DB" pnpm -s tsx scripts/demo/export-account.ts "$WORK" ${ACCOUNT:+"$ACCOUNT"}
ACCOUNT_ID=$(sed -n 's/^-- Account \([0-9a-f-]*\) .*/\1/p' "$WORK/push.sql")

echo "→ Waking the machine…"
wake

echo "→ Comparing migrations…"
sqlite3 "$LOCAL_DB" "SELECT hash FROM __drizzle_migrations ORDER BY hash" >"$WORK/migrations.local"
remote_sh "sqlite3 $REMOTE_DB 'SELECT hash FROM __drizzle_migrations ORDER BY hash'" | tr -d '\r' >"$WORK/migrations.prod"
if ! diff -u "$WORK/migrations.prod" "$WORK/migrations.local" >"$WORK/migrations.diff"; then
  echo "✗ Local and production migrations differ (- production, + local):" >&2
  tail -n +3 "$WORK/migrations.diff" | grep '^[-+]' >&2
  echo "  Deploy first, or export from a database built from the committed migrations (DATABASE_PATH=…)." >&2
  exit 1
fi
echo "  $(wc -l <"$WORK/migrations.local" | tr -d ' ') migrations, identical."

echo "→ Checking the production account…"
remote_sql "$WORK/check.sql" | tr -d '\r' >"$WORK/check.out"
check() { sed -n "s/^$1|//p" "$WORK/check.out"; }
case "$(check account)" in
  new) echo "  Not in production yet: it will be created." ;;
  same) echo "  Exists in production with the same name and owner: it will be replaced." ;;
  different)
    echo "✗ Account $ACCOUNT_ID exists in production as \"$(check target)\" (name / owner), unlike the local one. Refusing to overwrite it." >&2
    exit 1 ;;
  *) echo "✗ Unexpected check output:" >&2; cat "$WORK/check.out" >&2; exit 1 ;;
esac
if [ -n "$(check emails_elsewhere)" ]; then
  echo "✗ These emails belong to another production account: $(check emails_elsewhere)" >&2
  exit 1
fi
if [ "$(check documents)" != "0" ]; then
  echo "✗ The production account has $(check documents) uploaded document(s); deleting them would orphan their search indexes. Delete them in the app first." >&2
  exit 1
fi
[ "$(check conversations)" = "0" ] || echo "  ! $(check conversations) Amit conversation(s) of this account in production will be deleted."

echo "→ Recording the other accounts' row counts…"
remote_sql "$WORK/others.sql" | tr -d '\r' >"$WORK/others.before"

echo "→ Backing up the production database…"
BACKUP=/data/backups/ergoai-$STAMP.db
remote_sh "set -e
mkdir -p /data/backups
sqlite3 $REMOTE_DB '.timeout 5000' '.backup $BACKUP'
ls -1t /data/backups/ergoai-*.db | tail -n +6 | xargs -r rm -f
echo \"  $BACKUP (\$(du -h $BACKUP | cut -f1)); kept: \$(ls /data/backups | wc -l)\""

echo "→ Uploading $(du -h "$WORK/push.sql" | cut -f1) of SQL…"
REMOTE_SQL=/data/demo-push-$STAMP.sql
wake
fly ssh sftp put "$WORK/push.sql" "$REMOTE_SQL" --app "$APP" >/dev/null

echo "→ Applying it (one transaction)…"
if ! remote_sh "sqlite3 -batch $REMOTE_DB < $REMOTE_SQL"; then
  remote_sh "rm -f $REMOTE_SQL" || true
  echo "✗ The SQL failed: nothing was committed. Backup: $BACKUP" >&2
  exit 1
fi
remote_sh "rm -f $REMOTE_SQL"

echo "→ Verifying…"
remote_sql "$WORK/counts.sql" | tr -d '\r' >"$WORK/counts.prod"
paste -d' ' <(cut -d'|' -f1,2 "$WORK/counts.prod" | tr '|' ' ') <(cut -d'|' -f2 "$WORK/expected.txt") |
  awk '{ printf "  %-18s %6s  (local %s)%s\n", $1, $2, $3, ($2 == $3 ? "" : "  ✗") }'
if ! diff -q "$WORK/counts.prod" "$WORK/expected.txt" >/dev/null; then
  echo "✗ Row counts differ from the local account." >&2
  exit 1
fi
remote_sql "$WORK/others.sql" | tr -d '\r' >"$WORK/others.after"
if diff -u "$WORK/others.before" "$WORK/others.after" >"$WORK/others.diff"; then
  echo "  Other accounts unchanged: $(tr '\n' ' ' <"$WORK/others.after")"
else
  echo "! Other accounts' row counts changed during the push (real activity?):" >&2
  tail -n +3 "$WORK/others.diff" | grep '^[-+]' >&2
  exit 1
fi
remote_sh "sqlite3 $REMOTE_DB 'PRAGMA foreign_key_check' | head -5"
echo "✓ Account $ACCOUNT_ID pushed to production. Backup: $BACKUP"
