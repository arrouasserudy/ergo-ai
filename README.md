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

## Demo cabinet (local and production)

A realistic demo cabinet, "Cabinet d'ergothérapie pédiatrique Azoulay" (owner `demo@ergo-ai.app`), with four fictional patients and every kind of data the app supports, dated relative to today: Noam Benhamou (4, autism and severe food selectivity), Léa Attias (7, DCD and handwriting), Ethan Cohen-Sabbah (9, ADHD with crises at school transitions), Maya Elbaz (5, born at 29 weeks, motor delay). Its password is `DEMO_PASSWORD` in `.env.local` (never committed; `MAGIC_PASSWORD` also works where it is set).

```bash
pnpm demo:seed     # rebuild the demo cabinet in the local database (src/db/demo.ts; other accounts untouched)
pnpm demo:push     # copy it to production, replacing the previous copy (scripts/demo/push.sh)
pnpm demo:push <accountId>                                  # any other local account
DATABASE_PATH=data/demo-push.db pnpm demo:seed && DATABASE_PATH=data/demo-push.db pnpm demo:push   # from a clean database
```

The push exports the account to one SQL transaction (delete it in production, then insert every row), after checking that local and production migrations are identical, that the production account (if any) has the same name and owner email, and that no email belongs to another account; it backs up the production database to `/data/backups` (last 5 kept) and checks every other account's row counts are unchanged. Amit conversations and uploaded documents are never copied.

## Collègue expert (literature chat)

Needs a chat key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) and an embedding key (`VOYAGE_API_KEY`, or the OpenAI key) in `.env.local`, and as Fly secrets in production. See `.env.example` for the options.
The shared library of open-access articles is built on your machine, then pushed to the server:

```bash
pnpm corpus:fetch    # download CC BY / CC0 pediatric OT articles from PubMed Central (data/corpus/raw)
pnpm corpus:build    # passages + Voyage embeddings → data/library.db (embeddings cached, resumable)
pnpm corpus:push     # upload to the Fly volume and swap it in
pnpm expert:search "weighted vest attention"   # see what the chat would retrieve (embedding key only)
```

Cabinets add their own PDFs from `/expert/library`.

## Deployment (Fly.io)

Every push to `main` runs the checks (typecheck, lint, tests), then `flyctl deploy` (`.github/workflows/deploy.yml`; also runnable by hand from the Actions tab). It needs the `FLY_API_TOKEN` repository secret, from `fly tokens create deploy -x 999999h`. Pending migrations are applied when the new machine boots; if one fails, the database is left untouched (single transaction), the server exits and the deploy fails on its health check. Fix forward, or roll back with `fly deploy --image <previous image>` (`fly releases --image` lists them).

## Production database (Fly.io)

SQLite lives on the Fly volume at `/data/ergoai.db`. For the live shell, wake the machine first (open the site or `fly machine start`):

```bash
fly ssh console -C "sqlite3 /data/ergoai.db"          # live SQL shell (changes apply immediately)

pnpm db:studio-prod                                   # Drizzle Studio on a fresh snapshot (deleted on exit)
```

