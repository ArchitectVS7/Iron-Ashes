/**
 * Shadowking Policy — the telegraphed reactive villain (§5.6).
 *
 * The Shadowking is a CHARACTER, not a deck (Focus Group consensus #2).
 * It follows transparent, telegraphed rules — legible enough to play
 * around, reactive enough to never be "solved."
 *
 * Target precedence (P0-3):
 *   1. Gambit claimant (if a Gambit is live)
 *   2. Highest grudge player
 *   3. Crown holder
 *   4. Ties → lowest seat index (§7.6)
 *
 * Effect chosen by Act + board state (§5.6):
 *   WHISPER: SPREAD — advance Blight along steered spoke
 *   MARCH:   MARCH_DK — Death Knights move 2 nodes toward target
 *   RECKONING: REAP — assault all exposed border strongholds, or SURGE (double SPREAD)
 *
 * Voice lines (P0-5): the villain speaks in first person, reacting to
 * game state — not just a once-per-round announcement.
 *
 * Grudge system (P0-4, P1):
 *   - Public per-player meter, decays each round, capped
 *   - Heroic-grudge (DK kills, Forge reclaims) decays faster
 *   - Wounding the SK raises YOUR grudge — steer the dark at rivals
 */

import type { GameEvent } from './events.js';
import type {
  GameState,
  ShadowkingTelegraph,
  V2BoardDef,
} from './types.js';
import {
  getTunables,
  doomCost,
} from './tunables.js';

// ─── Grudge Tracking ──────────────────────────────────────────────

/**
 * Add grudge to a player (capped at GRUDGE_CAP).
 * Returns the events produced.
 */
export function addGrudge(
  state: GameState,
  playerIndex: number,
  amount: number,
  reason: string,
): GameEvent[] {
  const events: GameEvent[] = [];
  const previousGrudge = state.shadowking.grudge[playerIndex];
  state.shadowking.grudge[playerIndex] = Math.min(
    previousGrudge + amount,
    getTunables().GRUDGE_CAP,
  );
  const newGrudge = state.shadowking.grudge[playerIndex];

  if (newGrudge !== previousGrudge) {
    events.push({
      type: 'GRUDGE_CHANGED',
      playerIndex,
      previousGrudge,
      newGrudge,
      reason,
    });
  }

  return events;
}

/**
 * Decay all players' grudge at the start of each round, by GRUDGE_DECAY_RATE.
 *
 * All grudge decays at one flat rate. (An earlier design split this into
 * faster-decaying "heroic" grudge vs sticky provocation grudge; that intent —
 * keeping the table's most helpful front-pushers from becoming the permanent
 * named target — is instead delivered by the asymmetric grudge Mark
 * (GRUDGE_MARK_TOP_N): trailing seats pay no grudge for killing a DK. See §5.6.)
 */
export function decayGrudge(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];

  for (let i = 0; i < state.players.length; i++) {
    const previousGrudge = state.shadowking.grudge[i];
    if (previousGrudge <= 0) continue;

    state.shadowking.grudge[i] = Math.max(previousGrudge - getTunables().GRUDGE_DECAY_RATE, 0);
    const newGrudge = state.shadowking.grudge[i];

    if (newGrudge !== previousGrudge) {
      events.push({
        type: 'GRUDGE_CHANGED',
        playerIndex: i,
        previousGrudge,
        newGrudge,
        reason: 'decay',
      });
    }
  }

  return events;
}

// ─── Target Selection ─────────────────────────────────────────────

/**
 * Choose the Shadowking's target for this round.
 *
 * Precedence (§5.6 + P0-3):
 *   1. Gambit claimant
 *   2. Highest grudge (ties: lowest seat index)
 *   3. Crown holder
 *   4. Fallback: lowest seat index
 *
 * Pure function of state — no RNG needed for targeting.
 */
export function chooseTarget(state: GameState): number {
  // 1. Gambit claimant overrides everything
  if (state.gambit) {
    return state.gambit.claimant;
  }

  // 2. Highest grudge
  const maxGrudge = Math.max(...state.shadowking.grudge);
  if (maxGrudge > 0) {
    // Find all players at max grudge
    const candidates = state.shadowking.grudge
      .map((g, i) => ({ index: i, grudge: g }))
      .filter(c => c.grudge === maxGrudge && c.index < state.players.length);

    if (candidates.length === 1) return candidates[0].index;
    // Tie → lowest seat index (§7.6)
    return Math.min(...candidates.map(c => c.index));
  }

  // 3. Crown holder
  if (state.crownHolder !== null) {
    return state.crownHolder;
  }

  // 4. Fallback: lowest seat index
  return 0;
}

// ─── Effect Selection ─────────────────────────────────────────────

