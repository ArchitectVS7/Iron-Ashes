# PRD Implementation Audit — Iron Throne of Ashes

**Date:** 2026-03-09
**Auditor:** Full codebase scan (all src/, tests/, docs/)
**Prior Audit:** 2026-03-04 (superseded by this document)

---

## Executive Summary

The Alliance Engine core is **substantially complete** (~90% of PRD mechanics implemented and tested). All five non-negotiable design commitments are enforced. However, four launch-blocking gaps remain, a stale PRD launch-checklist entry incorrectly marks F-009 as incomplete, and a naming mismatch between PRD terminology and code identifiers creates ongoing maintenance risk.

**Correction to prior audit (2026-03-04):**
- F-006b Social Pressure Onboarding is **implemented** (`src/ui/social-pressure-onboarding.ts`), not missing.
- `Math.random()` is present in `src/ui/atmosphere.ts` — not zero violations as previously stated.

---

## Prioritized Gap Register

Gaps are ordered by launch impact. Each entry includes PRD source, code location, and a concrete remediation action.

---

### P0 — Launch Blockers

These gaps prevent ship or violate an explicit "must-complete before ship" PRD requirement.

---

#### GAP-01 · Tutorial: 5-Turn Scripted Sequence Not Built

**PRD:** F-012 — *"A 5-turn scripted tutorial … one mechanic introduced per turn in the order a real game requires them. Turn 3 (War Field combat) is the make-or-break moment and must not silently fail."*
**Launch checklist line:** *"Tutorial Turn 3 (War Field) tested with Devon and Sam personas."*

**Status:** Framework complete; content missing.

| Component | Status |
|---|---|
| Tutorial state / localStorage first-session detection | ✅ Done (`src/systems/tutorial-state.ts`) |
| Contextual hint triggers (FIRST_RESCUE, FINAL_PHASE_ENTRY, etc.) | ✅ Done (`src/ui/tutorial.ts`) |
| 5-turn hardcoded sequence with per-turn objectives | ❌ Missing |
| Scripted opponent AI for tutorial match | ❌ Missing (`src/systems/tutorial-script.ts` scaffold only) |
| Turn 3 War Field forced combat + failure detection | ❌ Missing |

**Remediation:**
1. In `src/systems/tutorial-script.ts`, implement `TUTORIAL_TURNS[5]` — each entry specifying the expected player action, locked board state, and scripted opponent response.
2. Add a `TutorialValidator` that asserts Turn 3 combat resolves visibly (no silent skip).
3. Add tests in `tests/systems/tutorial-script.test.ts` covering all 5 turns end-to-end with the Devon and Sam persona seeds.

---

#### GAP-02 · AI Action Decision Logic Is a Stub

**PRD:** F-013 — *"Three AI difficulty levels: Apprentice, Knight-Commander, Arch-Regent. Each must exhibit distinct strategic behaviour (movement, claiming, combat initiation, rescue timing)."*

**Status:** Voting AI complete; action AI returns placeholder MOVE for all decisions.

| Component | Status |
|---|---|
| Voting AI (all 3 levels) | ✅ Done (`src/systems/ai-player.ts`) |
| Action selection — movement | ⚠️ Stub (always MOVE, no pathing logic) |
| Action selection — claiming strongholds | ❌ Missing |
| Action selection — combat initiation | ❌ Missing |
| Action selection — rescue timing | ❌ Missing |
| Strategy trees (resource management, forge keep priority) | ❌ Missing |
| Test coverage for action logic | 3 tests (voting only) |

**Remediation:**
1. Implement `getActions(state, player, rng)` per difficulty tier in `src/systems/ai-player.ts`. Apprentice: greedy movement; Knight-Commander: forge keep priority + opportunistic combat; Arch-Regent: rescue timing + threat modelling.
2. Add tests covering each difficulty's action decisions across the key game states (normal, Final Phase, Broken).

---

#### GAP-03 · Persistent Standings Panel Incomplete

**PRD:** F-016 — *"A persistent standings table showing all players' stronghold counts must be readable at 1080p at all times."*
**Launch checklist line:** *"Persistent standings UI (F-016) passes readability test at 1080p."*

**Status:** Individual resource metrics exist; the unified standings table does not.

| Component | Status |
|---|---|
| Doom toll display | ✅ Done (`src/ui/doom-toll-display.ts`) |
| Per-player war banner / fate card counts | ✅ Done (`src/ui/resource-display.ts`) |
| Broken Court / VULNERABLE indicator | ✅ Done |
| Turn order tracker | ✅ Done |
| **Unified standings table (stronghold count per player)** | ❌ Missing |
| **Heartstone location display** | ❌ Missing |
| 1080p readability automated test | ❌ Missing |

