@AGENTS.md

# Bilan — assistant for pediatric occupational therapists

- Code is written in English: identifiers, files, routes, DB columns, enum/tag keys, and comments.
- UI copy is French and lives only in `src/i18n/fr.ts`. Don't put French string literals in components.
- Children are pseudonymized: store initials only, never full names (see `initials` in `src/lib/validation.ts`).
- Multi-tenancy: children belong to an `account` (a cabinet); `therapists` (Better Auth users) belong to one account and see all its children. Every page and server action must call `requireTherapist()` (`src/lib/session.ts`) and scope queries by `accountId`. Owner-only actions use `requireOwner()`.
- Auth: Better Auth email/password (`src/lib/auth.ts`). Public sign-up endpoint is disabled; therapists are created only via `createTherapist()` (`src/lib/therapists.ts`).
- Stack: Next.js 16 App Router, Tailwind v4 (tokens in `src/app/globals.css`), Drizzle + SQLite (`data/ergoai.db`, auto-migrated on startup).
- After a schema change: `pnpm db:generate`. Seed demo data: `pnpm db:seed [--reset]`.
- Checks: `pnpm typecheck && pnpm lint && pnpm build`.
