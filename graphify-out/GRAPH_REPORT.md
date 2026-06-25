# Graph Report - .  (2026-06-24)

## Corpus Check
- 1 files · ~130,630 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 841 nodes · 2101 edges · 45 communities (38 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `GameState` - 48 edges
2. `createGame()` - 46 edges
3. `getTunables()` - 46 edges
4. `applyCommand()` - 41 edges
5. `SeededRandom` - 32 edges
6. `GameSession` - 25 edges
7. `GameEvent` - 24 edges
8. `archetypeAction()` - 23 edges
9. `Iron Throne of Ashes — Development Guide` - 21 edges
10. `runSweep()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/mechanics-3f.test.ts → src/v2/reducer.ts
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/sim-bloodpact.test.ts → src/v2/reducer.ts
- `evalRun()` --calls--> `summarize()`  [EXTRACTED]
  scripts/tune-confirm-placeholders.mjs → src/v2/sim/report.ts
- `applySequence()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/determinism.test.ts → src/v2/reducer.ts
- `apply()` --calls--> `applyCommand()`  [EXTRACTED]
  tests/v2/hardening-4g.test.ts → src/v2/reducer.ts

## Import Cycles
- None detected.

## Communities (45 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (109): ActionResult, areAdjacent(), checkBrokenRecovery(), executeBreakOath(), executeClaim(), executeHeraldMarch(), executeMarch(), executeParley() (+101 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (63): Archetype, ARCHETYPE_IDS, ARCHETYPES, policyOf(), GameRunResult, playHeadlessGame(), runAIAccusations(), runHeadlessGame() (+55 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (38): esc(), LAYOUT, NODE_R, PLAYER_COLORS, Point, Polar, pos(), renderBoard() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (50): bfsDistance(), BoardValidationResult, buildClosingRing(), NODE_IDS, nodeDef(), validateClosingRing(), ActionType, AccusationOpenedEvent (+42 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (48): Anti-Free-Rider Reward (pledge shield + favor), applyCommand reducer (single mutation path), Blood Pact Accusation System — suspicion log + unanimous unanimous accusation gamble, Blood Pact (hidden-traitor mode), Broken Court v2 (comeback engine with teeth), Closing Ring Map (17-node, steered front), The Crown (leading is dangerous), Crown's Gambit (sudden-win) (+40 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (27): ArchetypeId, GameRunConfig, Matchup, computeMetrics(), GameMetrics, meanPledges(), ArchetypeWinRate, BloodPactSummary (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (32): author, description, devDependencies, eslint, @eslint/js, jsdom, @types/node, typescript (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (27): Agent Handover Protocol, Alliance Engine v2, Balance Parameters, Behavior Card Determinism Commitment, Behavior Deck, Broken Court — Design Commitment, Dark Lord Win Rate Target (18–22%), docs/AGENT-PROTOCOL.md (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (25): areSworn(), hasRivalAtNode(), hasSKForcesAtNode(), parleyTarget(), archetypeAction(), baselineAction(), bestStepToward(), bestStepTowardBrokenAlly() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): description, type, additionalProperties, description, properties, required, type, commit (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (14): args, base, evalRun(), findings, inertLevers, LEVERS, matchups, measured() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (15): type, type, type, failed, files, passed, status, tests (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (9): CHECK_ONLY, lint, ROOT, SOURCE_DIRS, STATE_PATH, testGate, tests, tmpJson (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (11): args, CANDIDATES, matchups, modes, playerCounts, results, rng, seeds (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): description, type, description, type, description, type, properties, currentStageTitle (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (13): description, items, type, description, items, type, type, description (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): args, bloodpact, meta, outDir, positional, quick, rng, ROOT (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (11): args, BARS, BONUSES, COVERS, matchups, modes, passes, playerCounts (+3 more)

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
Cohesion: 0.50
Nodes (6): allRoundRobins(), homogeneous(), MIXED_CANONICAL, oneVsField(), roundRobin(), standardMatchups()

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

## Knowledge Gaps
- **265 isolated node(s):** `$schema`, `$id`, `title`, `description`, `type` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SeededRandom` connect `Community 15` to `Community 0`, `Community 1`, `Community 5`, `Community 8`, `Community 11`, `Community 14`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `getTunables()` connect `Community 0` to `Community 8`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `runSweep()` connect `Community 11` to `Community 1`, `Community 5`, `Community 14`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `$id`, `title` to the rest of the system?**
  _267 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.061068702290076333 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05788149164950812 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05803571428571429 - nodes in this community are weakly interconnected._