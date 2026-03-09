# Plan: Resolve All PRD-AUDIT Gaps

## Pre-Plan Findings (Exploration Results)

The audit report (2026-03-09) has some stale entries based on current code exploration:

| Gap | Audit Says | Actual State |
|-----|-----------|--------------|
| GAP-01 | Framework only; 5 missing components | ~90% done. Script, state, UI, tests all exist. Only Turn 2 advancement trigger + discovered tutorial wiring missing |
| GAP-02 | Action AI is a stub | Basic action selection exists (MOVE/CLAIM/PASS with pathfinding). Needs depth for Knight/Arch-Regent + RNG fix |
| GAP-03 | Unified standings table missing | **Already implemented**: `src/ui/standings-panel.ts` (107 lines, 12 tests, integrated in game-controller) |
| GAP-05 | 3 Math.random() calls | Actually 4 calls (lines 99, 105, 106, 116) |
| GAP-07 | leader/warrior/diplomat/producer vs PRD names | Enum naming is consistent throughout code; PRD uses thematic names (Herald, Arch-Regent) as display names |

---

## Execution Plan

### Phase 1: Trivial Fixes (P1, ~30 min)

#### Step 1.1 — GAP-06: Fix stale PRD checklist
- **File:** `docs/prd.md` (~line 967)
- **Action:** Change `- [ ] Herald Diplomatic Action (F-009) implemented and tested` → `- [x] ...`
- **Also:** Update PRD Feature Implementation Map if it marks F-009 as "Not implemented"

#### Step 1.2 — GAP-03: Update audit to reflect standings panel is complete
- **File:** `docs/PRD-AUDIT.md`
- **Action:** GAP-03 is resolved — standings-panel.ts exists (107 lines), has 12 tests, is mounted in game-controller. Update the audit to mark this complete and remove it from the "Remaining blockers" list.
- **Validation:** Run `npm test -- standings-panel` to confirm all 12 tests pass.

#### Step 1.3 — GAP-05: Replace Math.random() in atmosphere.ts
- **File:** `src/ui/atmosphere.ts`
- **Action:** Thread a `SeededRandom` instance into `AtmosphereSystem` constructor. Replace the 4 `Math.random()` calls in `explodeParticles()` (lines 99, 105, 106, 116) with `this.rng.next()` or equivalent.
- **Validation:** `npm run typecheck` passes; existing atmosphere behavior unchanged.

### Phase 2: Tutorial Completion — GAP-01 (P0, ~1 hr)

#### Step 2.1 — Wire Turn 2 (Recruitment) advancement trigger
- **File:** `src/ui/game-controller.ts`
- **Action:** Add a check after character recruitment that advances tutorial state when `currentTurnIndex === 1`. The recruitment mechanic is already in `src/systems/characters.ts`; the game-controller needs a hook similar to how Turn 1 (claim), Turn 3 (combat), Turn 4 (voting), and Turn 5 (forge_keep) are already wired.

#### Step 2.2 — Wire discovered tutorial triggers
- **Files:** `src/ui/game-controller.ts`, relevant system call sites
- **Action:** Call `tutorialState.triggerDiscoveredTutorial()` at the 5 defined trigger points:
  1. `FIRST_ARTIFICER_RECRUIT` — after first producer/artificer recruit
  2. `FIRST_RESCUE` — after rescue resolves
  3. `FIRST_DEATH_KNIGHT_COMBAT` — after combat with death knight
  4. `FIRST_FINAL_PHASE` — on Final Phase entry
  5. `FIRST_BLOOD_PACT_ACCUSATION` — on first Blood Pact accusation
- **Validation:** Add test(s) confirming Turn 2 advances properly. Run full tutorial test suite.

### Phase 3: AI Action Logic Enhancement — GAP-02 (P0, ~2 hr)

#### Step 3.1 — Fix RNG fallback to Math.random()
- **File:** `src/systems/ai-player.ts` (lines 24-28)
- **Action:** Remove the `Math.random()` fallback in `nextFloat()`. Use the public `SeededRandom` API properly. This also resolves a GAP-05-adjacent violation.