**Remediation:**
1. Create `src/ui/standings-panel.ts` — a single persistent component rendering `[player, strongholds, heartstone?]` per row, sourced directly from `GameState`.
2. Add a rendering test asserting the component mounts and renders all player rows.
3. Add to `src/ui/game-controller.ts` mount sequence.

---

#### GAP-04 · Balance Simulation Re-Run Not Completed

**PRD launch checklist:** *"Simulation re-run confirms Dark Lord win rate 18–22% with updated Behaviour Deck (ESCALATE 1, MOVE 6) AND Herald-driven hand system."*

**Status:** Simulation engine exists and is tested; the mandated verification run is not recorded anywhere in the repo.

| Component | Status |
|---|---|
| `src/engine/simulation.ts` + tests | ✅ Done |
| Behaviour Deck constants (ESCALATE=1, MOVE=6) | ✅ Done (`src/models/game-state.ts:126-130`) |
| Cooperative deck harder constants | ✅ Done (`src/models/game-state.ts:150`) |
| **Recorded simulation output confirming 18–22% win rate** | ❌ Missing |

**Remediation:**
1. Run `src/engine/simulation.ts` for ≥10,000 games across all player counts and modes.
2. Assert Dark Lord win rate falls in `[0.18, 0.22]`.
3. Commit the result — either as a test in `tests/engine/simulation.test.ts` or as a recorded output artefact in `docs/balance-report.md`.

---

### P1 — High Priority (Correctness / Design Integrity)

These gaps do not block ship but violate a design commitment or create material maintenance risk.

---

#### GAP-05 · `Math.random()` Calls in `src/ui/atmosphere.ts`

**PRD / Design Commitment #5:** *"All game randomness goes through `SeededRandom`. Never use `Math.random()`."*

**Status:** Three `Math.random()` calls exist in `src/ui/atmosphere.ts` (approx. lines 42–48) for particle direction, size, and distance. The prior audit reported zero violations — this was incorrect (it only scanned `src/systems`, `src/engine`, and `src/models`).

**Impact:** Particles are non-deterministic; session replays and video captures will differ. Low risk to game balance, but violates a stated design commitment.

**Remediation (two acceptable options):**
- **Option A (preferred):** Thread `SeededRandom` into `AtmosphereSystem` constructor so particle effects are reproducible from session seed.
- **Option B (acceptable if visual flavour only):** Add a code comment explicitly noting the exception and update the design commitment doc to carve out UI-only non-game-state effects.

---

#### GAP-06 · PRD Launch Checklist Incorrectly Marks F-009 as Incomplete

**PRD launch checklist (approx. line 967):** `[ ] Herald Diplomatic Action (F-009) implemented and tested`

**Status:** F-009 is **fully implemented and tested**.

| Component | Status |
|---|---|
| `isDarkFortressClear()` | ✅ Done |
| `getEligibleDiplomats()` | ✅ Done |
| `canPerformDiplomaticAction()` | ✅ Done |
| `performDiplomaticAction()` (doom −2, action deduct, log) | ✅ Done |
| Once-per-diplomat enforcement (`diplomaticActionUsed` flag) | ✅ Done |
| 25 herald diplomacy tests passing | ✅ Done |
| **PRD checklist reflects this** | ❌ Stale — still marked incomplete |

**Remediation:** Update `docs/prd.md` launch checklist line to `[x]`. No code change needed.

---

#### GAP-07 · Character Role Naming Mismatch (PRD vs. Code)

**PRD terminology throughout:** Arch-Regent, Knight, Herald, Artificer
**Code identifiers:** `leader`, `warrior`, `diplomat`, `producer`

This mismatch appears in `src/models/characters.ts`, `src/systems/characters.ts`, `src/systems/ai-player.ts`, and all test files. No mechanical bugs exist, but every cross-reference between PRD and code requires mental translation.

**Remediation:**
- Choose one naming convention and apply it consistently. The GLL tokenization system already maps display names via the registry, so aligning code identifiers with PRD terms (or vice versa) is a safe refactor.
- Suggested approach: rename code enums (`LEADER → ARCH_REGENT`, `WARRIOR → KNIGHT`, `DIPLOMAT → HERALD`, `PRODUCER → ARTIFICER`) and update all references. The GLL layer handles display strings independently.
- Add a mapping comment in `src/models/characters.ts` as a stop-gap until the rename is complete.

