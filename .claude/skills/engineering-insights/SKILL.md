---
name: engineering-insights
description: Appends non-obvious engineering insights — gotchas, dead ends, "chose X because Y" decisions, library quirks, recurring errors with their fix — to the INSIGHTS.md of the module the work touched, so the next session doesn't relearn them. Use the moment such a finding surfaces mid-session, at the end of a substantial session ("wrap up", "retro"), or on /engineering-insights. `/engineering-insights review` prunes and consolidates the files.
argument-hint: "[review]"
---

# Engineering insights

Turns what this session learned the hard way into entries the next agent can act on **cold**: read once, know what to do, no archaeology. Two modes: **capture** (default — append-only, no approval prompt) and **review** (when `$ARGUMENTS` is `review` — consolidation, only with the user's approval).

## What earns an entry

Test every candidate: **"Would this be obvious to anyone reading the code?"** Yes → skip it.

Signals, strongest first. The ranking also decides what survives the cap of 5 entries per run:

1. A user correction ("no — here we do it through …").
2. A **dead end**: an approach that looked right and failed, and why.
3. An error you would hit again, and its fix.
4. A decision with its reason: "chose X over Y because Z".
5. A library or tool quirk; a convention the code doesn't announce.

Leave out: truisms, what README or official docs already say, transient failures (network flake, stale cache), routine edits, style preferences, anything a linter enforces.

| Noise | Actionable cold |
|---|---|
| "Promises can be tricky" | "`Promise.all()` on the ingest pipeline times out past 30 items — use `Promise.allSettled()` in batches of 10." |
| "Careful with context enrichment" | "Context enrichment is best-effort: on an unindexed repo or an error, omit the section — never throw." |
| "Fixed the migration" | "Hand-edited migration SQL drifts from `meta/*_snapshot.json`, so the next `db:generate` emits a broken diff — change `schema/*.ts` and regenerate." |

## Where it goes

The `INSIGHTS.md` of the module the insight is about: the nearest directory above the touched files that holds one, else the nearest package root (own manifest or CLAUDE.md) — create the file there. An insight spanning modules is split, each part to its own module. Repo-wide config or CI → skip, unless the repo is a single package.

The file keeps these sections in this order. Add any missing heading once, below the preamble, keeping everything already there:

| Section | Holds |
|---|---|
| What Works | an approach that worked here |
| What Doesn't Work | dead ends and antipatterns — the most valuable, the most often skipped |
| Codebase Patterns | conventions, and decisions with their reason |
| Tool & Library Notes | dependency quirks |
| Recurring Errors & Fixes | the error and its fix |
| Session Notes | `### YYYY-MM-DD`, one line per outcome or decision — goes stale first |
| Open Questions | what's still unresolved |

Entry, at most two sentences:

```
- **YYYY-MM-DD** — <symptom or context → what to do, and why>. Evidence: `path/to/file.ts` (+ symbol or line).
```

## Capture

1. **Gate.** Mid-session: the finding just surfaced — go on. Wrap-up: did the session solve a problem, make a decision, or discover something? No → write nothing, say so in one line, stop.
2. **Draft** up to 5 candidates ranked by signal, each as the exact line + its section + its evidence. A candidate is a complete entry, never a title ("add the DM fix" is a title).
3. **Re-read the target file** now — it may have changed since the session began. Drop a candidate the file already says. When reality contradicts an old entry, the new one names it: "Supersedes the YYYY-MM-DD entry: …".
4. **Append** each survivor as a new bullet under its heading with an anchored Edit. Everything already in the file stays byte-for-byte — header, preamble, headings, entries. Write a whole file only when creating it.
5. **Report** one line per entry: file, section, text. The user spot-checks it; git is the undo.

Done when every candidate is appended or dropped with a reason, and no existing line changed.

## Review

Append-only keeps files growing; review is where they shrink. For each `INSIGHTS.md` in scope, list stale entries (bug fixed, library upgraded, code gone), duplicates and entries another one subsumes, contradictions, and vague lines. Propose the edits — delete, merge, rewrite, move between sections — and apply only what the user approves. A file past ~30 entries is split by domain (`INSIGHTS-db.md`, …) with a pointer from the main file. A rule that holds in every session and fits one line may be promoted to the package CLAUDE.md.

## Closing the loop

Insights pay off only when sessions read them. The project's root CLAUDE.md carries:

```markdown
## Session protocol (engineering-insights)
- Start: before changing a package, read its `INSIGHTS.md`, state the top 3 points relevant to the task, and treat them as high-confidence guidance unless the user says otherwise.
- During: a non-obvious finding → capture it with `/engineering-insights` right then.
- End: run `/engineering-insights` after every substantial session — don't skip the check; it writes nothing when nothing qualifies.
```

When it's missing, propose adding it. Auto-invocation from this description is probabilistic; when capture must be guaranteed, a Stop hook — gated to fire once per session, only after file edits — makes the wrap-up deterministic.

Insights never go into this skill's own files.