#### Step 3.2 — Enhance Knight-Commander action selection
- **File:** `src/systems/ai-player.ts`
- **Action:** Add forge-keep priority logic: when unclaimed forge nodes exist, Knight-Commander AI should path toward them before generic strongholds. Add opportunistic combat: initiate combat when enemy is adjacent and AI has power advantage.

#### Step 3.3 — Enhance Arch-Regent action selection
- **File:** `src/systems/ai-player.ts`
- **Action:** Add rescue timing awareness (move toward Broken Court allies when rescue conditions are favorable). Add basic threat modelling (avoid moving into nodes with stronger enemies). Add Doom Toll pressure awareness (rush claims when doom is high).

#### Step 3.4 — Add comprehensive AI action tests
- **File:** `tests/systems/ai-player.test.ts`
- **Action:** Add tests for:
  - Knight-Commander forge-keep prioritization
  - Arch-Regent rescue timing decisions
  - Determinism from seed (same seed → same actions)
  - Action behavior under Broken Court (1 action limit)
  - Final Phase behavior changes

### Phase 4: Balance Simulation Verification — GAP-04 (P0, ~30 min)

#### Step 4.1 — Run simulation and record results
- **Action:** Execute simulation for 10,000+ games across player counts (3, 4, 5) and all 3 game modes.
- **Depends on:** GAP-02 fix (AI actions affect win rates). Run after Phase 3.

#### Step 4.2 — Add assertion test
- **File:** `tests/engine/simulation.test.ts`
- **Action:** Add a test that runs a batch simulation and asserts Dark Lord win rate is in [0.18, 0.22] range.

#### Step 4.3 — Record output artifact
- **File:** `docs/balance-report.md`
- **Action:** Commit simulation output showing win rates per player count and mode.

### Phase 5: GAP-07 — Character Naming (P1, ~30 min)

#### Step 5.1 — Add mapping comment as stop-gap
- **File:** `src/models/characters.ts`
- **Action:** Add a clear mapping comment at the `CharacterRole` type:
  ```
  // PRD display names → code identifiers:
  // Arch-Regent → leader, Knight → warrior, Herald → diplomat, Artificer → producer
  // Display names are resolved through the GLL registry, not these identifiers.
  ```
- **Rationale:** A full rename (leader→ARCH_REGENT etc.) is high-churn for medium benefit since GLL handles display. The comment eliminates the mental-translation cost noted in the audit.

### Phase 6: Update Audit Document

#### Step 6.1 — Update PRD-AUDIT.md
- **File:** `docs/PRD-AUDIT.md`
- **Action:** Mark all resolved gaps, update the summary table, update the launch readiness checklist.

### Phase 7: Validate & Push

#### Step 7.1 — Run full test suite
- `npm test` — all 816+ tests must pass
- `npm run typecheck` — no type errors

#### Step 7.2 — Commit and push
- Commit all changes with clear message
- Push to `claude/plan-prd-audit-strategy-OPeAS`

---

## Deferred (P2 — Not In Scope)

| Gap | Reason |
|-----|--------|
| GAP-08 (Multiplayer backend) | PRD marks as post-launch. Mock contracts are clean for future swap. |
| GAP-09 (Board + Doom Toll UI rendering) | PRD marks as post-launch. Engine models complete. |

---

## Dependency Graph

```
Phase 1 (trivial fixes) ──────────────────────────┐
Phase 2 (tutorial completion) ─────────────────────┤
Phase 3 (AI action logic) ─── Phase 4 (sim run) ──┤
Phase 5 (naming comment) ─────────────────────────┤
                                                   ├── Phase 6 (audit update) ── Phase 7 (validate + push)
```

Phases 1, 2, 3, and 5 are independent and can proceed in parallel. Phase 4 depends on Phase 3 (AI improvements affect win rates). Phase 6 depends on all prior phases. Phase 7 is final.
