# Iron Throne of Ashes

A cooperative/competitive fantasy board game engine built in TypeScript. 2–6 players vie for control of Elemental Courts while contending with an AI-driven antagonist (the Shadowking) and the ever-advancing Doom Toll.

## Tech Stack

| Layer | Technology |
|---|---|
| Engine | TypeScript (strict), Alliance Engine v1.0 |
| Tests | Vitest (966 tests across 32 files) |
| Content | GLL (Genre Language Library) — swappable in-world nouns |
| Frontend | Vanilla TS UI + WebSocket client |
| Backend | Node.js + Express WebSocket server |

## Quick Start

```bash
npm install

npm run build       # compile TypeScript
npm run typecheck   # type check without emitting
npm test            # run all 966 tests
npm run test:watch  # watch mode

# Backend server
cd server && npm install && npm start
```

## Project Structure

```
src/
  engine/     # Core game loop, phase resolution, simulation
  gll/        # Genre Language Library — token types, registry, validation
  models/     # Data models (GameState, Player, Board, Characters)
  systems/    # Game systems (combat, voting, doom-toll, shadowking, rescue, etc.)
  utils/      # Seeded RNG, pathfinding, helpers
  ui/         # Game controller and UI panels
tests/        # Mirrors src/ structure (32 test files)
content/      # GLL content packs (iron-throne/)
server/       # Express.js + WebSocket backend, PostgreSQL schema
```

## Core Systems

| System | Description |
|---|---|
| Shadowking AI | Antagonist driven by Behavior Deck (SPAWN / MOVE / CLAIM / ASSAULT / ESCALATE) |
| Voting Phase | Resolves before any player action; Broken Court players still participate |
| Doom Toll | 13-step doom track; Final Phase triggers at 10; Blight auto-spreads |
| Combat | War Field resolution with War Banner resource economy |
| Fellowship | Character abilities, elemental affinities, rescue mechanics |
| Blood Pact | Hidden betrayal mode available alongside co-op and competitive |
| Herald Diplomacy | Diplomatic actions that affect the Dark Fortress |
| GLL Tokenization | All in-world nouns are swappable tokens — zero hardcoded strings |

## Design Commitments

1. No hardcoded nouns — all in-world text goes through `GLLKey` tokens
2. Broken Court never prevents Voting Phase participation (enforced by tests)
3. All game randomness through `SeededRandom` — never `Math.random()`
4. Behavior Card execution is fully deterministic from a given seed
5. Voting Phase resolves before any player action phase

## Balance Parameters

- Behavior Deck: 6 SPAWN, 6 MOVE, 4 CLAIM, 3 ASSAULT, 1 ESCALATE
- Target Dark Lord win rate: 18–22%
- Doom Toll max: 13, Final Phase threshold: 10
- Actions per turn: 2 normal, 1 broken

## CI

GitHub Actions runs on push/PR to `main`: typecheck → build → test (966 tests).

See `CLAUDE.md` for the full feature implementation map and development guide.
