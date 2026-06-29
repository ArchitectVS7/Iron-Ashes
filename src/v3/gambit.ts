/**
 * Gambit — the Crown's Gambit alternate win condition (§6).
 *
 * Timeline:
 *   1. SEIZE: player marches a force onto the Keystone during ACTION.
 *   2. DECLARED: if they hold the Keystone at Dawn, Gambit goes public.
 *      The dark NAMES the claimant — next THREAT targets them regardless.
 *   3. WIN: if they STILL hold the Keystone at the NEXT Dawn, they win.
 *
 * Two costs (and only two, per P0-3 de-tax):
 *   - GAMBIT_SURCHARGE: pledged cards count for even less than Crown discount
 *   - Committed forces: pieces tied to center, can't pushback elsewhere
 *
 * Guardrails:
 *   - While garrisoned, dark CANNOT ash Keystone directly (§5.6 STRIKE-ADJACENT)
 *   - Ashed Approaches stay traversable at extra cost (§5.1)
 *   - Traitor NEVER wins the Gambit (Blood Pact holder excluded)
 *   - Loss check preempts Gambit win (Keystone ashed → doom_complete first)
 *   - Gambit held into round cap resolves BEFORE territory check
 */

import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import { FORGE_WEIGHT, GAMBIT_SURCHARGE } from './tunables.js';
import { generateReactiveVoiceLine } from './shadowking-policy.js';

// ─── Gambit Lifecycle ─────────────────────────────────────────────

/**
 * Check if a player has just seized the Keystone during ACTION.
 * Called after a MARCH onto the Keystone or a CLAIM.
 *
 * If no Gambit is active, initiate one (seize phase).
 * If another player's Gambit is active, they lose it.
 */
export function checkGambitSeize(
  state: GameState,
  playerIndex: number,
  /** Diagnostic-ONLY (Stage 5f): the AI's stated intent for the march that landed here, copied
   *  verbatim into the seize event's details so the sim can split deliberate vs incidental gambit
   *  fire. 'ambition'|'contest' ⇒ deliberate; undefined ⇒ incidental occupation. No rule reads it. */
  gambitIntent?: 'ambition' | 'contest',
): GameEvent[] {
  const events: GameEvent[] = [];
  const keystoneId = state.board.definition.keystoneId;

  // Only triggers when a player occupies the Keystone
  if (state.players[playerIndex].warlordNodeId !== keystoneId) {
    return events;
  }

  // Traitor cannot initiate a Gambit (§6 guardrail)
  if (state.mode === 'blood_pact' && state.bloodPactHolder === playerIndex) {
    return events;
  }

  // If there's already a Gambit by this player, do nothing
  if (state.gambit && state.gambit.claimant === playerIndex) {
    return events;
  }

  // If there's a Gambit by another player, it collapses
  if (state.gambit && state.gambit.claimant !== playerIndex) {
    events.push({
      type: 'PLAYER_ACTED',
      playerIndex: state.gambit.claimant,
      action: 'PASS',
      details: { gambitCollapsed: true, reason: 'displaced' },
    });

    const voiceLine = generateReactiveVoiceLine(state, 'gambit_collapsed');
    if (voiceLine) events.push(voiceLine);
  }

  // Initiate new Gambit (seize phase — not yet declared)
  state.gambit = {
    claimant: playerIndex,
    declaredRound: 0, // Not yet declared; will be set at Dawn
    named: false,
  };

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PASS',
    // gambitIntent is diagnostic metadata only (Stage 5f): 'ambition'|'contest' ⇒ a DELIBERATE
    // claim/contest; 'incidental' ⇒ the Warlord landed here pursuing some other goal.
    details: { gambitSeized: true, gambitIntent: gambitIntent ?? 'incidental' },
  });

  return events;
}

/**
 * Evaluate Gambit status at Dawn.
 *
 * Called AFTER escalation, AFTER loss check, BEFORE territory victory.
 * Returns:
 *   - 'gambit_victory' if the claimant wins
 *   - 'declared' if the Gambit just became public
 *   - 'collapsed' if the claimant lost the Keystone
 *   - null if no Gambit active
 */
