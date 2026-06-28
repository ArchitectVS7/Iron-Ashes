/**
 * Reducer — the single applyCommand entry point.
 *
 * Every mutation to GameState goes through here. No direct state
 * mutation anywhere else. Pure function: same inputs → same outputs.
 *
 * ALGORITHM §7: determinism contract — no Math.random(), all RNG
 * via SeededRandom threaded through state.
 */

import type { Command } from './commands.js';
import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import { SeededRandom } from '../utils/seeded-random.js';
import {
  advanceActivePlayer,
  advanceToNextPhase,
  classifyPledgeTier,
  isActionPhaseComplete,
  isPledgeComplete,
  runThreatPhase,
} from './sequencer.js';

// ─── Result type ──────────────────────────────────────────────────

export interface CommandResult {
  state: GameState;
  events: GameEvent[];
}

// ─── Error class ──────────────────────────────────────────────────

export class InvalidCommandError extends Error {
  constructor(
    public readonly command: Command,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidCommandError';
  }
}

// ─── Deep clone utility ───────────────────────────────────────────

/**
 * Structured-clone the game state to ensure immutability.
 * The caller's original state is never mutated.
 */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

// ─── Main reducer ─────────────────────────────────────────────────

/**
 * Apply a command to the game state, returning a new state + events.
 *
 * This is the ONE entry point for all game mutations.
 * Stage 3a: validates commands, dispatches to stubs.
 * Stage 3b: fills in the real mechanics.
 */
export function applyCommand(state: GameState, command: Command): CommandResult {
  // Game over — no more commands accepted
  if (state.gameEndReason !== null) {
    throw new InvalidCommandError(command, 'Game is already over');
  }

  // Clone to ensure immutability of the input
  const newState = cloneState(state);

  // Create a seeded RNG derived from state for any randomness this command needs.
  // We derive from seed + round + phase ordinal to ensure deterministic sub-streams.
  const phaseOrdinal = ['THREAT', 'PLEDGE', 'ACTION', 'DAWN'].indexOf(newState.phase);
  const derivedSeed = newState.seed + newState.round * 100 + phaseOrdinal * 10;
  const rng = new SeededRandom(derivedSeed);

  switch (command.type) {
    case 'ADVANCE_PHASE':
      return handleAdvancePhase(newState, rng);

    case 'SUBMIT_PLEDGE':
      return handleSubmitPledge(newState, command.playerIndex, command.amount);

    case 'PLAYER_ACTION':
      return handlePlayerAction(newState, command.playerIndex, command.action);

    case 'LAST_STAND_COMMIT':
      return handleLastStandCommit(newState, command.playerIndex, command.cardCount);

    case 'INITIATE_ACCUSATION':
      return handleInitiateAccusation(newState, command.accuserIndex, command.accusedIndex);

    case 'ACCUSATION_VOTE':
      return handleAccusationVote(newState, command.playerIndex, command.agree);

    default: {
      // Exhaustive check
      const _exhaustive: never = command;
      throw new InvalidCommandError(_exhaustive, `Unknown command type`);
    }
  }
}

// ─── Command Handlers ─────────────────────────────────────────────

function handleAdvancePhase(state: GameState, rng: SeededRandom): CommandResult {
  const allEvents: GameEvent[] = [];

  // If we're in THREAT, first run the threat phase logic
  if (state.phase === 'THREAT') {
    const threatResult = runThreatPhase(state);
    state = threatResult.state;
    allEvents.push(...threatResult.events);
  }

  // If we're in PLEDGE, validate all pledges are in
  if (state.phase === 'PLEDGE' && !isPledgeComplete(state)) {
    throw new InvalidCommandError(
      { type: 'ADVANCE_PHASE' },
      `Cannot advance from PLEDGE: not all players have submitted pledges (${state.pledgeBuffer.length}/${state.players.length})`,
    );
  }

  // If we're in ACTION, validate all players have acted
  if (state.phase === 'ACTION' && !isActionPhaseComplete(state)) {
    throw new InvalidCommandError(
      { type: 'ADVANCE_PHASE' },
      'Cannot advance from ACTION: not all players have completed their turns',
    );
  }

  const result = advanceToNextPhase(state, rng);
  allEvents.push(...result.events);

  // Append events to actionLog
  result.state.actionLog.push(...allEvents);

  return { state: result.state, events: allEvents };
}

