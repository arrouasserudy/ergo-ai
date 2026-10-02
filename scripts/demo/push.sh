#!/usr/bin/env bash
# Copies accounts of the local database to production, replacing them there
# (default: the three demo cabinets fr, he, en, see src/db/demo.ts).
#
#   pnpm demo:push                     # every demo cabinet
#   pnpm demo:push he en               # some of them
#   pnpm demo:push <accountId>         # any other local account
#   DATABASE_PATH=data/other.db pnpm demo:push      # export from another local database
#
# Safety: refuses when the local and production migrations differ, when an account
# exists in production under another name or owner email (a real cabinet), when one of
# its therapists' emails belongs to another production account, or when a production
# account has uploaded documents. Backs up the production database first (once per run,
# last 5 kept), applies everything in one transaction, then checks the row counts of the
# pushed accounts and that every other account is unchanged.
set -euo pipefail

APP=ergo-ai
REMOTE_DB=/data/ergoai.db
LOCAL_DB=${DATABASE_PATH:-data/ergoai.db}
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

echo "→ Exporting from ${LOCAL_DB}…"
DATABASE_PATH="$LOCAL_DB" pnpm -s tsx scripts/demo/export-account.ts "$WORK" "$@"
ACCOUNT_IDS=$(cut -d'|' -f1 "$WORK/accounts.txt")

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

echo "→ Checking the production accounts…"
remote_sql "$WORK/check.sql" | tr -d '\r' >"$WORK/check.out"
check() { sed -n "s/^$1|$2|//p" "$WORK/check.out"; }
for ID in $ACCOUNT_IDS; do
  NAME=$(grep "^$ID|" "$WORK/accounts.txt" | cut -d'|' -f2)
  case "$(check "$ID" account)" in
    new) echo "  \"$NAME\": not in production yet, it will be created." ;;
    same) echo "  \"$NAME\": exists in production with the same name and owner, it will be replaced." ;;
    different)
      echo "✗ Account $ID exists in production as \"$(check "$ID" target)\" (name / owner), unlike the local one. Refusing to overwrite it." >&2
      exit 1 ;;
    *) echo "✗ Unexpected check output for $ID:" >&2; cat "$WORK/check.out" >&2; exit 1 ;;
  esac
  if [ -n "$(check "$ID" emails_elsewhere)" ]; then
    echo "✗ These emails belong to another production account: $(check "$ID" emails_elsewhere)" >&2
    exit 1
  fi
  if [ "$(check "$ID" documents)" != "0" ]; then
    echo "✗ \"$NAME\" has $(check "$ID" documents) uploaded document(s) in production; deleting them would orphan their search indexes. Delete them in the app first." >&2
    exit 1
  fi
  [ "$(check "$ID" conversations)" = "0" ] || echo "  ! $(check "$ID" conversations) Amit conversation(s) of \"$NAME\" in production will be deleted."
done

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
paste -d'|' "$WORK/counts.prod" <(cut -d'|' -f3 "$WORK/expected.txt") |
  awk -F'|' '{ if ($1 != last) { print "  " $1; last = $1 } printf "    %-18s %6s  (local %s)%s\n", $2, $3, $4, ($3 == $4 ? "" : "  ✗") }'
if ! diff -q "$WORK/counts.prod" "$WORK/expected.txt" >/dev/null; then
  echo "✗ Row counts differ from the local accounts." >&2
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
echo "✓ $(wc -l <"$WORK/accounts.txt" | tr -d ' ') account(s) pushed to production: $(cut -d'|' -f2 "$WORK/accounts.txt" | paste -sd, - | sed 's/,/, /g'). Backup: $BACKUP"
