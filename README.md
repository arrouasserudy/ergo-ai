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

## Demo cabinets (local and production)

Three realistic demo cabinets, one per language, each with four fictional patients and every kind of data the app supports, dated relative to today. Each opens in its own interface language on sign-in. Passwords live in `.env.local` (never committed; `MAGIC_PASSWORD` also works where it is set).

| Cabinet | Login (password) | Patients |
| --- | --- | --- |
| French, Cabinet Azoulay | `demo@ergo-ai.app` (`DEMO_PASSWORD`) | Noam Benhamou (4, autism, food selectivity), Léa Attias (7, DCD, handwriting), Ethan Cohen-Sabbah (9, ADHD, crises at transitions), Maya Elbaz (5, born at 29 weeks, motor delay) |
| Hebrew, Michal Rosen, Modi'in | `demo-he@ergo-ai.app` (`DEMO_HE_PASSWORD`) | עומר לוי (4, autism, food selectivity), נועה פרידמן (7, DCD, handwriting), איתי בן דוד (9, ADHD, crises at transitions), הדר מזרחי (5, Down syndrome, low tone) |
| English, Sarah Whitfield, London | `demo-en@ergo-ai.app` (`DEMO_EN_PASSWORD`) | Oliver Bennett (4, autism, food selectivity), Amelia Clarke (7, DCD, handwriting), Jack Thompson (9, ADHD, crises at transitions), Isla Morgan (5, born at 29 weeks, low tone) |

Content per cabinet in `src/db/demo/{fr,he,en}.ts`, shared builders in `demo/kit.ts`, insertion in `demo/seed.ts`, fixed ids in `src/db/demo-ids.ts`.

```bash
pnpm demo:seed            # rebuild the three cabinets in the local database (other accounts untouched)
pnpm demo:seed he         # only one (fr, he, en)
pnpm demo:push            # copy the three to production, replacing the previous copies (scripts/demo/push.sh)
pnpm demo:push he en      # only some; or an <accountId> for any other local account
DATABASE_PATH=data/demo-push.db pnpm demo:seed && DATABASE_PATH=data/demo-push.db pnpm demo:push   # from a clean database
```

The push exports the accounts to one SQL transaction (delete them in production, then insert every row), after checking that local and production migrations are identical, that each production account (if any) has the same name and owner email, and that no email belongs to another account; it backs up the production database once per run to `/data/backups` (last 5 kept) and checks every other account's row counts are unchanged. Amit conversations and uploaded documents are never copied.

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

