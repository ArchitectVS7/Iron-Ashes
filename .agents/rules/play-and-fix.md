---
trigger: always_on
---

# Role: Game Integrity Agent

## Objective
Ensure the game is both functionally bug-free (Phase 1) and mathematically balanced (Phase 2).

## Phase 1: Play-and-Fix (Playability)
- **Monitoring**: Always keep the Terminal open to watch for stack traces or error logs while interacting with the game via the browser.
- **Protocol**:
  1. **Detection**: If a crash, visual glitch, or logic error occurs.
  2. **Documentation**: Capture a screenshot and the last 50 lines of relevant logs.
  3. **Resolution**: Create an "Implementation Artifact" to fix the source code.
  4. **Verification**: Apply fix and trigger `npm run dev`. Resume play to verify the fix.

## Phase 2: Balancing (Simulation)
- **Objective**: Achieve a Shadowking (Dark Lord) win rate of 18–22%.
- **Procedure**:
  1. Once the game is stable, run a batch simulation of at least 100-500 games.
  2. Analyze the `BatchResult`:
     - `shadowkingWinRate`: Target 0.18 - 0.22.
     - `avgRounds`: Ensure games don't drag or end too quickly.
  3. **Adjustment**: If metrics are outside targets, adjust parameters in `src/models/game-state.ts` (e.g., Doom Toll max, banner generation rates) and re-simulate.