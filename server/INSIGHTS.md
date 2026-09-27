# Insights — server

Non-obvious findings and gotchas. Add an entry whenever something surprised you,
so the next agent/session doesn't relearn it.

## What Works

## What Doesn't Work
- **2026-09-27** — Migrating a fresh DB with anything other than `runMigrations()` (e.g. `drizzle-kit migrate`, a hand-rolled migrator) fails with `type "vector" does not exist`: pgvector is NOT in migration 0000. `runMigrations()` runs `CREATE EXTENSION IF NOT EXISTS vector` outside the journal. The comments in `drizzle.config.ts` and `server/README.md` saying "enabled by migration 0000" are wrong. Evidence: `src/db/migrate.ts` (`runMigrations`), `src/db/migrations/0000_init.sql:75`.
- **2026-09-27** — `pnpm db:migrate` exits 0 and does nothing (no "✓ migrations applied" line) when the checkout path contains a space: the CLI guard compares `import.meta.url` (percent-encoded, `a%20b`) against `` `file://${process.argv[1]}` `` (raw `a b`). Fix by comparing against `pathToFileURL(process.argv[1]).href`. Evidence: `src/db/migrate.ts` (CLI entrypoint block), reproduced with plain `node`.

## Codebase Patterns
- **2026-09-27** — Root CLAUDE.md lists `src/vendor/shared/` as do-not-touch, yet a feature that changes an API shape has to edit it, and also mirror the edit in `client/src/vendor/shared/` (a manual copy, no sync). Change both copies in the same commit. Evidence: commit `615bd9b` (`contracts/trace.ts`, `contracts/platform.ts` in both packages).
- **2026-09-27** — `GET /runs/:id/trace` returns the stored `run_traces.trace` jsonb as-is (no Zod parse on read), so a field added to `RunStats` is simply absent on traces written before it. Declare it `.nullish()`, not `.nullable()`, and render `undefined` the same as `null`. Evidence: `src/modules/reviews/routes.ts` (`getRunTrace`), `src/vendor/shared/contracts/trace.ts` (`RunStats.cost_usd`).
- **2026-09-27** — The PR list COST is `SUM(agent_runs.cost_usd)` over all of the PR's runs, not "latest review batch" as in the course answer key (`upstream/lesson-1-lab/run-cost`). There is no batch id, and the answer key's 120 s window is a guess, while the SUM is exact and needs no extra code for nulls. Evidence: `src/modules/pulls/routes.ts` (`costByPr`), `specs/run-cost.md`.

## Tool & Library Notes
- **2026-09-27** — drizzle's migrator (0.38) reads only the newest `created_at` from `drizzle.__drizzle_migrations` and applies journal entries whose `when` is later, all in one transaction. A migration merged in from another branch with an older `when` than one already applied is silently skipped, so regenerate it on top of main with `pnpm db:generate` rather than cherry-picking the SQL. Evidence: `src/db/migrations/meta/_journal.json` (`when`), drizzle-orm `src/pg-core/dialect.ts` `migrate()`.
- **2026-09-27** — drizzle `sum()` comes back as a string (Postgres `numeric`), so wrap it in `.mapWith(Number)`. SQL NULL skips the decoder, so an all-null group stays `null` and doesn't become `0`. Evidence: `src/modules/pulls/routes.ts` (`costByPr`), drizzle-orm `utils.js` `mapResultRow`.

## Recurring Errors & Fixes
- **2026-09-27** — `TypeError: Cannot read properties of undefined (reading 'id')` in an integration test that reads `pulls[1]`: `MockGitHubClient.listPullRequests` returns only PR #482. Build multi-state cases on that one PR in sequence, or pass `pulls` to the mock. Evidence: `src/adapters/mocks.ts` (`listPullRequests`), `test/integration.it.test.ts` (cost_usd case).

## Session Notes

## Open Questions
- **2026-09-27** — Should `CREATE EXTENSION IF NOT EXISTS vector` move into a real custom migration (`drizzle-kit generate --custom`) so every migrator works on a fresh DB, and the stale "migration 0000" comments get fixed? Left untouched because `migrations/` is do-not-touch without coordination. Evidence: `src/db/migrate.ts`, root `CLAUDE.md` Do-not-touch.