/** Shadowking effect types. */
export type ShadowkingEffect =
  | 'SPREAD'       // Advance Blight along steered spoke
  | 'SEIZE'        // Claim nearest living Holding
  | 'MARCH_DK'     // Move Death Knights toward target
  | 'RAID_DK'      // Death Knight assaults target's stronghold
  | 'REAP'         // Assault all exposed border nodes
  | 'SURGE';       // Double SPREAD (Reckoning escalation)

/**
 * Choose the effect for this round based on the current Act and board state.
 *
 * §5.6 policy:
 *   WHISPER: primarily SPREAD; SEIZE if a Holding is available
 *   MARCH:   MARCH_DK toward target; RAID if adjacent
 *   RECKONING: REAP (assault borders) or SURGE (double spread)
 */
export function chooseEffect(state: GameState): ShadowkingEffect {
  const act = state.act;

  switch (act) {
    case 'WHISPER':
      // SPREAD is the primary Whisper effect — Blight converges inward
      return 'SPREAD';

    case 'MARCH': {
      // If Death Knights exist, MARCH them; otherwise escalation SPREAD
      const hasDK = state.shadowking.forces.some(f => f.type === 'death_knight');
      return hasDK ? 'MARCH_DK' : 'SPREAD';
    }

    case 'RECKONING': {
      // Alternate between REAP and SURGE based on round parity
      // (deterministic choice that keeps pressure varied)
      return state.round % 2 === 0 ? 'REAP' : 'SURGE';
    }
  }
}

// ─── Target Node Selection ────────────────────────────────────────

/**
 * Choose the node the Shadowking targets.
 *
 * For SPREAD/SURGE: the spoke frontier of the steered quadrant.
 * For SEIZE: nearest unclaimed living Holding.
 * For MARCH_DK/RAID_DK: target player's nearest owned node.
 * For REAP: steered quadrant frontier (affects all exposed borders).
 */
function chooseTargetNode(
  state: GameState,
  effect: ShadowkingEffect,
  targetPlayerIndex: number,
  steerQuadrant: number,
): string {
  const definition = state.board.definition;

  switch (effect) {
    case 'SPREAD':
    case 'SURGE':
    case 'REAP': {
      // Target the steered spoke frontier
      const keepId = definition.keepIds[steerQuadrant];
      if (!keepId) return definition.approachIds[0];

      // Find first non-ashed node on the spoke from the outer edge
      const spokePath = getSpokePathSimple(definition, steerQuadrant);
      for (const nodeId of spokePath) {
        const ns = state.board.state.nodes[nodeId];
        if (ns && !ns.ashed) return nodeId;
      }
      // All ashed — target keystone
      return definition.keystoneId;
    }

    case 'SEIZE': {
      // Find nearest unclaimed living Holding
      for (const holdId of definition.holdingIds) {
        const ns = state.board.state.nodes[holdId];
        if (ns && !ns.ashed && ns.owner === null) return holdId;
      }
      // Fall back to SPREAD target
      return definition.approachIds[steerQuadrant];
    }

    case 'MARCH_DK':
    case 'RAID_DK': {
      // The target player's ACTUAL location (P1b — not keepIds[index], which only
      // worked because player i happens to be seated in keep i; that aliases the
      // player index with a quadrant index and breaks if seating ever changes).
      return state.players[targetPlayerIndex]?.warlordNodeId ?? definition.approachIds[0];
    }
  }
}

/** Simple spoke path from outer to inner. */
function getSpokePathSimple(definition: V2BoardDef, quadrant: number): string[] {
  const keepId = definition.keepIds[quadrant];
  const keepNode = definition.nodes[keepId];
  const adjacentHoldings = keepNode.connections.filter(
    connId => definition.nodes[connId]?.tier === 'holding'
  );
  const forgeId = definition.forgeIds[quadrant];
  const approachId = definition.approachIds[quadrant];

  return [
    ...adjacentHoldings,
    keepId,
    forgeId,
    approachId,
    definition.keystoneId,
  ];
}



// ─── Voice Lines ──────────────────────────────────────────────────

/**
 * Generate the Shadowking's first-person voice line for the THREAT phase.
 *
 * P0-5: the villain is a CHARACTER, not a once-per-round announcer.
 * Lines are keyed off state for reactive personality.
 */