function handleSubmitPledge(
  state: GameState,
  playerIndex: number,
  amount: number,
): CommandResult {
  const events: GameEvent[] = [];

  // Validate phase
  if (state.phase !== 'PLEDGE') {
    throw new InvalidCommandError(
      { type: 'SUBMIT_PLEDGE', playerIndex, amount },
      `Cannot submit pledge during ${state.phase} phase`,
    );
  }

  // Validate player
  const player = state.players[playerIndex];
  if (!player) {
    throw new InvalidCommandError(
      { type: 'SUBMIT_PLEDGE', playerIndex, amount },
      `Player ${playerIndex} does not exist`,
    );
  }

  // Check for duplicate pledge
  if (state.pledgeBuffer.some(p => p.playerIndex === playerIndex)) {
    throw new InvalidCommandError(
      { type: 'SUBMIT_PLEDGE', playerIndex, amount },
      `Player ${playerIndex} has already submitted a pledge this round`,
    );
  }

  // Validate amount
  if (amount < 0 || amount > player.hand.length) {
    throw new InvalidCommandError(
      { type: 'SUBMIT_PLEDGE', playerIndex, amount },
      `Invalid pledge amount ${amount} (hand size: ${player.hand.length})`,
    );
  }

  // Classify tier
  const tier = classifyPledgeTier(amount, player.hand.length);

  // Store pledge
  state.pledgeBuffer.push({
    playerIndex,
    amount,
    tier,
  });

  // Sealed reveal (blood_pact always; competitive per SEALED_CORE_PLEDGE): the public
  // log shows only that a player committed — amount/tier go to the Suspicion Log (§10).
  if (isPledgeSealed(state, playerIndex)) {
    events.push({ type: 'PLEDGE_COMMITTED', playerIndex });
  } else {
    events.push({
      type: 'PLEDGE_SUBMITTED',
      playerIndex,
      amount,
      tier,
    });
  }

  // Append to actionLog
  state.actionLog.push(...events);

  return { state, events };
}

import {
  executeMarch,
  executeHeraldMarch,
  executeClaim,
  executeStrike,
  executeRaid,
  executeRansom,
  executeRecruit,
  executeParley,
  executeSwearOath,
  executeBreakOath,
} from './actions.js';
import {
  executeAudit,
  initiateAccusation,
  submitAccusationVote,
} from './blood-pact.js';
import { executeAssaultHeart } from './heart.js';
import {
  chooseCombatCommit,
  chooseRaidAttackCommit,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
} from './combat.js';
import { COMBAT_COMMIT_MAX, RAID_DEFENSE_MARGIN, getTunables } from './tunables.js';

/**
 * Is player `playerIndex`'s pledge SEALED (concealed reveal) this round? Always in
 * blood_pact; in competitive per SEALED_CORE_PLEDGE (§ Sealed Pledge): 'all' seals
 * everyone, 'gambit_claimant' seals only the named Gambit claimant. (Sealing affects
 * only the emitted event — the deterministic AI never reads rivals' pledges.)
 */
function isPledgeSealed(state: GameState, playerIndex: number): boolean {
  if (state.mode === 'blood_pact') return true;
  const mode = getTunables().SEALED_CORE_PLEDGE;
  if (mode === 'all') return true;
  if (mode === 'gambit_claimant') {
    return state.gambit?.claimant === playerIndex && state.gambit?.named === true;
  }
  return false;
}

