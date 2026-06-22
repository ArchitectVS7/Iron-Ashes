import { createGameState } from '../src/engine/game-loop.js';
import { simulateRound } from '../src/engine/simulation.js';
import { isGameOver } from '../src/systems/victory.js';
import { SeededRandom } from '../src/utils/seeded-random.js';
import * as fs from 'fs';
import * as path from 'path';

const NUM_GAMES = 500;

function runBatch() {
  let shadowkingWins = 0;
  let playerWins = 0;
  let totalRounds = 0;

  console.log(`Starting native batch simulation of ${NUM_GAMES} games...`);

  for (let i = 0; i < NUM_GAMES; i++) {
    const seed = 100000 + i;
    const rng = new SeededRandom(seed);
    const state = createGameState(4, 'competitive', seed);

    while (!isGameOver(state)) {
      simulateRound(state, rng);
      if (state.round > 100) {
        // Fallback to prevent infinite loops
        state.gameEndReason = 'doom_complete';
        break;
      }
    }

    if (state.gameEndReason === 'doom_complete') {
      shadowkingWins++;
      if (i < 5) console.log(`Game ${i} - SK won at Doom Toll ${state.doomToll}`);
    } else {
      playerWins++;
      if (i < 5) console.log(`Game ${i} - Players won at Doom Toll ${state.doomToll}`);
    }
    
    totalRounds += state.round;
    
    if ((i + 1) % 100 === 0) {
      console.log(`[+] Completed ${i + 1}/${NUM_GAMES} games...`);
    }
  }

  const shadowkingWinRate = shadowkingWins / NUM_GAMES;
  const avgRounds = totalRounds / NUM_GAMES;

  console.log('\n[+] Batch Simulation Complete!');
  console.log(`[+] Shadowking Wins: ${shadowkingWins} (${(shadowkingWinRate * 100).toFixed(2)}%)`);
  console.log(`[+] Player Wins:     ${playerWins} (${((playerWins / NUM_GAMES) * 100).toFixed(2)}%)`);
  console.log(`[+] Average Rounds:  ${avgRounds.toFixed(2)}`);

  const reportPath = path.join(process.cwd(), 'ml_training', 'results', 'native_balance_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    totalGames: NUM_GAMES,
    shadowkingWins,
    playerWins,
    shadowkingWinRate,
    avgRounds,
  }, null, 2));

  console.log(`[+] Detailed report saved to: ${reportPath}`);
}

runBatch();
