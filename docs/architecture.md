# Iron Throne of Ashes — Architecture

> **Status:** Pre-Production
> **Version:** 0.1.0
> **Last Updated:** 2026-03-06
> **Author:** VS7
> **PRD:** [docs/prd.md](./prd.md)

---

## System Overview

Iron Throne of Ashes is a browser-based digital board game built on the Alliance Engine — a bespoke TypeScript game engine designed for 2–4 player dynastic rivalry. The game is a turn-based political/combat experience with a shared Doom Toll loss condition enforced by an autonomous AI antagonist (the Shadowking).

The defining architectural decision is the GLL (Genre Language Library) system: every in-world noun the engine references is a GLL token key rather than a hardcoded string. A content pack provides the concrete names, descriptions, and flavor text for each token. This makes the engine fully reskinnable — "Iron Throne of Ashes" is one content pack; "Sea of Knives" is another, sharing the exact same engine and systems.

There is no backend server, no persistent accounts, and no real-time networking in the current scope. State is managed in-process in the browser. The build target is a static web bundle deployable as a PC game wrapper (Electron/Steam) or mobile web app.

### Top-Level Diagram

```
Browser
└── index.html → src/index.ts (entry point)
    │
    ├── GLL System (src/gll/)
    │   ├── GLLRegistry        loads & validates a content pack at startup
    │   ├── content/iron-throne/   Iron Throne of Ashes content pack
    │   └── content/sea-of-knives/ (future reskin)
    │
    ├── Alliance Engine (src/engine/)
    │   ├── game-loop.ts       round lifecycle: shadowking→voting→action→cleanup
    │   ├── simulation.ts      batch simulation for AI lookahead & testing
    │   └── index.ts           barrel export
    │
    ├── Models (src/models/)
    │   ├── game-state.ts      GameState, constants, enums
    │   ├── board.ts           board topology, nodes, forge locations
    │   ├── player.ts          player factory
    │   └── characters.ts      character roster & fellowship creation
    │
    ├── Systems (src/systems/)
    │   ├── voting.ts          Voting Phase — vote submission & resolution
    │   ├── doom-toll.ts       Doom Toll triggers & Final Phase detection
    │   ├── combat.ts          combat resolution, fate card draws
    │   ├── game-modes.ts      Competitive / Cooperative / Blood Pact rules
    │   ├── ai-player.ts       Shadowking AI + human-slot AI fill
    │   ├── broken-court.ts    Broken Court state management
    │   ├── resources.ts       Banner generation, Fate card replenishment
    │   ├── characters.ts      character movement, Wanderer pool
    │   ├── victory.ts         win condition evaluation
    │   ├── voting.ts          Voting Phase resolution
    │   └── [others]           herald-diplomacy, multiplayer, tutorial, etc.
    │
    └── UI (src/ui/)
        ├── game-controller.ts top-level UI orchestrator
        ├── board-renderer.ts  board visual state
        ├── voting-panel.ts    Voting Phase UI
        ├── doom-toll-display.ts
        ├── shadowking-display.ts
        ├── broken-court-ui.ts
        └── [others]           character panel, combat overlay, mode select, etc.

Build:   tsc → dist/
Tests:   vitest run (src/ + tests/)
```

---

## Component Architecture

### 1. GLL System (src/gll/)
- **Responsibility:** Content abstraction layer. All in-world nouns are GLL token keys; a loaded content pack resolves them to concrete names, descriptions, and plural forms.
- **Technology:** TypeScript (strict)
- **Inputs:** A `GLLContentPack` object at startup
- **Outputs:** String lookups via `GLLRegistry.name(key)`, `.plural(key)`, `.describe(key)`
- **Notes:** `GLLRegistry.load(pack)` validates that all `REQUIRED_GLL_KEYS` are present; throws `GLLValidationError` with the list of missing keys if not. The engine never references "Shadowking", "Banner", or "Iron Throne" — only token keys like `"force_antagonist"`, `"res_primary"`, `"loc_board"`. Content packs live in `content/` directories alongside a `GLL-TOKEN-DICTIONARY.md` for human reference.

### 2. Alliance Engine (src/engine/)
- **Responsibility:** Round lifecycle management and simulation.
- **Technology:** TypeScript (strict)
- **Inputs:** `GameState`, `SeededRandom` (seeded RNG — no `Math.random()` anywhere)
- **Outputs:** Mutated `GameState`; `SimulationResult` for batch runs
- **Key files:**
  - `game-loop.ts` — `createGameState()`, `advancePhase()`, `startRound()`, `startCleanup()`. Round phases in order: Shadowking Phase → Voting Phase → Action Phase → Cleanup.
  - `simulation.ts` — `runSimulation()`, `runBatchSimulation()`, `simulateRound()` — used by AI lookahead and test harness.
- **Notes:** All randomness routes through `SeededRandom` (in `src/utils/seeded-random.ts`). Seeded RNG enables deterministic replay and reproducible tests.

