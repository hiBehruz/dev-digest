# Spec — Run cost (USD) on review surfaces

Status: implemented (615bd9b) · Owner: lesson-1 lab · Touches: `server`, `client`, shared contracts

## Goal

Show what each review run cost in USD, in three places:

| # | Surface | What shows | Example |
| --- | --- | --- | --- |
| 1 | PR list (`/repos/:repoId/pulls`), new **COST** column between STATUS and UPDATED | **Total** cost of every run on that PR | `$0.014` |
| 2 | PR detail → **Agent runs** timeline, run row, under the timestamp | Tokens (in+out) and the cost of that run | `9,119 tok · $0.0013` |
| 3 | **Agent run** drawer → **Stats**, new tile between TOKENS and FINDINGS | Cost of that run | `COST $0.06` |

## Non-goals

- No new model calls. Cost already comes back with each LLM response.
- No budget, alert, or per-agent/per-model breakdown (that's the Agent Performance page).
- No backfill. Runs from before this change stay without a cost.

## Where the number comes from

The cost is already computed and then dropped:

- `reviewer-core` sums per-call `res.costUsd` into `ReviewOutcome.costUsd` ([run.ts](../../reviewer-core/src/review/run.ts), `reviewPullRequest`). If any call is un-priced, the total is `null`.
- Per call, [openrouter.ts](../../reviewer-core/src/llm/openrouter.ts) uses OpenRouter's `usage.cost` if present, otherwise the injected `estimateCost` (live PriceBook, then the static table in [pricing.ts](../src/adapters/llm/pricing.ts)), otherwise `null`.
- [run-executor.ts:213](../src/modules/reviews/run-executor.ts#L213) destructures `outcome` without `costUsd`. **This is where the value gets lost.** Commit `d45ab0d` removed the column and plumbing, and this spec puts them back.

## Rules

1. **Missing ≠ zero.** `null` means unknown: an un-priced model, a failed or cancelled run, or a run from before cost tracking. It renders as `—`. Only a real `0` renders `$0.00`.
2. **Precision.** Sub-cent runs are normal, so never round them to `$0.00`. Show about 2 significant digits below $0.10, and 2 decimals from $0.10 up.
3. **PR total** = SQL `SUM(cost_usd)` over the PR's runs. SUM skips nulls, and if every value is null the result is `null`, which renders as `—`. Deleting a run from the timeline lowers the total.
4. Every **completed** (`done`) run shows its cost. Running, failed, and cancelled runs show nothing in the timeline and `—` in the drawer.

## Formatter contract — `formatCost(usd)`

| input | output |
| --- | --- |
| `null` / `undefined` | `—` |
| `0` | `$0.00` |
| `0.0013` | `$0.0013` |
| `0.014` | `$0.014` |
| `0.0598` | `$0.06` |
| `0.1` | `$0.10` |
| `1.234` | `$1.23` |

## Changes

### Shared contracts (edit BOTH copies: `server/src/vendor/shared/` and `client/src/vendor/shared/`)

- `contracts/trace.ts`
  - `RunStats.cost_usd: z.number().nullish()`. It is `nullish` because traces stored before this change are jsonb documents with no such key.
  - `RunSummary.cost_usd: z.number().nullable()`.
- `contracts/platform.ts` → `PrMeta.cost_usd: z.number().nullish()`. Filled by the list endpoint only, same as `score`.

### Server

1. **Schema + migration.** Add `costUsd: doublePrecision('cost_usd')` to `agentRuns` in [runs.ts](../src/db/schema/runs.ts), then run `pnpm db:generate`. Expect `0010_*.sql` = `ALTER TABLE "agent_runs" ADD COLUMN "cost_usd" double precision;`. Generate it rather than hand-writing it (see `server/INSIGHTS.md`, drizzle `when` ordering).
2. **Repo.** `completeAgentRun` in [run.repo.ts:141](../src/modules/reviews/repository/run.repo.ts#L141) and [repository.ts:151](../src/modules/reviews/repository.ts#L151): add an optional `costUsd?: number | null` and write it. Failure paths leave it out, so the column stays `null` and those three call sites don't change.
3. **Executor.** In [run-executor.ts:213](../src/modules/reviews/run-executor.ts#L213), destructure `costUsd`, pass it to `completeAgentRun` (success path, ~L244), and put `cost_usd: costUsd` into `trace.stats` (~L265). `traceFromBuffer` stays as is (`nullish`).
4. **Timeline API.** `listRunsForPull` in [run.repo.ts](../src/modules/reviews/repository/run.repo.ts): map `cost_usd: run.costUsd`.
5. **PR list API.** In [pulls/routes.ts:114–157](../src/modules/pulls/routes.ts#L114), next to the score block, add one grouped query:

   ```ts
   db.select({ prId: t.agentRuns.prId, cost: sum(t.agentRuns.costUsd).mapWith(Number) })
     .from(t.agentRuns)
     .where(and(eq(t.agentRuns.workspaceId, workspaceId), inArray(t.agentRuns.prId, prIds)))
     .groupBy(t.agentRuns.prId)
   ```

   Map the result to `cost_usd`, using `null` when the PR has no row or a null sum. Gotcha: drizzle `sum()` returns a string (Postgres `numeric`), so `.mapWith(Number)` is required. A null result stays `null` and isn't turned into `0`, because drizzle skips the decoder for SQL NULL.

### Client

1. **Formatter.** Add `client/src/lib/cost.ts` exporting `formatCost(usd: number | null | undefined): string`, following the table above. No new dependency: `toFixed` / `toPrecision` or `Intl.NumberFormat` is enough.
2. **Screen 1: PR list.**
   - In [constants.ts](../../client/src/app/repos/[repoId]/pulls/constants.ts), add `"cost"` to `COLUMN_KEYS` after `"status"` and a matching ~72px track to `GRID` (L27).
   - In `messages/en/prReview.json`, add `list.columns.cost = "Cost"`.
   - In [PRRow.tsx](../../client/src/app/repos/[repoId]/pulls/_components/PRRow/PRRow.tsx), add a mono cell `formatCost(pr.cost_usd)`. Use the existing `s.muted` style when it is null, the same way the score `—` is styled.
3. **Screen 2: Agent runs timeline.** In [RunHistory.tsx:199](../../client/src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.tsx#L199), under the time and only when `settled`, render `{(tokens_in+tokens_out).toLocaleString()} tok · {formatCost(r.cost_usd)}`.
4. **Screen 3: Run drawer.** In [TraceBody.tsx:65](../../client/src/app/repos/[repoId]/pulls/[number]/_components/RunTraceDrawer/_components/TraceBody/TraceBody.tsx#L65), add `<Stat label={t("trace.stat.cost")} val={formatCost(stats.cost_usd)} />` after TOKENS. In `messages/en/runs.json`, add `trace.stat.cost = "COST"`.

## Acceptance criteria

- [ ] A new review on a priced model (e.g. `openrouter/deepseek-v4-flash`) persists `agent_runs.cost_usd > 0`.
- [ ] PR list COST equals the sum of that PR's run costs, and a PR with no priced runs shows `—`.
- [ ] A timeline `done` row shows `N tok · $X`. Failed, running, and cancelled rows show no cost line.
- [ ] The drawer Stats shows 4 tiles (DURATION, TOKENS, COST, FINDINGS). An old run or a failed run shows `COST —`.
- [ ] No `$0.00` appears for missing data anywhere.
- [ ] No additional LLM request per run (count calls in the run log, or the mock provider's call count, before and after).
- [ ] `pnpm typecheck` and `pnpm test` pass in `server` and `client`.

## Tests

- `client/src/lib/cost.test.ts`: the formatter table above, one `it.each`.
- `RunHistory.test.tsx`: add `cost_usd: null` to the `run()` fixture (the type now requires it), plus one case where a done run with `cost_usd: 0.0013` renders `$0.0013`.
- `RunTraceDrawer.test.tsx`: add `cost_usd: 0.06` to `TRACE.stats` and assert that `$0.06` renders.
- `server/test/integration.it.test.ts`: insert two `agent_runs` for one PR (0.001 + 0.002) and one un-priced run, then check that `GET /repos/:id/pulls` returns `cost_usd ≈ 0.003`.

## Implementation order

1. Contracts (both copies), so the type errors point to every call site.
2. Schema, `db:generate`, repo, executor. Check by running one review and reading `agent_runs.cost_usd` in psql.
3. Routes: `listRunsForPull` and the PR list sum.
4. `formatCost` with its test.
5. UI: drawer tile (smallest), then timeline row, then PR list column.
6. Tests, typecheck, then a manual pass over the three screens with `pnpm dev`.

## Edge cases / known limits

- **Mixed priced + un-priced runs on one PR.** The total counts only priced runs, so it understates. Acceptable for now. If it matters, show `≈` when any `done` run has `cost_usd IS NULL`.
- **Failed run after partial LLM spend.** Recorded as `null`, because the executor doesn't get a partial outcome. The tokens were spent but aren't counted.
- **CI reviews** are stored in `ci_runs` (which has its own `cost_usd`), not in `agent_runs`, so they aren't counted in these totals.