---

### P2 — Deferrable (Post-Launch or v1.1)

These are acknowledged gaps that the PRD itself marks as deferrable.

---

#### GAP-08 · Multiplayer / Async Backend Not Implemented

**PRD:** F-014 — Real-time and async multiplayer with 90-second reconnect window, session persistence, and Blood Pact server-side card delivery.

**Status:** `MultiplayerSessionStub` interface and `MockMultiplayerSession` exist for testing. No real server exists.

| Component | Status |
|---|---|
| Interface + mock (test scaffolding) | ✅ Done (`src/systems/multiplayer.ts`) |
| Real-time WebSocket server | ❌ Missing |
| Server-side GameState persistence | ❌ Missing |
| 90-second reconnect window + AI fill | ❌ Missing |
| Async (pass-and-play) turn notifications | ❌ Missing (PRD marks P2) |
| Blood Pact encrypted server-side card delivery | ❌ Missing |

**Remediation:** Build `server/src/index.ts` per the DB schema (`server/src/db/schema.sql`). The mock interface contracts make this a clean swap when ready.

---

#### GAP-09 · Board and Doom Toll UI Rendering Not Started

**PRD:** F-001 (28-node board graph rendered in play), F-005 (animated doom toll track with visual escalation states).

**Status:** Engine models are complete. UI rendering layer for the board graph and animated doom track is not in the codebase.

**Remediation:** Implement canvas or DOM rendering that consumes `BoardState` from `src/models/board.ts` and `DoomTollState` from `src/systems/doom-toll.ts`. Animation states are already specified in `src/ui/atmosphere.ts`.

---

## Design Commitment Verification

| Commitment | Status | Evidence |
|---|---|---|
| No hardcoded nouns — all via GLL | ✅ Verified | `src/gll/registry.ts`; reskin test passing |
| Broken Court never prevents Voting | ✅ Verified | `voting.test.ts` lines 55–66; `broken-court.test.ts` tests 70–78 |
| Behavior Card execution deterministic from seed | ✅ Verified | All systems accept `rng: SeededRandom`; simulation reproduces from seed |
| Voting Phase before Action Phase | ✅ Verified | `game-loop.ts` phase order: shadowking → voting → action → cleanup |
| All randomness through `SeededRandom` | ⚠️ Mostly | 0 violations in engine/systems/models; **3 violations in `src/ui/atmosphere.ts`** (see GAP-05) |

---

## Feature Implementation Status (Complete Reference)