### 3. Models (src/models/)
- **Responsibility:** Data model definitions and pure factory functions. No game logic — only state shape and constructors.
- **Technology:** TypeScript (strict)
- **Key files:**
  - `game-state.ts` — `GameState` interface, all game constants (`DOOM_TOLL_MAX`, `DOOM_TOLL_FINAL_PHASE_THRESHOLD`, `ACTIONS_PER_TURN_NORMAL/BROKEN`, etc.), phase enums, behavior card types.
  - `board.ts` — board topology (node graph), `KNOWN_LANDS`, forge node locations, `createInitialBoardState()`.
  - `player.ts` — `createPlayer()` factory.
  - `characters.ts` — character definitions, `createStartingFellowship()`.

### 4. Systems (src/systems/)
- **Responsibility:** All game rule implementations. Each file owns one functional area; systems call each other but do not reach into the UI layer.
- **Technology:** TypeScript (strict)
- **Key systems:**
  - **doom-toll.ts** — Doom Toll advance/recede triggers (non-unanimous vote, fate deck reshuffle, forge capture). Final Phase detection and escalating effects.
  - **voting.ts** — Vote submission (`submitVote()`), resolution (`resolveVoting()`), Behavior Card effect mapping. Broken Court players retain full voting rights (enforced by `canVote()` always returning a valid state regardless of `isBroken`).
  - **combat.ts** — Low-level `advanceDoomToll()` / `recedeDoomToll()`, fate card draws (triggers reshuffle Doom advance on deck exhaustion).
  - **game-modes.ts** — Three mode implementations sharing the same board and Behavior Card system: Competitive (standard territory victory), Cooperative (shared win/loss), Blood Pact/Traitor (one secret player wants doom). Blood Pact assignment is random; AI players never receive it.
  - **ai-player.ts** — Shadowking autonomous AI (draws Behavior Cards, executes effects) + fill AI for human player slots.
  - **broken-court.ts** — Broken Court state (replaces player elimination). Broken players use `ACTIONS_PER_TURN_BROKEN` instead of `ACTIONS_PER_TURN_NORMAL`.
  - **victory.ts** — Win condition evaluation per mode.
  - **resources.ts** — Banner generation, Fate card replenishment.
  - **tutorial-state.ts / tutorial-script.ts** — Scripted tutorial walkthrough state machine.

### 5. UI (src/ui/)
- **Responsibility:** Browser rendering and user interaction. Vanilla TypeScript DOM manipulation — no frontend framework.
- **Technology:** TypeScript (strict), CSS modules per component
- **Key files:**
  - `game-controller.ts` — top-level orchestrator; owns the main game loop tick and wires UI events to system calls.
  - `board-renderer.ts` — renders the board node graph and troop/structure positions.
  - `voting-panel.ts` — Voting Phase UI (submit COUNTER/YIELD, display vote costs, show resolved Behavior Card effect).
  - `doom-toll-display.ts`, `shadowking-display.ts`, `broken-court-ui.ts` — dedicated displays for key game-state elements.
  - `mode-select.ts` — game mode selection screen.
  - `tutorial.ts` — tutorial overlay driven by `tutorial-state.ts`.
- **Notes:** Each UI component has a paired `.css` file. Atmosphere effects in `atmosphere.ts` / `atmosphere.css`.

### 6. Utils (src/utils/)
- **Responsibility:** Shared pure utilities.
- **Technology:** TypeScript (strict)
- **Key files:**
  - `seeded-random.ts` — `SeededRandom` class. All randomness in engine and systems routes through this. Never `Math.random()`.
  - `pathfinding.ts` — board graph pathfinding for Shadowking movement and AI decisions.

---

## Data Architecture

### Entity Model

```
GameState
├── mode: GameMode           ('competitive' | 'cooperative' | 'blood_pact')
├── phase: GamePhase         (shadowking | voting | action | cleanup)
├── round: number
├── players: Player[]        (2–4; missing human slots filled by AI)
│   ├── index, type ('human'|'ai'), isBroken (Broken Court state)
│   ├── hasBloodPact: boolean  (Blood Pact mode only)
│   └── resources, territories, characters, votes
├── board: BoardState        (node graph with control/structure/troop data)
├── shadowking: AntagonistForce
│   ├── doomToll: number     (0 → DOOM_TOLL_MAX; hitting max = game over)
│   ├── lieutenants: number  (start: LIEUTENANT_START_COUNT)
│   └── behaviorDeck: BehaviorCard[]
├── behaviorDeck: BehaviorCard[]   (20 cards; shuffled at game start)
├── fateDeck: FateCard[]
└── actionLog: ActionLogEntry[]

BehaviorCard
└── type: 'spawn' | 'move' | 'claim' | 'assault' | 'escalate'

GLLContentPack
├── id: string               ('iron-throne' | 'sea-of-knives' | ...)
├── name: string
└── tokens: Record<GLLKey, GLLTokenDef>
    └── GLLTokenDef: { name, description, plural?, category }
```

### Persistence Strategy

All state is in-memory for the duration of a session. No persistence layer is implemented in pre-production. Future: save/load via `localStorage` or serialized URL hash for session resume.

### Data Flow