export function evaluateGambitAtDawn(
  state: GameState,
): { outcome: 'gambit_victory' | 'declared' | 'collapsed' | null; events: GameEvent[] } {
  const events: GameEvent[] = [];

  if (!state.gambit) {
    return { outcome: null, events };
  }

  const keystoneId = state.board.definition.keystoneId;
  const claimant = state.gambit.claimant;
  const player = state.players[claimant];

  // Check if claimant still holds the Keystone
  const keystoneState = state.board.state.nodes[keystoneId];
  const stillHolding = player.warlordNodeId === keystoneId && !keystoneState.ashed;

  if (!stillHolding) {
    // Gambit collapsed — claimant was displaced or Keystone was ashed
    events.push({
      type: 'PLAYER_ACTED',
      playerIndex: claimant,
      action: 'PASS',
      details: { gambitCollapsed: true, reason: 'lost_keystone' },
    });

    const voiceLine = generateReactiveVoiceLine(state, 'gambit_collapsed');
    if (voiceLine) events.push(voiceLine);

    state.gambit = null;
    return { outcome: 'collapsed', events };
  }

  // If the Gambit was already named (declared last Dawn), check for victory
  if (state.gambit.named) {
    // Check: traitor cannot win the Gambit
    if (state.mode === 'blood_pact' && state.bloodPactHolder === claimant) {
      // Traitor's Gambit is invalidated — shouldn't happen (seize blocks it)
      state.gambit = null;
      return { outcome: 'collapsed', events };
    }

    // WIN! Claimant survived a full named round on the Keystone
    state.gameEndReason = 'gambit_victory';
    state.winner = claimant;

    events.push({
      type: 'GAME_OVER',
      reason: 'gambit_victory',
      winner: claimant,
    });

    // Voice line: the dark acknowledges defeat
    events.push({
      type: 'SK_VOICE_LINE',
      line: `So be it. ${player.index + 1} claims the throne. For now.`,
      trigger: 'gambit_won',
    });

    return { outcome: 'gambit_victory', events };
  }

  // Not yet named → DECLARE the Gambit (first Dawn holding the Keystone)
  state.gambit = {
    ...state.gambit,
    declaredRound: state.round,
    named: true,
  };

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex: claimant,
    action: 'PASS',
    details: {
      gambitDeclared: true,
      declaredRound: state.round,
    },
  });

  // The dark names the claimant — voice line
  events.push({
    type: 'SK_VOICE_LINE',
    line: `Player ${claimant + 1} sits the throne. I name them. One dawn to prove their claim — or burn.`,
    trigger: 'gambit_declared',
  });

  return { outcome: 'declared', events };
}

/**
 * Get the effective Pledge discount for a player, accounting for
 * Gambit surcharge.
 *
 * §6: Gambit claimant's cards count for even less than the standard
 * Crown discount — GAMBIT_SURCHARGE is the worst discount.
 */
export function getEffectivePledgeWeight(
  state: GameState,
  playerIndex: number,
  crownDiscount: number,
): number {
  // Gambit claimant gets the worst surcharge
  if (state.gambit && state.gambit.claimant === playerIndex && state.gambit.named) {
    return GAMBIT_SURCHARGE; // e.g., 0.25 — worse than CROWN_PLEDGE_DISCOUNT (0.5)
  }

  // Standard Crown discount
  const player = state.players[playerIndex];
  if (player.crownHeld) {
    return crownDiscount;
  }

  return 1.0;
}

// ─── Guardrails ───────────────────────────────────────────────────

/**
 * Check if the Keystone is garrisoned (a player holds it during a live Gambit).
 * While garrisoned, the dark CANNOT ash the Keystone directly — it uses
 * STRIKE-ADJACENT instead (§5.6).
 */
export function isKeystoneGarrisoned(state: GameState): boolean {
  if (!state.gambit) return false;
  const keystoneId = state.board.definition.keystoneId;
  return state.players[state.gambit.claimant].warlordNodeId === keystoneId;
}

// ─── Territory Victory Tiebreakers (§6) ──────────────────────────

/**
 * Compute the territory victory winner with full tiebreakers.
 *
 * Ordered, seed-deterministic tiebreakers (no coin flips):
 *   1. Most living production/territory (Holdings + Forges weighted)
 *   2. Fewest ashed tiles adjacent to your holdings
 *   3. Most Banners
 *   4. Earliest seat order
 */
export function computeTerritoryWinner(state: GameState): number | null {
  const scores: Array<{
    index: number;
    territory: number;
    ashedNeighbors: number;
    banners: number;
  }> = [];

  for (const p of state.players) {
    if (p.isEliminated) continue; // eliminated players ineligible

    let territory = 0;
    let ashedNeighbors = 0;

    for (const [nodeId, nodeState] of Object.entries(state.board.state.nodes)) {
      if (nodeState.owner !== p.index || nodeState.ashed) continue;

      const nodeDef = state.board.definition.nodes[nodeId];
      if (!nodeDef) continue;

      // Count territory value (single source of truth — matches Crown computation)
      if (nodeDef.tier === 'forge') {
        territory += FORGE_WEIGHT;
      } else if (nodeDef.tier === 'keep' || nodeDef.tier === 'holding') {
        territory += 1;
      }

      // Count ashed neighbors
      for (const connId of nodeDef.connections) {
        const connState = state.board.state.nodes[connId];
        if (connState?.ashed) ashedNeighbors++;
      }
    }

    scores.push({
      index: p.index,
      territory,
      ashedNeighbors,
      banners: p.banners,
    });
  }

  if (scores.length === 0) return null;

  // Sort with full tiebreakers
  scores.sort((a, b) => {
    // 1. Most territory
    if (b.territory !== a.territory) return b.territory - a.territory;
    // 2. Fewest ashed neighbors
    if (a.ashedNeighbors !== b.ashedNeighbors) return a.ashedNeighbors - b.ashedNeighbors;
    // 3. Most banners
    if (b.banners !== a.banners) return b.banners - a.banners;
    // 4. Earliest seat order
    return a.index - b.index;
  });

  return scores[0].index;
}
