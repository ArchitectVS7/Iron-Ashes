# Graph Report - Iron-Ashes  (2026-06-26)

## Corpus Check
- 128 files · ~136,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 971 nodes · 2228 edges · 61 communities (54 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b090dfe2`
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

## God Nodes (most connected - your core abstractions)
1. `getTunables()` - 57 edges
2. `GameState` - 48 edges
3. `createGame()` - 46 edges
4. `applyCommand()` - 41 edges
5. `SeededRandom` - 33 edges
6. `GameSession` - 25 edges
7. `GameEvent` - 24 edges
8. `archetypeAction()` - 23 edges
9. `runSweep()` - 21 edges
10. `summarize()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/mechanics-3f.test.ts → src/v2/reducer.ts
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/sim-bloodpact.test.ts → src/v2/reducer.ts
- `bloodPactGame()` --calls--> `createGame()`  [EXTRACTED]
  tests/v2/blood-pact.test.ts → src/v2/setup.ts
- `recruited()` --calls--> `createGame()`  [EXTRACTED]
  tests/v2/herald-piece.test.ts → src/v2/setup.ts
- `garrisonedGame()` --calls--> `createGame()`  [EXTRACTED]
  tests/v2/mechanics-3f.test.ts → src/v2/setup.ts

## Import Cycles
- None detected.

## Communities (61 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (21): advanceBlightOnNode(), advanceBlightOnSpoke(), applyDawnBlightAdvance(), ashNode(), checkActAdvance(), countAshedNodes(), getBlightFrontier(), getSpokeFrontier() (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (67): Archetype, ARCHETYPE_IDS, ARCHETYPES, policyOf(), GameRunConfig, runAIAccusations(), runHeadlessGame(), SeatPolicies (+59 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): esc(), LAYOUT, NODE_R, PLAYER_COLORS, Point, Polar, pos(), renderBoard() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (28): ActionType, AccusationOpenedEvent, AccusationResolvedEvent, AccusationVoteCastEvent, ActEscalatedEvent, ActivePlayerChangedEvent, AuditResultEvent, BlightAdvancedEvent (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (59): Anti-Free-Rider Reward (pledge shield + favor), applyCommand reducer (single mutation path), Blood Pact Accusation System — suspicion log + unanimous unanimous accusation gamble, Blood Pact (hidden-traitor mode), Broken Court v2 (comeback engine with teeth), Closing Ring Map (17-node, steered front), The Crown (leading is dangerous), Crown's Gambit (sudden-win) (+51 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (24): ArchetypeId, Matchup, GameMetrics, ArchetypeWinRate, BloodPactSummary, inBand(), mean(), mkCheck() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (35): author, description, devDependencies, eslint, @eslint/js, jsdom, @types/node, typescript (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (26): isPlayerAtNode(), bfsDistance(), BoardValidationResult, buildClosingRing(), createInitialBoardState(), NODE_IDS, nodeDef(), validateClosingRing() (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (43): areAdjacent(), areSworn(), checkBrokenRecovery(), executeBreakOath(), executeClaim(), executeHeraldMarch(), executeMarch(), executeParley() (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): description, type, additionalProperties, description, properties, required, type, commit (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (13): args, base, evalRun(), findings, inertLevers, LEVERS, matchups, measured() (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (15): type, type, type, failed, files, passed, status, tests (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (9): CHECK_ONLY, lint, ROOT, SOURCE_DIRS, STATE_PATH, testGate, tests, tmpJson (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

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
Cohesion: 0.10
Nodes (18): args, BARS, BONUSES, COVERS, matchups, modes, passes, playerCounts (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (10): args, ARMS, matchups, modes, open, playerCounts, rng, rows (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (6): failures, ROADMAP_PATH, roadmapStage, ROOT, SOURCE_DIRS, STATE_PATH

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (9): args, CANDIDATES, HB, matchups, modes, playerCounts, results, rng (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (9): args, CANDIDATES, matchups, modes, playerCounts, R, results, rng (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (8): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): additionalProperties, description, $id, required, $schema, title, type

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (19): args, bloodpact, meta, outDir, positional, quick, reportOnly, rng (+11 more)

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

### Community 45 - "Community 45"
Cohesion: 0.21
Nodes (17): AuditResult, chooseAccusation(), chooseAccusationVote(), chooseAuditTarget(), isAccusationComplete(), mostSuspect(), requiredVoters(), submitAccusationVote() (+9 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (11): 1. The problem (one line), 2.1 The Hunt verb (AI can reach + fight the dark) — `ai-player.ts`, `archetypes.ts`, 2.2 Pay the kill in win-currency + asymmetric grudge — `combat.ts`, 2.3 DKs hold ground — `actions.ts`, 2.4 The dark scales with the table — `tunables.ts`, `shadowking-effects.ts` (PROBED, then REVERTED), 2.5 New tunables (wired into the injectable seam), 2. The fix — five coupled changes, 3. Determinism & invariants (unchanged) (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (11): 1. The problem (two coupled gates), 2.1 The dark is a break-vector — `sequencer.ts` (`LANDED_STRIKE_WOUNDS`), 2.2 Rescue pays the rescuer in win-currency — `actions.ts` (`RESCUE_TRIBUTE_BANNERS`), 2.3 The AI can REACH a broken ally — `ai-player.ts`, `archetypes.ts`, 2.4 Seam-wire the break/rescue levers — `tunables.ts`, 2.5 New/wired tunables (LOCKED values after the 5d search), 2. The fix — four coupled changes (the win-currency template + a break-vector), 3. Targets & guardrails (Stage 5d) — and the RESULT (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.23
Nodes (15): recordSuspicionLog(), checkGambitSeize(), computeTerritoryWinner(), evaluateGambitAtDawn(), getEffectivePledgeWeight(), handleAdvancePhase(), advanceToNextPhase(), beginActionPhase() (+7 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (10): AccusationVoteCommand, AdvancePhaseCommand, InitiateAccusationCommand, LastStandCommitCommand, PlayerAction, PlayerActionCommand, SubmitPledgeCommand, apply() (+2 more)

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
Cohesion: 0.12
Nodes (16): aiPolicySchema, archetypeSchema, archetypesSchema, boardNodeSchema, boardSchema, bool, checkOnly, frac (+8 more)

### Community 58 - "Community 58"
Cohesion: 0.36
Nodes (9): runThreatPhase(), chooseEffect(), chooseShadowkingIntent(), chooseTarget(), chooseTargetNode(), decayGrudge(), generateVoiceLine(), getSpokePathSimple() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.31
Nodes (10): GameRunResult, ActionResult, BlightResult, BloodPactResult, CombatResult, LastStandResult, GameEvent, CommandResult (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (4): ARCHETYPE_DATA, BOARD_DATA, DATA_DIR, TUNABLES_DATA

## Knowledge Gaps
- **377 isolated node(s):** `0. Where we are right now`, `1. The game in one paragraph (orient a cold session)`, `2. Locked decisions (the spine — do not relitigate without explicit sign-off)`, `3. Document map (read order)`, `Phase 7 — Post-audit hardening (from the 2026-06-25 codebase assessment)` (+372 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SeededRandom` connect `Community 15` to `Community 1`, `Community 8`, `Community 11`, `Community 45`, `Community 14`, `Community 48`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `getTunables()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 45`, `Community 48`, `Community 58`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `runSweep()` connect `Community 19` to `Community 5`, `Community 11`, `Community 14`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `0. Where we are right now`, `1. The game in one paragraph (orient a cold session)`, `2. Locked decisions (the spine — do not relitigate without explicit sign-off)` to the rest of the system?**
  _377 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.060781786941580755 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05803571428571429 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._