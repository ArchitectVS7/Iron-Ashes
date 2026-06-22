/**
 * Game metrics (Stage 4d) — what one finished game tells us about balance.
 *
 * `computeMetrics` is pure and derives EVERYTHING from the final `GameState` +
 * its `actionLog` event stream — never a parallel re-implementation of the rules
 * (the fidelity lesson from docs/ML-SYSTEM-ANALYSIS.md). These feed the §9
 * PASS/FAIL report and the win-rate-by-archetype / free-rider analysis.
 */

import type { Act, GameEndReason, GameState } from '../types.js';
import { FORGE_WEIGHT } from '../tunables.js';

export interface GameMetrics {
  readonly gameEndReason: GameEndReason;
  readonly winner: number | null;
  readonly rounds: number;
  readonly actReached: Act;

  /** The dark ate the Keystone (doom_complete) — the §9 "Shadowking win". */
  readonly shadowkingWin: boolean;
  readonly territoryWin: boolean;
  readonly gambitWin: boolean;
  /** All active Warlords Broken at once (mutual loss / draw). */
  readonly allBrokenDraw: boolean;

  /** A Crown's Gambit was seized at least once this game. */
  readonly gambitSeized: boolean;
  /** Number of RESCUE actions performed. */
  readonly rescueCount: number;
  /** Number of times a player entered the Broken state. */
  readonly brokenCount: number;

  /** Final living owned production per seat (Forges weighted FORGE_WEIGHT). */
  readonly territoryPerSeat: readonly number[];
  /** Mean pledged card amount per seat across the game (from pledgeHistory). */
  readonly meanPledgePerSeat: readonly number[];
}

/** Living owned production (Holdings + weighted Forges) for one seat. */
function territoryOf(state: GameState, seat: number): number {
  let t = 0;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== seat || ns.ashed) continue;
    const tier = state.board.definition.nodes[id].tier;
    if (tier === 'forge') t += FORGE_WEIGHT;
    else if (tier === 'keep' || tier === 'holding') t += 1;
  }
  return t;
}

/** Mean pledge amount per seat across all recorded rounds (0 if none). */
function meanPledges(state: GameState, playerCount: number): number[] {
  const totals = new Array<number>(playerCount).fill(0);
  const counts = new Array<number>(playerCount).fill(0);
  for (const round of state.pledgeHistory) {
    for (const entry of round) {
      if (entry.playerIndex < playerCount) {
        totals[entry.playerIndex] += entry.amount;
        counts[entry.playerIndex] += 1;
      }
    }
  }
  return totals.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
}

export function computeMetrics(state: GameState): GameMetrics {
  const playerCount = state.players.length;

  let rescueCount = 0;
  let brokenCount = 0;
  let gambitSeized = false;
  for (const e of state.actionLog) {
    if (e.type === 'PLAYER_ACTED') {
      if (e.action === 'RESCUE') rescueCount++;
      if (e.details?.broken === true) brokenCount++;
      if (e.details?.gambitSeized === true) gambitSeized = true;
    }
  }

  return {
    gameEndReason: state.gameEndReason,
    winner: state.winner,
    rounds: state.round,
    actReached: state.act,
    shadowkingWin: state.gameEndReason === 'doom_complete',
    territoryWin: state.gameEndReason === 'territory_victory',
    gambitWin: state.gameEndReason === 'gambit_victory',
    allBrokenDraw: state.gameEndReason === 'all_broken',
    gambitSeized: gambitSeized || state.gameEndReason === 'gambit_victory',
    rescueCount,
    brokenCount,
    territoryPerSeat: state.players.map(p => territoryOf(state, p.index)),
    meanPledgePerSeat: meanPledges(state, playerCount),
  };
}