function handlePlayerAction(
  state: GameState,
  playerIndex: number,
  action: import('./commands.js').PlayerAction,
): CommandResult {
  const events: GameEvent[] = [];

  // Validate phase
  if (state.phase !== 'ACTION') {
    throw new InvalidCommandError(
      { type: 'PLAYER_ACTION', playerIndex, action },
      `Cannot perform actions during ${state.phase} phase`,
    );
  }

  // Validate it's this player's turn
  if (state.activePlayerIndex !== playerIndex) {
    throw new InvalidCommandError(
      { type: 'PLAYER_ACTION', playerIndex, action },
      `Not player ${playerIndex}'s turn (active: ${state.activePlayerIndex})`,
    );
  }

  const player = state.players[playerIndex];

  // PASS ends this player's turn
  if (action.type === 'PASS') {
    player.actionsRemaining = 0;
    events.push({
      type: 'PLAYER_ACTED',
      playerIndex,
      action: 'PASS',
      details: {},
    });

    // Advance to next player
    const advResult = advanceActivePlayer(state);
    events.push(...advResult.events);
    state.actionLog.push(...events);
    return { state: advResult.state, events };
  }

  // Validate actions remaining
  if (player.actionsRemaining <= 0) {
    throw new InvalidCommandError(
      { type: 'PLAYER_ACTION', playerIndex, action },
      `Player ${playerIndex} has no actions remaining`,
    );
  }

  // Dispatch to real action implementations
  let actionResult;

  switch (action.type) {
    case 'MARCH': {
      if (!action.targetNodeId) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          'MARCH requires a targetNodeId',
        );
      }
      try {
        actionResult = action.pieceId === 'herald'
          ? executeHeraldMarch(state, playerIndex, action.targetNodeId)
          : executeMarch(state, playerIndex, action.targetNodeId);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'CLAIM': {
      try {
        actionResult = executeClaim(state, playerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'STRIKE': {
      // Value-aware commit (4g): enough of the best cards to beat the SK force
      // (its power is public), not an arbitrary hand[0].
      const skPower = getShadowkingPowerAtNode(state, player.warlordNodeId);
      const myBase = getPlayerPowerAtNode(state, playerIndex, player.warlordNodeId);
      const strikeCards = chooseCombatCommit(player.hand, myBase, skPower, COMBAT_COMMIT_MAX);
      try {
        actionResult = executeStrike(state, playerIndex, strikeCards);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'RAID': {
      if (action.targetPlayerIndex === undefined || action.targetPlayerIndex === null) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          'RAID requires a targetPlayerIndex',
        );
      }
      // Value-aware commits (4g): the attacker sizes to beat the defender's known
      // BASE power plus a small assumed defense; the defender commits its best card.
      const defender = state.players[action.targetPlayerIndex];
      const node = player.warlordNodeId;
      const atkBase = getPlayerPowerAtNode(state, playerIndex, node);
      const defBase = defender ? getPlayerPowerAtNode(state, action.targetPlayerIndex, node) : 0;
      // Capture-intent RAIDs size UP to clear the standing-scaled capture margin (§5.2, Stage 5a);
      // TAKE_LAND/ROUT keep the thin pre-5a sizing. Shared with the AI's predictor (throw-safe).
      const atkCards = defender
        ? chooseRaidAttackCommit(state, playerIndex, action.targetPlayerIndex, node,
            action.raidEffect === 'CAPTURE_PIECE')
        : chooseCombatCommit(player.hand, atkBase, defBase + RAID_DEFENSE_MARGIN, COMBAT_COMMIT_MAX);
      const defCards = defender ? chooseCombatCommit(defender.hand, defBase, atkBase, 1) : [];
      try {
        actionResult = executeRaid(
          state, playerIndex, action.targetPlayerIndex, atkCards, defCards,
          { effect: action.raidEffect ?? 'TAKE_LAND', targetPieceId: action.pieceId },
        );
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'RANSOM': {
      if (!action.pieceId) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          'RANSOM requires a pieceId (the captive to free)',
        );
      }
      try {
        actionResult = executeRansom(state, playerIndex, action.pieceId, action.consent ?? true);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'ASSAULT_HEART': {
      // Commit the actor's highest cards as the card sink (value-aware; the sim/UI may pass an
      // explicit set, but the headless path sizes the strongest legal commit). §5.6/§13 P0-6.
      const sorted = [...player.hand].sort((a, b) => b - a);
      const heartCards = sorted.slice(0, Math.min(sorted.length, COMBAT_COMMIT_MAX));
      try {
        actionResult = executeAssaultHeart(state, playerIndex, heartCards);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'RECRUIT': {
      try {
        actionResult = executeRecruit(state, playerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'AUDIT': {
      if (action.targetPlayerIndex === undefined || action.targetPlayerIndex === null) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          'AUDIT requires a targetPlayerIndex',
        );
      }
      try {
        actionResult = executeAudit(state, playerIndex, action.targetPlayerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'PARLEY': {
      try {
        actionResult = executeParley(state, playerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'SWEAR_OATH': {
      if (action.targetPlayerIndex === undefined || action.targetPlayerIndex === null) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          'SWEAR_OATH requires a targetPlayerIndex',
        );
      }
      try {
        actionResult = executeSwearOath(state, playerIndex, action.targetPlayerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    case 'BREAK_OATH': {
      try {
        actionResult = executeBreakOath(state, playerIndex);
      } catch (e: unknown) {
        throw new InvalidCommandError(
          { type: 'PLAYER_ACTION', playerIndex, action },
          (e as Error).message,
        );
      }
      break;
    }

    default: {
      throw new InvalidCommandError(
        { type: 'PLAYER_ACTION', playerIndex, action },
        `Unknown action type: ${(action as { type: string }).type}`,
      );
    }
  }

  // Apply action result
  state = actionResult.state;
  events.push(...actionResult.events);

  // Deduct action (if consumed)
  if (actionResult.actionConsumed) {
    player.actionsRemaining--;
  }

  // If player is out of actions, advance to next player
  if (player.actionsRemaining <= 0) {
    const advResult = advanceActivePlayer(state);
    events.push(...advResult.events);
    state = advResult.state;
  }

  // Check immediate loss after each action (§4.3): only doom_complete can end the game
  // mid-action (the Keystone ashed). Elimination/deposal NEVER resolves here — it resolves
  // ONLY at Dawn via resolveDeposals (§6, determinism §7 D5).
  const keystoneState = state.board.state.nodes[state.board.definition.keystoneId];
  if (keystoneState?.ashed) {
    state.gameEndReason = 'doom_complete';
    // The traitor wins on doom UNLESS they were exposed by a correct accusation (§10).
    state.winner = (state.mode === 'blood_pact' && !state.bloodPactExposed)
      ? state.bloodPactHolder
      : null;
    events.push({
      type: 'GAME_OVER',
      reason: 'doom_complete',
      winner: state.winner,
    });
  }

  state.actionLog.push(...events);

  return { state, events };
}

function handleLastStandCommit(
  state: GameState,
  playerIndex: number,
  cardCount: number,
): CommandResult {
  // Last Stand: defender commits additional cards (one-sided, final)
  // In the headless sim, Last Stand is resolved inline during combat.
  // This command is for the interactive UI path — currently a placeholder
  // that will be wired in when the UI layer adds the sealed-commit flow.
  const events: GameEvent[] = [];

  const player = state.players[playerIndex];
  if (cardCount > player.hand.length) {
    throw new InvalidCommandError(
      { type: 'LAST_STAND_COMMIT', playerIndex, cardCount },
      `Cannot commit ${cardCount} cards: only ${player.hand.length} in hand`,
    );
  }

  // For now, the Last Stand is resolved within the combat flow.
  // This handler is wired for future interactive use.
  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'PASS',
    details: { lastStand: true, cardCount },
  });

  state.actionLog.push(...events);
  return { state, events };
}

// ─── Blood Pact command handlers (§10) ───────────────────────────

function handleInitiateAccusation(
  state: GameState,
  accuserIndex: number,
  accusedIndex: number,
): CommandResult {
  let result;
  try {
    result = initiateAccusation(state, accuserIndex, accusedIndex);
  } catch (e: unknown) {
    throw new InvalidCommandError(
      { type: 'INITIATE_ACCUSATION', accuserIndex, accusedIndex },
      (e as Error).message,
    );
  }
  result.state.actionLog.push(...result.events);
  return result;
}

function handleAccusationVote(
  state: GameState,
  playerIndex: number,
  agree: boolean,
): CommandResult {
  let result;
  try {
    result = submitAccusationVote(state, playerIndex, agree);
  } catch (e: unknown) {
    throw new InvalidCommandError(
      { type: 'ACCUSATION_VOTE', playerIndex, agree },
      (e as Error).message,
    );
  }
  result.state.actionLog.push(...result.events);
  return result;
}

