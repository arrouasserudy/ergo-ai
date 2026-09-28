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