```
Startup:
  GLLRegistry.load(contentPack)  validates all REQUIRED_GLL_KEYS
  createGameState(mode, seed)    initializes full GameState
  createBehaviorDeck(rng)        shuffles 20-card deck

Each Round:
  Shadowking Phase: draw BehaviorCard → resolveEffect(state)
  Voting Phase:     players submitVote(COUNTER|YIELD)
                    resolveVoting() → BehaviorCardEffect
                    onNonUnanimousVote() → advanceDoomToll(+1) if applicable
  Action Phase:     players take ACTIONS_PER_TURN_NORMAL/BROKEN actions
  Cleanup Phase:    replenishFateCards(), generateBanners()
                    evaluateVictory() → check win conditions per mode
                    advancePhase() → next round

Doom Toll Triggers (advanceDoomToll):
  - Non-unanimous vote
  - Fate Deck reshuffle
  - Forge node captured by Shadowking
  At DOOM_TOLL_MAX → game over (all players lose / Blood Pact holder wins)
```

---

## Deployment Architecture

### Environments

| Environment | Notes |
|---|---|
| Local dev | `npm run dev` (Vite dev server) |
| PC (primary) | Static web bundle wrapped in Electron for Steam |
| Mobile (secondary) | PWA or Capacitor wrapper for iOS/Android |
| Test | `vitest run` — deterministic seeded simulation |

### CI/CD Pipeline

Not yet configured. Build: `tsc`. Tests: `vitest run`. Lint: `eslint src/ tests/`. Type check: `tsc --noEmit`.

### Infrastructure Notes

- Pure static bundle — no backend. Deployable to any static host or packaged as a desktop/mobile app.
- All randomness is seeded; seeds should be logged for reproducible bug reports.
- Content packs live in `content/` and are bundled at build time — no runtime asset fetching required.

---

## Performance Architecture

- **Seeded RNG everywhere:** `SeededRandom` (not `Math.random()`) ensures deterministic outcomes. AI simulation (`runBatchSimulation`) can run thousands of rounds fast for lookahead.
- **No framework overhead:** Vanilla TypeScript DOM manipulation in the UI layer avoids virtual DOM reconciliation cost.
- **Behavior Deck composition:** Default 20 cards (6 spawn, 6 move, 4 claim, 3 assault, 1 escalate). Cooperative mode uses a different composition (more assault/escalate). Deck size is small enough for O(n) operations to be negligible.
- **Turn length target:** 60–90 minute total session for 4 players. Action Phase per player is bounded by `ACTIONS_PER_TURN_NORMAL`; Voting Phase is bounded by vote deadline logic.

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale | Consequence |
|---|---|---|---|---|
| 1 | GLL token system — all in-world nouns are swappable keys | Hardcode strings; localization file | Enables zero-engine-change reskins (Sea of Knives, Verdant Collapse); enforced at load time via `REQUIRED_GLL_KEYS` validation | Every new engine noun must be added to `REQUIRED_GLL_KEYS` and all existing content packs simultaneously |
| 2 | No player elimination — Broken Court state replaces it | Standard elimination (player exits game) | Players in Broken Court still participate in Voting Phase; social/political tension is preserved; no one sits out | `isBroken` must be checked in every action-gating path; `canVote()` explicitly never gates on `isBroken` |
| 3 | All randomness via `SeededRandom` (no `Math.random()`) | Standard `Math.random()` | Deterministic replay; reproducible bug reports via seed; AI simulation can run offline without variance | Every random call must thread the RNG instance; cannot use library functions that call `Math.random()` internally |
| 4 | Three modes share board/rules/Behavior Card system; only win/loss conditions differ | Separate rule sets per mode | Reduces test surface; ensures game feel is consistent; mode selection is a pre-game choice not a structural fork | Cooperative's Behavior Deck composition differs slightly (more assault/escalate); must be parameterized in `createBehaviorDeck()` |
| 5 | Vanilla TypeScript DOM — no frontend framework | React, Vue, Svelte | No virtual DOM overhead; simpler bundle; browser game doesn't need component lifecycle management | UI code is imperative; more verbose than JSX; harder to test UI components in isolation |
| 6 | Blood Pact holder is never an AI player | AI could receive Blood Pact | Blood Pact requires deception and social pressure — AI cannot bluff convincingly; PRD explicitly constrains this | `assignBloodPact()` filters to `humanPlayers` only; Blood Pact games require at least 1 human |

---

## Open Questions

| Question | Owner | Due | Status |
|---|---|---|---|
| Session persistence — localStorage save/load, or URL hash? | VS7 | — | Open |
| Steam/Electron packaging strategy for PC primary target? | VS7 | — | Open |
| How does the multiplayer system (`src/systems/multiplayer.ts`) connect — WebSocket, WebRTC, or turn-by-email? | VS7 | — | Open |
| Are "Sea of Knives" and "Verdant Collapse" content packs in scope for initial release? | VS7 | — | Open |
| Tutorial completeness — is the scripted tutorial (`tutorial-script.ts`) fully authored? | VS7 | — | Open |

---

## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-06 | VS7 | Initial draft — derived from codebase survey |
