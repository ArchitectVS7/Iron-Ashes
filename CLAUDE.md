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

## Balance Parameters (from PRD)

- Behavior Deck: 6 SPAWN, 6 MOVE, 4 CLAIM, 3 ASSAULT, 1 ESCALATE (post-fix)
- Target Dark Lord win rate: 18–22%
- Doom Toll max: 13, Final Phase threshold: 10
- Actions per turn: 2 normal, 1 broken
