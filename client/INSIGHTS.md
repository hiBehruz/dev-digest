# Insights — client

Non-obvious findings and gotchas. Add an entry whenever something surprised you,
so the next agent/session doesn't relearn it.

## What Works

## What Doesn't Work

## Codebase Patterns
- **2026-09-27** — `@devdigest/shared` is a hand-maintained copy in `src/vendor/shared/` that nothing syncs from `server/src/vendor/shared/`, and the two already differ in 5 files. A contract change must be made in both copies in the same commit, or client and server parse different shapes without any error. Evidence: `vitest.config.ts` alias, `diff -rq server/src/vendor/shared client/src/vendor/shared`.

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
