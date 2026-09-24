# Bilan

Report assistant for pediatric occupational therapists (see the PRD). Phase 1: app shell and child records.

```bash
pnpm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:seed                 # optional: demo cabinets, therapists and children
pnpm dev                     # http://localhost:3100
```

Demo logins (password `demo1234`): `michaela@demo.local` (owner), `colleague@demo.local` (member), `other@demo.local` (another cabinet).

The SQLite database is created in `data/ergoai.db` and migrated automatically on startup.

## Production database (Fly.io)

SQLite lives on the Fly volume at `/data/ergoai.db`. For the live shell, wake the machine first (open the site or `fly machine start`):

```bash
fly ssh console -C "sqlite3 /data/ergoai.db"          # live SQL shell (changes apply immediately)

pnpm db:studio-prod                                   # Drizzle Studio on a fresh snapshot (deleted on exit)
```
