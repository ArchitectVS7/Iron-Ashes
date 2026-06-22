# Agent Protocol — Iron Ashes v2

> **Every agent working on the v2 engine follows this.** It exists because a prior handover
> failed in 5 ways (claimed-green-but-hung suite, left failing tests, stale memory, half-updated
> roadmap, nothing committed + a misleading doc). The fix: the facts you'd be tempted to fudge
> (tests green, on the current code, committed) are **written and asserted by scripts**, not typed.
>
> Authority split: **`docs/handoff/state.json` is the source of truth for STATUS** (machine-checked).
> **ROADMAP / this doc / memory are authoritative for NARRATIVE.** Don't duplicate; see Drift rules.

---

## START of a step (read-only)

1. **`npm run handoff:check`** — confirms you're inheriting a clean, verified, committed baseline.
   **If it fails, the *previous* handover was broken — fix that first** (re-verify, commit, reconcile)
   before doing new work. This is the safety net that catches a bad inheritance.
2. Read **`docs/handoff/state.json`** → `currentStage`, `nextAction`, `specRefs`, `invariants`, `gotchas`.
3. Read **`docs/ROADMAP.md`** (§2 locked decisions; §4 — the first unchecked box must equal
   `state.currentStage`) and the **`specRefs`** sections of `docs/DESIGN-V2-ALGORITHM.md`.
4. Read the **memory file** (path below).

## WORK

Implement against the spec. All state mutation goes through `applyCommand` (`src/v2/reducer.ts`).
Write `tests/v2/*.test.ts` as you go. Keep everything deterministic (ALGORITHM §7).

## DEFINITION OF DONE (the gate — do every step, in order)

- [ ] 1. **`npm run verify`** exits **0**. (It auto-writes `lastVerified` + `sourceHash` + `dirty` into
      `state.json`. A hang → 120s timeout → fail. Red → fail. You cannot proceed on a lie.)
- [ ] 2. Edit `state.json` **narrative** fields: advance `currentStage`/`currentStageTitle`/`status`/
      `nextAction`/`specRefs`; refresh `invariants`/`gotchas`/`openRisks`. **Never hand-edit
      `lastVerified` or `dirty`** — those are script-owned.
- [ ] 3. Update **`docs/ROADMAP.md`**: tick the §4 box; add a §8 changelog entry (template below).
      Copy test counts from the verify output — do not guess.
- [ ] 4. Update the **memory file** (path + schema below). Required, not optional.
- [ ] 5. **Commit** (the work + `state.json` + ROADMAP). On the default branch, branch first.
      The `pre-commit` hook runs `verify --check` and blocks a red/hanging commit.
- [ ] 6. **`npm run handoff:check`** exits **0**. **Only now is the step done** (clean tree, fresh
      source hash, green).

---

## Hard rules

- **Never mark a step done without `npm run verify` exiting 0.** "Looks done" is not done.
- **Never `--no-verify`** / never bypass a hook (global rule — checks are sacred).
- **`state.currentStage` must equal the first unchecked ROADMAP §4 box.** `handoff:check` enforces it.
- **The v1 suite (`tests/`, non-v2) is RED by design** — it anchors v1. Use **`npm run test:v2`** for the
  v2 suite. The full `npm test` / pre-push hook will fail on v1; that's expected.
- **All mutation via `applyCommand`; all RNG via `SeededRandom`** (no `Math.random`/`Date.now`/`any` in `src/v2`).
- **`lastVerified` and `dirty` are written only by `scripts/verify.mjs`.** Treat them as read-only.

## Commands

| Command | Does |
|---|---|
| `npm run verify` | typecheck + v2 lint + v2 tests (120s/suite timeout) → **writes** `state.json`. The DoD gate. |
| `npm run verify:check` | same gates, exit code only, **no write** (used by hook + CI). |
| `npm run handoff:check` | asserts state.json is green + fresh-hash + clean-tree + matches ROADMAP §4. |
| `npm run test:v2` | the v2 suite only. |

---

## Memory contract (required DoD step 4)

The agent memory is a **local, same-machine** convenience that mirrors `state.json` for cross-session
recall. It is **not in the repo** — the portable, authoritative handover is `state.json` + ROADMAP +
this doc (a fresh clone works without the memory).

- **Path:** `/Users/vs7/.claude/projects/-Users-vs7-Dev-Games-Iron-Ashes/memory/iron-ashes-v2-redesign.md`
  and the one-line pointer in `…/memory/MEMORY.md`.
- **Frontmatter schema:**
  ```yaml
  ---
  name: iron-ashes-v2-redesign
  description: <one line — current status + "resume from docs/ROADMAP.md">
  metadata:
    node_type: memory
    type: project
    originSessionId: <uuid>
  ---
  ```
- **Body:** a short status paragraph (stage done, tests green, next action) + the gotchas. It should
  **point to** ROADMAP/state.json, not restate them.

---

## Handover-record template (append to ROADMAP §8 changelog)

```
- **YYYY-MM-DD** — **Stage <id> complete.** <one-line what was built>. Verify: <files> files,
  <passed> passed / <failed> failed, typecheck+lint pass. Commit <sha>. Next: <next action>.
```

---

## Drift / ownership (so the human docs and machine state don't diverge)

- `currentStage` (state.json) ↔ ROADMAP §4 checkboxes → reconciled by `handoff:check` (hard fail on mismatch).
- `gotchas`/`invariants`/`openRisks` live in **state.json** (short, operational, at-the-keyboard),
  ROADMAP **§6** (human design risks, may be longer), and the **memory** (one-paragraph index that
  *points to* the others). When knowledge changes, update state.json + the one prose home — never keep
  three copies of the same sentence.
- `verify.mjs` lint scope is `src/v2 tests/v2` (not the whole-repo `npm run lint`) — intentional, so the
  in-progress redesign isn't gated on v1 lint debt. Documented in the script header; don't "fix" it.
