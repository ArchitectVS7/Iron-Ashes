# Iron Ashes - UGT Machine Learning Testing Plan

This directory (`/ml_training/`) is dedicated to balancing and validating Iron Ashes using the Universal Game Tester (UGT) framework. Our objective is to utilize Reinforcement Learning (RL) agents to achieve a mathematically balanced game (targeting an 18-22% win rate for the Shadowking) and ensure smooth, bug-free human playability.

---

## 1. Overall Testing Strategy

The testing loop utilizes a three-tiered approach to ensure structural integrity, mathematical balance, and human playability.

### ✅ Tier 1: Logic & Smoke Testing (Validation)
- **Goal**: Ensure the game rules fire correctly and the ML bridge can communicate with the engine without crashing.
- **Method**: The UGT `smoke-test` command runs random AI agents for brief periods.
- **Output**: Pass/Fail on engine stability.

### ✅ Tier 2: Headless RL Simulation (Balance)
- **Goal**: Tune the core game math to achieve the target Shadowking win rate (18-22%).
- **Method**:## Tier 2: Headless Game Balancing
[x] Identify the exact file where AI logic resides (`src/engine/simulation.ts` / `ugt_env.ts`).
[x] Test the basic reward system with python UGT wrapper.
[x] Fix RL agent reward tracking (sparse reward problem with artifact claim).
[x] Create native batch simulation to rapidly test 500+ games.
[x] Rebalance game math (DOOM_TOLL_MAX = 11, behavior deck composition, vote penalties).
[x] Run multiple 500-game simulations until Shadowking win rate hits the 18-22% target.
    * RESULT: 21.80% Shadowking Win Rate achieved (Average length: 13.7 rounds).*

### ✅ Tier 3: Browser UI Verification (Playability)
- **Goal**: Verify that the tuned math translates to an enjoyable, functional visual experience.
- **Method**: Playwright automated script driving the Vite Dev server via headless Chromium.
- **Scale**: Ran **10 full games** rendered in the browser.
- **Iteration**: Verified that headless math changes (Doom Toll 11) didn't break the React component lifecycle.

#### Completed UI Tasks
- [x] Create a Playwright-based script (`ml_training/ui_test.py`) to connect to the React frontend.
- [x] Bypass `SocialPressureOnboarding` modal in headless context.
- [x] Expose `window.__UGT_AUTO_PLAY__` flag to rapidly simulate rounds in the browser natively.
- [x] Verify visual rendering of new Math.
- [x] Loop 10 games successfully without crash or UI desync.

---

## 2. Implementation First Steps

To operationalize this testing plan, we must first build the infrastructure:

- ✅ **Initialize UGT Configuration**: Generate a `ugt.config.yaml` file in this directory that defines the game's Observation Space (Doom Toll, Banners, Faction state) and Action Space.
- ✅ **Build the Headless Bridge**: Create a `ugt_bridge.ts` script that interfaces the `simulation.ts` engine with the UGT JSON protocol.
- ✅ **Define Reward Profiles**: Configure declarative rewards in the YAML file. We will heavily reward the agent for defeating the Shadowking and penalize it when the Shadowking completes the Doom Toll, incentivizing the AI to find exploits.
- ✅ **Establish Reporting Scripts**: Create a small script that aggregates the `BatchResult` from the simulator into timestamped markdown files inside `/ml_training/reports/`.

---

## 3. Test Cycle Protocol (Durable Memory)

To maintain a durable memory of our balance tweaks, **every time** we alter game logic or math, we will run the following protocol:

- ✅ 1. Execute the 100-1000 game headless sweep.
- ✅ 2. The bridge will output the `BatchResult` JSON.
- ✅ 3. We will run a script (or prompt the agent) to convert that result into a summary report (e.g., `reports/run_2026-06-15_18-win-rate.md`).
- ✅ 4. This report will detail:
   - What math was changed (e.g., `Doom Toll Max set to 12`).
   - The resulting Shadowking Win Rate.
   - Average rounds and peak doom toll.
   - The recommended next tweak.

By retaining these files in the `reports/` directory, we ensure that previous balance iterations are never lost.
