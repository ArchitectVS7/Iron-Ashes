# Graph Report - Iron-Ashes  (2026-07-02)

## Corpus Check
- 229 files · ~295,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1895 nodes · 5006 edges · 105 communities (102 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `18d66867`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]

## God Nodes (most connected - your core abstractions)
1. `getTunables()` - 87 edges
2. `createGame()` - 66 edges
3. `GameState` - 66 edges
4. `getTunables()` - 58 edges
5. `GameState` - 49 edges
6. `GameSession` - 46 edges
7. `applyCommand()` - 46 edges
8. `createGame()` - 46 edges
9. `SeededRandom` - 45 edges
10. `applyCommand()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `game()` --calls--> `createGame()`  [EXTRACTED]
  tests/v3/court.test.ts → src/v3/setup.ts
- `reckoningCleanDawn()` --calls--> `createGame()`  [EXTRACTED]
  tests/v3/kill-the-dark-3g.test.ts → src/v3/setup.ts
- `playFullGame()` --calls--> `playHeadlessGame()`  [EXTRACTED]
  tests/v3/ai-player.test.ts → src/v3/sim/driver.ts
- `mountView()` --calls--> `render()`  [INFERRED]
  src/ui-v2/view.ts → scripts/gen-data.mjs
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/sim-bloodpact.test.ts → src/v2/reducer.ts

## Import Cycles
- None detected.

## Communities (105 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (49): bfsDistance(), BoardValidationResult, buildClosingRing(), BOARD_DATA, NODE_IDS, nodeDef(), validateClosingRing(), backSigil() (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (35): adjacent(), ARCH_SHORT, describeBequest(), esc(), EXPOSURE_LABEL, findOath(), oathPartner(), parleyReachable() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (61): areAdjacent(), executeBreakOath(), executeClaim(), executeHeraldMarch(), executeMarch(), executeParley(), executeRaid(), executeRecruit() (+53 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): 10. The Herald — the political build (advanced), 11. Blood Pact — the hidden-traitor mode (optional), 12. Player counts — three games in one, 13. Design pillars (non-negotiable), 14. Where the numbers live, and what's still unproven, 1. The pitch, 2. The design spine (read this and you understand the game), 3. The core loop (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (13): Death Knight Engagement (hunt verb + win-currency kill), handoff/state.json (machine-checked truth), Herald Political Build (Stage H), Oaths + the Ledger (passion spine), Rescue/Break Economy (win-currency rescue), Design v2 Dark Engagement Patch, Design v2 Focus Group Round 1, Design v2 Focus Group Round 2 (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (29): DEFAULT_AI_POLICY, traitorAtPledge(), Command, applySequence(), apply(), apply(), garrisonedGame(), placeWarlord() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (37): author, description, devDependencies, eslint, @eslint/js, jsdom, @types/node, typescript (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (62): isPlayerAtNode(), bfsDistance(), BoardValidationResult, buildClosingRing(), createInitialBoardState(), NODE_IDS, nodeDef(), validateClosingRing() (+54 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (37): areAdjacent(), areSworn(), executeBreakOath(), executeClaim(), executeHeraldMarch(), executeMarch(), executeParley(), executeRaid() (+29 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): description, type, additionalProperties, description, properties, required, type, commit (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (22): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (15): type, type, type, failed, files, passed, status, tests (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (9): CHECK_ONLY, lint, ROOT, SOURCE_DIRS, STATE_PATH, testGate, tests, tmpJson (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (11): 1.1 The four-idea spine (say these four things first), 1.2 The round: THREAT → PLEDGE → your turn, 1.3 The two currencies, 1.4 Your basic turn (the only verbs taught upfront), 1.5 Elimination — the one warning that must land, 1.6 The end conditions — the taught version (exactly three sentences), Blood Pact — never in game one, Part 1 — UPFRONT (5–6 minutes, before the first THREAT) (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (31): 0. Locked design decisions (v3 delta vs v2), 10. Blood Pact (Layer B) — v3 interaction notes, 11. Deliberately deferred / open for the code sprint, 12. Edge-case resolution table (closes the judge's audit), 13. Stress-test hardening (V3-4 P0 fold — AUTHORITATIVE), 1. Game overview, 2. Components & state, 3. Setup (+23 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): description, type, description, type, description, type, properties, currentStageTitle (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (13): description, items, type, description, items, type, type, description (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (22): 3.1 "The intro screen about voting is gibberish", 3.2 "There is no onboarding tutorial", 3.3 "The board seems to have an idea but is nonsensical", 3.4 "Clicking advances turns with no meaningful feedback", 3.5 The deeper rot: the code has drifted from its own spec, and the test suite is red, 3.6 Architectural spaghetti (the structural cause of the above), Appendix — Fastest path to "playable enough to evaluate the design", Cross-cutting principles for the rebuild (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (16): 0. Why v3 exists (the one-paragraph case), 1. What survives from v2, and what is retired, 2. The revised pitch, 3. The design spine (read this and you understand v3), 4. The roster systems (the v3 core — A, B, C), 5. Knockout — elimination, with the opening protected (G), 6. Win, loss, and catch-up, 7. The open forks (gate to V3-2 / V3-3) (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (10): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (6): failures, ROADMAP_PATH, roadmapStage, ROOT, SOURCE_DIRS, STATE_PATH

### Community 22 - "Community 22"
Cohesion: 0.31
Nodes (9): allRoundRobins(), homogeneous(), MIXED_CANONICAL, oneVsField(), roundRobin(), standardMatchups(), runTunableCandidates(), DEFAULT_TUNABLES (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (9): args, CANDIDATES, matchups, modes, playerCounts, R, results, rng (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (23): traitorAtPledge(), createInitialBoardState(), DIFFICULTY_TUNABLES, difficultyTunables(), sessionTunables(), ACTS, TIERS, withDifficulty() (+15 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (13): args, bloodpact, herald, meta, outDir, positional, quick, rng (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (3): GameSession, Command, withSessionTunables()

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (12): args, bloodpact, meta, outDir, positional, quick, reportOnly, rng (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (14): Standing recorded debts (pre-review, still open), T1-1 ☑ Persist + surface retainer names (review drift D5) — **HIGHEST**, T1-2 ☑ Resolve the Rally + the Whisper last-stronghold reading (drifts D1 + D3), T1-3 ☑ Round-1 Crown landmine (learnability #4), T1-4 ☑ Human Last Stand control (the auto-play stub), T1-5 ☑ Doc honesty + the teach script (learnability #2/#3, drift D2), T2-1 ☑ Feed the court (engagement #1 — the pitch-matching change), T2-2 ☐ Re-arm "hiding is dangerous" (engagement #2, drift D2's design half) (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): additionalProperties, description, $id, required, $schema, title, type

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (65): runAIAccusations(), runHeadlessGame(), areSworn(), hasRivalAtNode(), hasSKForcesAtNode(), archetypeAction(), baselineAction(), bestLooseCaptureAt() (+57 more)

### Community 32 - "Community 32"
Cohesion: 0.60
Nodes (5): Dark Fantasy Visual Aesthetic, Dark Lord Antagonist Figure, Gothic Castle Stronghold, Shadowking Character Art, Twisted Sorcerer's Staff

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (4): description, pattern, type, currentStage

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (4): specRefs, description, items, type

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): enum, type, lint

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (9): Active Brain Dump, Architecture, Context Snapshot, Iron-Ashes, Iron Throne of Ashes — Development Guide, Iron Throne of Ashes - Instruction Manual, Next Steps, Object of the Game (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (22): 1. GLL System (src/gll/), 2. Alliance Engine (src/engine/), 3. Models (src/models/), 4. Systems (src/systems/), 5. UI (src/ui/), 6. Utils (src/utils/), CI/CD Pipeline, Component Architecture (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): Assessment, Balance Simulation Report, Configuration, Results, Test Coverage

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (34): 0. Locked design decisions, 10. Layer B — Hidden-traitor (Blood Pact) [mode flag], 11. Deliberately deferred / open for Stage 3, 12. Stage-5 delta — changelog & sources, 1. Game overview, 2. Components & state, 3. Setup algorithm, 4.1 THREAT (telegraph) (+26 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (8): Balance Parameters, CI, Core Systems, Design Commitments, Iron Throne of Ashes, Project Structure, Quick Start, Tech Stack

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (20): getBlightFrontier(), AuditResult, BloodPactResult, chooseAccusation(), chooseAccusationVote(), chooseAuditTarget(), initiateAccusation(), isAccusationComplete() (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (11): 1. The problem (one line), 2.1 The Hunt verb (AI can reach + fight the dark) — `ai-player.ts`, `archetypes.ts`, 2.2 Pay the kill in win-currency + asymmetric grudge — `combat.ts`, 2.3 DKs hold ground — `actions.ts`, 2.4 The dark scales with the table — `tunables.ts`, `shadowking-effects.ts` (PROBED, then REVERTED), 2.5 New tunables (wired into the injectable seam), 2. The fix — five coupled changes, 3. Determinism & invariants (unchanged) (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (11): 1. The problem (two coupled gates), 2.1 The dark is a break-vector — `sequencer.ts` (`LANDED_STRIKE_WOUNDS`), 2.2 Rescue pays the rescuer in win-currency — `actions.ts` (`RESCUE_TRIBUTE_BANNERS`), 2.3 The AI can REACH a broken ally — `ai-player.ts`, `archetypes.ts`, 2.4 Seam-wire the break/rescue levers — `tunables.ts`, 2.5 New/wired tunables (LOCKED values after the 5d search), 2. The fix — four coupled changes (the win-currency template + a break-vector), 3. Targets & guardrails (Stage 5d) — and the RESULT (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (38): checkBrokenRecovery(), resolveHeraldCaptures(), runOathUpkeep(), advanceBlightOnNode(), advanceBlightOnSpoke(), applyDawnBlightAdvance(), ashNode(), checkActAdvance() (+30 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): Agent Handover (read this first), Architecture, Balance Parameters (from design spec), Coding Standards, Commands, Design Commitments (Non-Negotiable), Engineering Principles — No Deferred Debt (Non-Negotiable), Iron Throne of Ashes — Development Guide (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (10): 1. The panel agreed — unprompted — on six things, 2. Where they diverged (the real forks), 3. The proposed core — "Save the world, or take it.", 4. Cut list for v1.0 (panel consensus), 5. Open decisions for the lead designer (gate to Stage 2), Design v2 — Focus Group Synthesis & Proposed Core, No-elimination, with teeth, The common-enemy system (how the threat stays tense AND fair) (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (10): Design v2 — Final Stress-Test Synthesis & Pre-Code Punch List, P0-1. The Pledge free-rider collapse — the heart of the game may be a non-decision, P0-2. The map is a pure tree → quadrant-turtle solitaire, P0-3. The Gambit is over-taxed → "1-in-never," and its integration is undefined, P0-4. The Crown handoff and steered-front re-aim are invisible — players won't know why the fire came for them, P0-5. The villain is a once-per-round announcer, not an in-round presence, P0 — Critical, convergent (flagged by 2+ panelists; must fix before code), P1 — Important (determinism pins + single-panelist structural) (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (9): 0. The one-line finding, 1. What the panel agreed on — unprompted (5/5 or 4/5), 2. The Q2 fix — a composite all five converged on, 3. The Q3 fork — the panel reframes it, 4. The other dormant pillar — rescue (this is Stage 5d), 5. Other flags raised, 6. Bottom line for the lead designer, Design v2 — Focus Group, Round 2 (Post-Implementation Review) (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (9): 1. Why (one line), 2. The Oath (minimal, soulful v1), 3. The Ledger (the villain's memory), 4. New tunables (wired into the seam), 5. AI policy (archetype knobs), 6. Determinism & invariants, 7. Targets & guardrails — and the RESULT (LOCKED), 8. Deferred (not built here) (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): 0. The one-line finding, 1. Unanimous diagnosis, 2. The convergent spine — OATHS (+ the dark's memory), 3. The cutting-room ideas — the verdicts, 4. Two orthogonal high-leverage levers (powerful — but phase them, don't pile), 5. Guards & worries (carry into any build), 6. Synthesized recommendation, Design v2 — Focus Group, Round 3 (Injecting Passion & Complexity)

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (6): Disposition recommendation, ML Training System — Claim vs. Reality Breakdown, Side-by-side: what it claims vs. what it does, TL;DR, What a sound harness looks like (when we get there), Why this matters for the redesign

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (20): coachTip(), esc(), oathPartner(), renderAccusePanel(), renderActionPanel(), renderApp(), renderAudits(), renderGambitBanner() (+12 more)

### Community 58 - "Community 58"
Cohesion: 0.38
Nodes (11): GameRunConfig, Matchup, SweepSummary, CandidateResult, TunableCandidate, SweepConfig, Tunables, GameMode (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (16): ActionResult, BlightResult, GameEvent, computePostDarkWinner(), computeRaidLeader(), displaceFromKeystone(), executeAssaultHeart(), resolveHeartCollapse() (+8 more)

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (4): ARCHETYPE_DATA, BOARD_DATA, DATA_DIR, TUNABLES_DATA

### Community 61 - "Community 61"
Cohesion: 0.08
Nodes (24): 5-dark — Dark Engagement mechanic patch (the dead-grudge fix), 5-dark retune (coordinate-descent via `scripts/tune-5dark.mjs`, LOCKED), 5a-baseline — the "before" (no tunable changed; diagnostics added), 5c — tune the dark (doomCost player-count scaling + landed-strike damage), 5d — Rescue/break economy (spec: design-history/DESIGN-V2-RESCUE-ECONOMY.md), §5e — Blood Pact accusation: a real bluff + a real gamble (Phase 5), §5f — Final lock + §9 doc (PHASE 5 COMPLETE), §A — All-broken → Shadowking victory (close-loose-ends wave) (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (13): §1 — Start & shell (do once), §2 — The core loop (Run A, every round until the game ends), §3 — Full control coverage (the 6a parity surface), §4 — Felt-experience claims (the reason this can't be a sim), §5 — Summary verdict (fill in after all three runs), ACTION phase (your turn), Ground rules for the tester (non-negotiable), How to launch (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (17): A Warlord's first game: what to actually do, Everything you can do on your turn, First, the threat, Fourth, the dawn, How to win (and how everyone loses), Iron Throne of Ashes — Player's Manual, Knowing the dark: the Shadowking up close, Second, the pledge — the heart of it all (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (9): Forge-as-Gate Tolls (Stage T), Sealed Pledge (Stage S gambit fix), Design history — provenance, not authority, What's in here, 1. Sealed-pledge "volunteer's dilemma" (Stage S + B) — PARTIALLY validated, 2. Session length — 30–45 min target (instrumented C2, not yet felt), 3. Blood Pact — the accusation gamble + the Audit (Stage 5e) — sim-inert, human-real, 4. The literal Herald lone-runner (Stage HL) — table drama (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (11): 0. Where we are right now, 1. The game in one paragraph (orient a cold session), 2. Locked decisions (the spine — do not relitigate without explicit sign-off), 3. Document map (read order), 4. The plan (stages → concrete steps → status), 5. Reuse vs. rebuild (rule: reuse only when refactor ≤ writing fresh), 6. Known risks / parked questions, 7. How to resume (fresh session checklist) (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.20
Nodes (9): Archetype knobs (extend `AIPolicy`, additive, neutral = today's behavior), Assumed decisions (recommended defaults; user did not select — override if wrong), Context, Files, Layout constraint, Phasing (each: verify 0 → state.json + ROADMAP §4 box + memory → commit → handoff:check), Stage 4 — Balance & Strategy Validation Harness (approved plan), Targets (ALGORITHM §9) (+1 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (10): 0. Where we are right now, 1. The game in one paragraph (orient a cold session), 2. Locked decisions (the v3 spine — do not relitigate without sign-off), 3. Document map (read order), 4. The plan (stages → concrete steps → status), 5. Reuse vs. rebuild (v3 builds on `src/v2/`, not v1), 6. Known risks / parked questions (carried from the stress-test P1 list), 7. How to resume (fresh session checklist) (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.20
Nodes (10): Agent Protocol — Iron Ashes v2, Commands, DEFINITION OF DONE (the gate — do every step, in order), Drift / ownership (so the human docs and machine state don't diverge), Handover-record template (append to ROADMAP §8 changelog), Hard rules, Memory contract (required DoD step 4), Resuming in a new session (paste this prompt) (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (10): 0. Headline, 1. Round-1 core pillars (the "should be" spine), 2. The three lead-designer forks (R1 §5), 3. Round-2 — the dark-engagement fixes (the "dead Grudge" patch), 4. Round-3 — the passion spine (Oaths) + identity + the two levers, 5. The restored v1 market study — the Rescue signature beat (the one surprise), 6. Findings that need triage (fix-or-record), 7. Known residuals — verified honestly recorded (no new action) (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (8): 1. The panel converged — unprompted — on five things, 2. Where they diverged (the real forks), 3. The revised decisions (folded into the concept; the spec implements these), 4. The snowball problem (the board designer's central finding), 5. The end-condition hole (the judge's load-bearing finding), 6. Cut / changed list (v3 vs the V3-1 concept), 7. Open decisions for the algorithm spec (gate to V3-3), Design v3 — Focus Group Synthesis (the roster turn)

### Community 75 - "Community 75"
Cohesion: 0.22
Nodes (8): §9 targets, Balance Sweep Report — s20260622-n40, End Act, Free-rider verdict (§4.2 step 5), Game endings, No-dominant-strategy check, Per-player-count (strictness), Tuning diagnostics (Stage 5)

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (6): Design v3 — Adversarial Stress-Test (break the spec), P0 — fatal / convergent (folded into the spec before code), P1 — serious, carried to the code sprint (not blocking the design), The headline, Under-specified interactions the spec MUST state before code (determinism breaker §2), Verdicts

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (23): applyPushback(), getBlightFrontier(), AuditResult, BloodPactResult, chooseAccusation(), chooseAccusationVote(), chooseAuditTarget(), executeAudit() (+15 more)

### Community 78 - "Community 78"
Cohesion: 0.12
Nodes (16): aiPolicySchema, archetypeSchema, archetypesSchema, boardNodeSchema, boardSchema, bool, checkOnly, frac (+8 more)

### Community 79 - "Community 79"
Cohesion: 0.12
Nodes (27): executeRansom(), addBoardPiece(), CAPTURABLE, capturePiece(), enforceGuardCap(), freeCaptiveToOwner(), freeRetainerCount(), guardCapacity() (+19 more)

### Community 81 - "Community 81"
Cohesion: 0.14
Nodes (31): Narration, hasRivalAtNode(), hasSKForcesAtNode(), parleyTarget(), archetypeAction(), baselineAction(), bestStepToward(), bestStepTowardBrokenAlly() (+23 more)

### Community 82 - "Community 82"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 83 - "Community 83"
Cohesion: 0.17
Nodes (10): args, BARS, BONUSES, COVERS, matchups, modes, passes, playerCounts (+2 more)

### Community 84 - "Community 84"
Cohesion: 0.13
Nodes (18): ArchetypeId, GameMetrics, ArchetypeWinRate, BloodPactSummary, inBand(), mean(), median(), mkCheck() (+10 more)

### Community 85 - "Community 85"
Cohesion: 0.19
Nodes (26): advanceBlightOnNode(), advanceBlightOnSpoke(), applyDawnBlightAdvance(), ashNode(), checkActAdvance(), countAshedNodes(), getSpokeFrontier(), getSpokePath() (+18 more)

### Community 86 - "Community 86"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 87 - "Community 87"
Cohesion: 0.19
Nodes (18): ActionResult, BlightResult, CombatResult, LastStandResult, GameEvent, CommandResult, runThreatPhase(), SequencerResult (+10 more)

### Community 88 - "Community 88"
Cohesion: 0.08
Nodes (31): SweepDiagnostics, ActionType, AccusationOpenedEvent, AccusationResolvedEvent, AccusationVoteCastEvent, ActEscalatedEvent, ActivePlayerChangedEvent, AuditResultEvent (+23 more)

### Community 89 - "Community 89"
Cohesion: 0.24
Nodes (10): ARCH_GLYPH, esc(), LAYOUT, NODE_R, PLAYER_COLORS, Point, Polar, pos() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.11
Nodes (39): recordSuspicionLog(), livingStrongholdCount(), productionOf(), applyDeathBequest(), applyReckoningAutoPressure(), applyReckoningBlightPressure(), applyWraithCardAdds(), applyWraithNudges() (+31 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (7): crownCalloutText(), Exposure, Narration, RaidProjection, BequestChoiceInput, PendingLastStand, WraithInputKind

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (7): boot(), DIFFICULTY_OPTIONS, startScreen(), beginAt(), click(), beginWithHerald(), click()

### Community 94 - "Community 94"
Cohesion: 0.17
Nodes (9): args, CANDIDATES, HB, matchups, modes, playerCounts, results, rng (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.09
Nodes (24): Archetype, ARCHETYPE_IDS, ARCHETYPES, policyOf(), VERB_KNOBS, VerbKnobs, GameRunResult, playHeadlessGame() (+16 more)

### Community 96 - "Community 96"
Cohesion: 0.48
Nodes (5): mountView(), click(), controls(), playThroughDom(), toHumanTurnDom()

### Community 97 - "Community 97"
Cohesion: 0.14
Nodes (13): 10. The Shadowking as a character (the voice), 11. Difficulty tiers — which should be the default? (once the selector lands), 12. The Last Stand prompt — the heroic verb under pressure (T1-4), 1. Elimination stakes + the Exposure meter — the core new tension, 2. Spectator dead-time + the Wraith — the stress-test's #1 UX risk, 3. Capture-as-scene + the "Hold" rail — the Shadowlord-soul mechanic, 4. The two-act "Kill the Dark" ending — catharsis vs. anticlimax, 5. Discovery — meeting named retainers + the fog (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.33
Nodes (5): Does the code represent the design intention?, The consolidated fix list (ranked, costed), The five questions, The headline (all three reviewers converged), v3 Second-Pass Design Review — 2026-07-01

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (10): addGrudge(), chooseEffect(), chooseShadowkingIntent(), chooseTarget(), chooseTargetNode(), decayGrudge(), generateVoiceLine(), getSpokePathSimple() (+2 more)

### Community 102 - "Community 102"
Cohesion: 0.50
Nodes (5): Monte Carlo Balance Sim (v2 harness), PPO RL Agent (v1 scrapped), v1 Engine Drift (implementation vs spec), ML System Analysis (v1 scrapped), Redesign Analysis (v1 root-cause)

### Community 103 - "Community 103"
Cohesion: 0.15
Nodes (10): args, ARMS, matchups, modes, open, playerCounts, rng, rows (+2 more)

### Community 104 - "Community 104"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 106 - "Community 106"
Cohesion: 0.27
Nodes (9): esc(), LAYOUT, NODE_R, PLAYER_COLORS, Point, Polar, pos(), renderBoard() (+1 more)

### Community 107 - "Community 107"
Cohesion: 0.31
Nodes (7): root, startScreen(), mountView(), click(), controls(), playThroughDom(), toHumanTurnDom()

## Knowledge Gaps
- **682 isolated node(s):** `0. Where we are right now`, `1. The game in one paragraph (orient a cold session)`, `2. Locked decisions (the v3 spine — do not relitigate without sign-off)`, `3. Document map (read order)`, `4. The plan (stages → concrete steps → status)` (+677 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SeededRandom` connect `Community 20` to `Community 0`, `Community 2`, `Community 5`, `Community 8`, `Community 11`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 31`, `Community 45`, `Community 48`, `Community 49`, `Community 59`, `Community 77`, `Community 81`, `Community 82`, `Community 83`, `Community 84`, `Community 86`, `Community 90`, `Community 94`, `Community 95`, `Community 103`, `Community 104`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `GameState` connect `Community 59` to `Community 0`, `Community 2`, `Community 101`, `Community 91`, `Community 77`, `Community 79`, `Community 85`, `Community 25`, `Community 90`, `Community 27`, `Community 95`, `Community 31`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `GameState` connect `Community 87` to `Community 5`, `Community 7`, `Community 8`, `Community 106`, `Community 45`, `Community 48`, `Community 81`, `Community 57`, `Community 92`, `Community 95`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `0. Where we are right now`, `1. The game in one paragraph (orient a cold session)`, `2. Locked decisions (the v3 spine — do not relitigate without sign-off)` to the rest of the system?**
  _682 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08032786885245902 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12222222222222222 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06783511846802986 - nodes in this community are weakly interconnected._