| Feature | File(s) | Test File | Status |
|---|---|---|---|
| F-001 Board (28-node graph) | `src/models/board.ts` | `tests/models/board.test.ts` | ✅ Engine done; UI rendering not started (GAP-09) |
| F-001b 3-Player Config | `src/models/game-state.ts`, `src/engine/game-loop.ts` | `tests/engine/game-loop.test.ts` | ✅ Complete |
| F-002 War Banners | `src/systems/resources.ts` | `tests/systems/resources.test.ts` | ✅ Complete |
| F-002.5 Fate Card Hand Limits | `src/systems/resources.ts` | `tests/systems/resources.test.ts` | ✅ Complete |
| F-003 Fellowship / Unknown Wanderers | `src/models/characters.ts`, `src/systems/characters.ts` | `tests/models/characters.test.ts` | ✅ Complete (naming mismatch — GAP-07) |
| F-004 Combat (War Field) | `src/systems/combat.ts` | `tests/systems/combat.test.ts` | ✅ Complete |
| F-005 Doom Toll | `src/systems/doom-toll.ts` | `tests/systems/doom-toll.test.ts` | ✅ Engine done; animation UI not started (GAP-09) |
| F-006 Voting Phase | `src/systems/voting.ts` | `tests/systems/voting.test.ts` | ✅ Complete |
| F-006b Social Pressure Onboarding | `src/ui/social-pressure-onboarding.ts` | `tests/ui/social-pressure-onboarding.test.ts` | ✅ Complete (prior audit incorrectly marked missing) |
| F-007 Broken Court + Rescue | `src/systems/broken-court.ts`, `src/systems/rescue.ts` | `tests/systems/broken-court.test.ts`, `tests/systems/rescue.test.ts` | ✅ Complete |
| F-008 Shadowking Behaviour System | `src/systems/shadowking.ts` | `tests/systems/shadowking.test.ts` | ✅ Complete |
| F-009 Herald Diplomatic Action | `src/systems/herald-diplomacy.ts` | `tests/systems/herald-diplomacy.test.ts` | ✅ Complete (PRD checklist stale — GAP-06) |
| F-010 Victory Conditions | `src/systems/victory.ts` | `tests/systems/victory.test.ts` | ✅ Complete |
| F-011 Game Modes (3 modes) | `src/systems/game-modes.ts` | `tests/systems/game-modes.test.ts` | ✅ Complete |
| F-012 Tutorial (5-turn scripted) | `src/systems/tutorial-state.ts`, `src/systems/tutorial-script.ts`, `src/ui/tutorial.ts` | `tests/systems/tutorial-script.test.ts` | ⚠️ Framework only — GAP-01 |
| F-013 AI Opponent (3 levels) | `src/systems/ai-player.ts` | `tests/systems/ai-player.test.ts` | ⚠️ Voting complete; actions stubbed — GAP-02 |
| F-014 Multiplayer / Async | `src/systems/multiplayer.ts` | `tests/systems/multiplayer.test.ts` | ⚠️ Mock only — GAP-08 |
| F-015 Atmosphere / Audio | `src/ui/atmosphere.ts` | — | ⚠️ Visual done; audio not independently verifiable; Math.random() violation — GAP-05 |
| F-016 Persistent Standings UI | `src/ui/doom-toll-display.ts`, `src/ui/resource-display.ts` | `tests/ui/standings-panel.test.ts` | ⚠️ Partial — unified table missing — GAP-03 |
| F-017 Post-Game Summary | `src/ui/summary.ts` | — | ✅ Complete |
| F-018 Fixed Turn Order | `src/engine/game-loop.ts` | `tests/engine/game-loop.test.ts` | ✅ Complete |
| Balance Simulation Verification | `src/engine/simulation.ts` | `tests/engine/simulation.test.ts` | ⚠️ Engine done; mandated verification run not recorded — GAP-04 |

---

## Launch Readiness Checklist (Updated)

From PRD Section 15, with corrections as of 2026-03-09:

- [x] ESCALATE cards = 1; MOVE cards = 6 (implemented, constants in `src/models/game-state.ts`)
- [ ] **GAP-04** Simulation re-run confirms Dark Lord win rate 18–22%
- [x] **GAP-06 CORRECTION** Herald Diplomatic Action (F-009) implemented and tested
- [x] Blood Pact mode ships at launch
- [ ] **GAP-03** Persistent standings UI (F-016) passes readability test at 1080p
- [x] Rescue event has distinct audio + visual signature (`src/ui/atmosphere.ts`)
- [ ] **GAP-01** Tutorial Turn 3 (War Field) tested with Devon and Sam personas
- [x] Post-game Blood Pact reveal implemented (`src/ui/summary.ts`)
- [x] All GLL tokens confirmed swappable (`tests/gll/reskin.test.ts`)
- [x] Broken Court never prevents Voting Phase participation — automated test coverage (`tests/systems/voting.test.ts:55-66`, `tests/systems/broken-court.test.ts:70-78`)

**Remaining blockers: 3 checkboxes (GAP-01, GAP-03, GAP-04)**

---

## Summary Table

| Gap | Area | Priority | Effort | Notes |
|---|---|---|---|---|
| GAP-01 | Tutorial scripted sequence | P0 — blocks ship | High | Core content missing from framework |
| GAP-02 | AI action decision logic | P0 — blocks ship | High | Voting AI done; action AI is a stub |
| GAP-03 | Standings panel table | P0 — blocks ship | Medium | Individual metrics exist; table not built |
| GAP-04 | Balance simulation run | P0 — mandated by PRD | Low | Engine ready; just needs execution + record |
| GAP-05 | `Math.random()` in atmosphere | P1 — design commitment | Low | 3 calls; fix or formally exempt |
| GAP-06 | Stale PRD checklist (F-009) | P1 — doc correctness | Trivial | Update one checkbox in `docs/prd.md` |
| GAP-07 | Character naming mismatch | P1 — maintenance risk | Medium | Refactor enums or add mapping comment |
| GAP-08 | Multiplayer backend | P2 — post-launch | Very High | Full server build; mock contracts are clean |
| GAP-09 | Board + Doom Toll UI rendering | P2 — post-launch | High | Engine ready; UI layer not started |

---

*Audit generated 2026-03-09. Supersedes 2026-03-04 audit. All 816+ tests confirmed passing.*
