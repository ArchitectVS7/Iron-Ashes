# Iron Throne of Ashes

**"Save the world, or take it."**

A deterministic, browser-based digital board game for 2–4 rival Warlords, built in strict TypeScript.
Every round you and your rivals face one tense choice with a single pool of cards: spend them to hold
back an autonomous, telegraphed AI villain (the **Shadowking**), or spend them to seize the throne.
There is no backend — the game ships as a pure static bundle (Vite), with all randomness routed through
a seeded RNG for fully reproducible games.

## History: v1 → v2 → v3

The engine has gone through three generations. **v1** (`src/` legacy models/systems/UI, plus an Express +
WebSocket server) was the original prototype and is no longer maintained or built. **v2** (`src/v2/`,
`src/ui-v2/`) rebuilt the engine around a single reducer (`applyCommand`) with a "Broken Court" comeback
mechanic instead of player elimination; it is balance-locked and still playable. **v3** (`src/v3/`,
`src/ui-v3/`) is the **current canonical version** — a ground-up redesign into a Shadowlord-style roster
game: a court of differentiated pieces (Warlord / Marshal / Steward, with **Herald** as an opt-in,
default-OFF advanced toggle), grown by discovery, capture-and-ransom, and real elimination (a beaten
Warlord can be deposed and spectates as a bounded Wraith).

## Architecture

- **Engine:** `src/v3/` (canonical) — reducer-based `applyCommand`, deterministic seeded RNG, no server
  or network layer of any kind. `src/v2/` is retained alongside it (balance-locked, still playable).
- **UI:** Vanilla TypeScript, no framework. `src/ui-v3/` (entry: `index-v3.html`) is the current frontend;
  `src/ui-v2/` (entry: `index.html`) serves v2.
- **Balance data:** v2 tunables/archetypes/board live in hand-editable `data/*.json`, compiled to
  committed `*.gen.ts` via `npm run gen:data`; v3 tunables live in `src/v3/tunables.ts` (a v3 `data/`
  split is recorded debt in `docs/ROADMAP-V3.md`).
- **Balance harness:** `scripts/sim-v3.mjs` — deterministic Monte-Carlo sim over 7 AI personality
  archetypes, using a seed-sweep methodology (`npm run sim:v3`).

See `docs/architecture.md` for the full component breakdown (currently describes the v1 layout; treat it
as historical pending an update) and `docs/GAME-DESIGN.md` for the design authority.

## Quick Start

```bash
npm install

npm run dev         # Vite dev server — open index-v3.html for the current game (index.html for v2)
npm run typecheck   # type check without emitting
npm run lint        # ESLint over src/ and tests/
npm test            # run the full test suite (vitest run)
npm run test:v3     # run only the v3 test suite
npm run test:v2     # run only the v2 test suite
npm run test:watch  # watch mode
npm run sim:v3      # balance simulation for v3
npm run build       # compile TypeScript
```

## Tests

~1,129 tests across ~85 files (`npx vitest run`), covering both v2 and v3 engines. The long-running
Monte-Carlo terminal-state tests in `tests/{v2,v3}/sim-archetypes.test.ts` carry explicit 30s
timeouts (they exceed vitest's 5s default under full-suite load).

## Design Commitments

1. All game randomness through `SeededRandom` — never `Math.random()`
2. Behavior/effect execution is fully deterministic from a given seed
3. Voting/Pledge resolves before any player action phase

## Status

v3 is **functionally complete end-to-end** (design → engine → sim → balance → UI → difficulty selector →
playtest checklist). The next action is the **human playtest** (see `docs/ROADMAP-V3.md` §0 and
`docs/human-playtest-checklist-v3.md`) — everything build-able is done; remaining tuning awaits a human
table.

## Further Reading

- `docs/GAME-DESIGN.md` — the design authority: pitch, spine, and full rules
- `docs/ROADMAP-V3.md` — v3 status, resume point, and locked design decisions
- `docs/DESIGN-V3-ALGORITHM.md` — the implementation spec for v3 mechanics
- `CLAUDE.md` — development guide (currently v2-focused; v3 conventions follow the same commitments)