function generateVoiceLine(
  state: GameState,
  effect: ShadowkingEffect,
  targetIndex: number,
  targetName: string,
): string {
  const act = state.act;

  // Grudge-driven targeting
  const maxGrudge = Math.max(...state.shadowking.grudge);
  if (maxGrudge > 0 && state.shadowking.grudge[targetIndex] === maxGrudge) {
    const grudgeLines = [
      `You wound me, ${targetName}. I remember.`,
      `${targetName}... you drew blade against me. That was unwise.`,
      `I turn my hunger toward ${targetName}. You earned this.`,
    ];
    return grudgeLines[state.round % grudgeLines.length];
  }

  // Act-specific + effect-specific lines
  switch (act) {
    case 'WHISPER': {
      const lines = [
        `I stir beneath your lands, ${targetName}. Do you feel it?`,
        `The darkness creeps closer. Who will pay the price, ${targetName}?`,
        `Your crown glitters so brightly, ${targetName}. It draws my gaze.`,
      ];
      return lines[state.round % lines.length];
    }

    case 'MARCH': {
      const marchLines = [
        `My knights ride for your stronghold, ${targetName}. Will your friends save you?`,
        `The march begins, ${targetName}. Your walls are thin.`,
        `I send my herald to your gates, ${targetName}. Pledge wisely.`,
      ];
      return marchLines[state.round % marchLines.length];
    }

    case 'RECKONING': {
      const reckoningLines = [
        `The reckoning is here, ${targetName}. All your borders bleed.`,
        `No corner is safe now. I come for everything you built, ${targetName}.`,
        `This is the end of your little kingdom, ${targetName}. Watch it burn.`,
      ];
      return reckoningLines[state.round % reckoningLines.length];
    }
  }
}

/**
 * Generate a reactive voice bark for events during the round (P0-5).
 * Called by the sequencer when notable events occur.
 */
export function generateReactiveVoiceLine(
  state: GameState,
  trigger: string,
): GameEvent | null {
  let line: string;

  switch (trigger) {
    case 'thin_pledge':
      line = 'Your friends sold you cheap.';
      break;
    case 'full_block':
      line = 'You held the line. It will not happen twice.';
      break;
    case 'player_eliminated': {
      // The most-recently-eliminated living-no-more Warlord (highest eliminatedRound,
      // seat tiebreak) — the one this Dawn just deposed.
      const fallen = state.players
        .filter(p => p.isEliminated)
        .sort((a, b) => (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0) || a.index - b.index)[0];
      const name = fallen ? `Player ${fallen.index + 1}` : 'One of you';
      line = `${name} is deposed. Their lands feed my hunger now.`;
      break;
    }
    case 'crown_changed': {
      const holder = state.crownHolder;
      const name = holder !== null ? `Player ${holder + 1}` : 'no one';
      line = `A new leader. The crown passes to ${name}. I turn my gaze.`;
      break;
    }
    case 'dk_killed':
      line = 'So. You draw the blade. Noted.';
      break;
    case 'pushback':
      line = 'You push back the darkness? A wound I will repay.';
      break;
    case 'gambit_declared':
      line = 'Someone sits the throne. I name them. One dawn to prove it.';
      break;
    case 'gambit_collapsed':
      line = 'The pretender falls. As I knew they would.';
      break;
    case 'patience_escalation':
      line = 'You held the line too many times. Now I change the rules.';
      break;
    default:
      return null;
  }

  return {
    type: 'SK_VOICE_LINE',
    line,
    trigger,
  };
}

// ─── Main Policy ──────────────────────────────────────────────────

/**
 * Choose the Shadowking's full intent for this round.
 *
 * Called during the THREAT phase. Produces a ShadowkingTelegraph
 * with target, effect, cost, steer direction, and voice line.
 *
 * Pure function of state — deterministic (§7.6).
 */
export function chooseShadowkingIntent(state: GameState): ShadowkingTelegraph {
  // 1. Choose target (precedence: Gambit > grudge > Crown > seat)
  const targetIndex = chooseTarget(state);
  const targetName = `Player ${targetIndex + 1}`;

  // 2. Choose effect based on Act + board state
  const effect = chooseEffect(state);

  // 3. Compute steer quadrant — the CROWN holder's quadrant (§5.6: the hot front
  //    rotates toward whoever leads, even when the named strike targets someone
  //    else via grudge/Gambit). Falls back to the target's quadrant if no Crown.
  const steerOwner = state.crownHolder ?? targetIndex;
  const steerKeepId = state.board.definition.keepIds[steerOwner];
  const steerQuadrant = state.board.definition.nodes[steerKeepId]?.quadrant ?? 0;

  // 4. Choose target node
  const targetNodeId = chooseTargetNode(state, effect, targetIndex, steerQuadrant);

  // 5. Compute doom cost
  const cost = doomCost(state.act, state.players.length);

  // 6. Generate voice line
  const firstPersonLine = generateVoiceLine(state, effect, targetIndex, targetName);

  return {
    effect,
    targetNodeId,
    doomCost: cost,
    struckPlayerIndex: targetIndex,
    steerQuadrant,
    firstPersonLine,
  };
}
