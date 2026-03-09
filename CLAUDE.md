# Iron Throne of Ashes — Development Guide

## Architecture

- **Engine:** Alliance Engine v1.0, built in TypeScript
- **Test framework:** Vitest
- **Content system:** GLL (Genre Language Library) — all in-world nouns are swappable tokens

## Project Structure

```
src/
  engine/     # Core game loop, phase resolution
  gll/        # GLL token types, registry, validation
  models/     # Data models (GameState, Player, Board, Characters)
  systems/    # Game systems (combat, voting, doom toll, shadowking)
  utils/      # Seeded RNG, pathfinding, helpers
tests/        # Mirrors src/ structure
content/      # GLL content packs (iron-throne/, future reskins)
```

## Design Commitments (Non-Negotiable)

1. **No hardcoded nouns.** All in-world nouns must go through the GLL registry. Reference `GLLKey` tokens, never raw strings like "Shadowking" in game logic.
2. **Broken Court never prevents Voting Phase participation.** This must have automated test coverage.
3. **Behavior Card execution must be fully deterministic from a given seed.** Required for balance simulation.
4. **Voting Phase resolves before any player action phase.** Not configurable.
5. **All game randomness goes through `SeededRandom`.** Never use `Math.random()`.

## Commands

- `npm run build` — compile TypeScript
- `npm run typecheck` — type check without emitting
- `npm test` — run all tests
- `npm run test:watch` — run tests in watch mode

## Coding Standards

- Strict TypeScript (`strict: true`) — no `any` types
- Prefer `readonly` for data that shouldn't mutate after creation
- Use interfaces for data shapes, classes only when behavior is needed
- All game constants defined in `models/game-state.ts` with names matching PRD terminology
- Test files mirror source structure: `src/gll/registry.ts` → `tests/gll/registry.test.ts`

## Feature Implementation Map

The gap analyzer may fail to find implementations if it looks for files by PRD-feature names that differ from actual filenames. This table maps every PRD feature to the source file that implements it.

| PRD Feature | File(s) | Tests |
|---|---|---|
| Behavior Card System / Behavior Deck | `src/systems/behavior-deck.ts` | `tests/systems/behavior-deck.test.ts` |
| Rescue Mechanic (F-005) | `src/systems/rescue.ts` | `tests/systems/rescue.test.ts` (29 tests) |
| GLL Tokenization System | `src/gll/registry.ts`, `src/gll/types.ts` | `tests/gll/registry.test.ts` |
| Alliance Engine / Game Loop | `src/engine/game-loop.ts` | `tests/engine/game-loop.test.ts` |
| Shadowking Antagonist AI | `src/systems/shadowking.ts` (635 lines) | `tests/systems/shadowking.test.ts` |
| Broken Court State Machine | `src/systems/broken-court.ts` | `tests/systems/broken-court.test.ts` |
| Game Modes (Competitive / Co-op / Blood Pact) | `src/systems/game-modes.ts` | `tests/systems/game-modes.test.ts` |
| Combat / War Field Resolution | `src/systems/combat.ts` | `tests/systems/combat.test.ts` |
| Voting Phase | `src/systems/voting.ts` | `tests/systems/voting.test.ts` |
| Doom Toll + Blight | `src/systems/doom-toll.ts` | `tests/systems/doom-toll.test.ts` |
| Herald Diplomatic Action | `src/systems/herald-diplomacy.ts` | `tests/systems/herald-diplomacy.test.ts` |
| Territory / Stronghold Claiming | `src/systems/territory.ts` | `tests/systems/territory.test.ts` |
| Victory Conditions | `src/systems/victory.ts` | `tests/systems/victory.test.ts` |
| Resource Management (War Banners) | `src/systems/resources.ts` | `tests/systems/resources.test.ts` |
| AI Player (Apprentice / Knight / Arch-Regent) | `src/systems/ai-player.ts` | `tests/systems/ai-player.test.ts` |
| Tutorial (5-turn scripted) | `src/systems/tutorial-script.ts`, `src/systems/tutorial-state.ts` | `tests/systems/tutorial-script.test.ts` |
| Multiplayer / Reconnect (F-014) | `src/systems/multiplayer.ts` | `tests/systems/multiplayer.test.ts` |
| Elemental Courts (symmetric v1.0) | `src/models/board.ts` (courts are symmetric nodes) | `tests/models/board.test.ts` |
| Board State / Node Graph | `src/models/board.ts` | `tests/models/board.test.ts` |
| Character / Fellowship Model | `src/models/characters.ts`, `src/systems/characters.ts` | `tests/models/characters.test.ts` |
| Player Model (resources, Broken Court, Blood Pact) | `src/models/player.ts` | `tests/models/player.test.ts` |
| Game State Constants | `src/models/game-state.ts` | `tests/models/game-state.test.ts` |
| Simulation / Balance Testing | `src/engine/simulation.ts` | `tests/engine/simulation.test.ts` |
| Database Schema | `server/src/db/schema.sql` | — |
| Backend API + WebSocket Server | `server/src/index.ts` (432 lines) | — |

**Note on Elemental Courts:** The four courts (Fire, Water, Earth, Wind) are mechanically symmetric in v1.0. Asymmetric abilities are designed but deferred to v1.1 per PRD. Court identity is encoded in `src/models/board.ts` and `src/models/characters.ts`.

## Balance Parameters (from PRD)

- Behavior Deck: 6 SPAWN, 6 MOVE, 4 CLAIM, 3 ASSAULT, 1 ESCALATE (post-fix)
- Target Dark Lord win rate: 18–22%
- Doom Toll max: 13, Final Phase threshold: 10
- Actions per turn: 2 normal, 1 broken
