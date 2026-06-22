/**
 * Setup — create a new game per ALGORITHM §3.
 *
 * function setup(playerCount, mode, seed):
 *   rng = SeededRandom(seed)
 *   board = buildFixedMap()
 *   players assigned to keeps, starting hands drawn
 *   Shadowking forces placed
 *   Crown computed, turn order shuffled
 *   Blood Pact assigned last (if mode === blood_pact)
 *   Round-1 banners generated
 *   act = WHISPER, round = 1, phase = THREAT
 *
 * Determinism note (§3): turn order and Blood Pact assigned LAST
 * so they don't perturb earlier RNG draws.
 */

import { SeededRandom } from '../utils/seeded-random.js';
import { buildClosingRing, createInitialBoardState } from './board.js';
import { computeCrownHolder, generateBannersForPlayer } from './sequencer.js';
import {
  CARD_VALUE_MAX,
  CARD_VALUE_MIN,
  STARTING_HAND,
  WARLORD_POWER,
  deathKnightCount,
  getTunables,
} from './tunables.js';
import type {
  GameMode,
  GameState,
  PlayerState,
  PlayerType,
  ShadowkingForce,
} from './types.js';

// ─── Card Deck ────────────────────────────────────────────────────

/**
 * Draw `count` cards from a seeded deck.
 * Cards are integer power values in [1, 4].
 */
function drawCards(rng: SeededRandom, count: number): number[] {
  const cards: number[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(rng.int(CARD_VALUE_MIN, CARD_VALUE_MAX));
  }
  return cards;
}

// ─── Player Creation ──────────────────────────────────────────────

function createPlayerState(
  index: number,
  type: PlayerType,
  keepNodeId: string,
  hand: number[],
): PlayerState {
  return {
    index,
    type,
    isBroken: false,
    brokenSince: null,
    brokenRoundsConsecutive: 0,
    hand,
    banners: 0,
    crownHeld: false,
    wounds: 0,
    actionsRemaining: 0,
    warlordNodeId: keepNodeId,
    rescueDebt: null,
    hasBloodPact: false,
  };
}

// ─── Force Placement ──────────────────────────────────────────────

function createInitialForces(
  rng: SeededRandom,
  blightEntrySeams: readonly string[],
  playerCount: number,
): ShadowkingForce[] {
  const forces: ShadowkingForce[] = [];

  // Place Death Knights at blight entry seams. Count scales with player count
  // (deathKnightCount) — default 0 scaling reproduces the flat DK_START_COUNT.
  const dkCount = deathKnightCount(playerCount);
  for (let i = 0; i < dkCount; i++) {
    const seamIndex = i % blightEntrySeams.length;
    forces.push({
      id: `dk-${i}`,
      type: 'death_knight',
      power: getTunables().DK_POWER,
      nodeId: blightEntrySeams[seamIndex],
    });
  }

  return forces;
}

// ─── Main Setup ───────────────────────────────────────────────────

/**
 * Create a new game with the given parameters.
 *
 * Same (playerCount, mode, seed) ⇒ identical GameState (§7.12).
 *
 * @param playerCount — 2 to 4 players
 * @param mode — 'competitive' or 'blood_pact'
 * @param seed — the RNG seed for the entire session
 * @param humanCount — how many human players (rest are AI). Defaults to 1.
 */
export function createGame(
  playerCount: number,
  mode: GameMode,
  seed: number,
  humanCount: number = 1,
): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2-4, got ${playerCount}`);
  }
  if (humanCount < 0 || humanCount > playerCount) {
    throw new Error(`humanCount must be 0-${playerCount}, got ${humanCount}`);
  }

  const rng = new SeededRandom(seed);

  // 1. Build the fixed map
  const boardDef = buildClosingRing();
  const boardState = createInitialBoardState(boardDef);

  // 2. Create players, each assigned a Keep
  const players: PlayerState[] = [];
  for (let i = 0; i < playerCount; i++) {
    const keepId = boardDef.keepIds[i];
    const type: PlayerType = i < humanCount ? 'human' : 'ai';
    const hand = drawCards(rng, STARTING_HAND);
    const player = createPlayerState(i, type, keepId, hand);
    players.push(player);

    // Pre-claim the Keep
    boardState.nodes[keepId].owner = i;

    // Place Warlord piece on the Keep
    boardState.nodes[keepId].pieces.push({
      id: `warlord-${i}`,
      type: 'warlord',
      owner: i,
      power: WARLORD_POWER,
      nodeId: keepId,
    });
  }

  // 3. Place initial Shadowking forces
  const forces = createInitialForces(rng, boardDef.blightEntrySeams, playerCount);

  // Place forces on the board state
  for (const force of forces) {
    boardState.nodes[force.nodeId].shadowkingForces.push({ ...force });
  }

  // 4. Shuffle turn order (§3: assigned LAST to not perturb earlier RNG)
  const turnOrder = rng.shuffle(
    Array.from({ length: playerCount }, (_, i) => i)
  );

  // 5. Assign Blood Pact (§3: assigned LAST, human players only)
  let bloodPactHolder: number | null = null;
  if (mode === 'blood_pact') {
    const humanIndices = players
      .filter(p => p.type === 'human')
      .map(p => p.index);
    if (humanIndices.length > 0) {
      bloodPactHolder = rng.pick(humanIndices);
      players[bloodPactHolder].hasBloodPact = true;
    }
  }

  // 6. Build initial state
  const state: GameState = {
    seed,
    round: 1,
    act: 'WHISPER',
    phase: 'THREAT',

    players,

    board: {
      definition: boardDef,
      state: boardState,
    },

    shadowking: {
      forces: [...forces],
      telegraph: null,
      grudge: new Array(playerCount).fill(0),
      patience: 0,
    },

    crownHolder: null,
    pledgeBuffer: [],
    pledgeHistory: [],

    activePlayerIndex: turnOrder[0],
    turnOrder,
    turnOrderPosition: 0,

    gameEndReason: null,
    winner: null,
    gambit: null,

    bloodPactHolder,
    bloodPactExposed: false,
    suspicionLog: [],
    accusationState: null,
    accusationLockoutUntilRound: 0,
    auditLog: [],

    actionLog: [],
    mode,
  };

  // 7. Compute initial Crown holder (§5.2)
  state.crownHolder = computeCrownHolder(state);
  for (const p of state.players) {
    p.crownHeld = (p.index === state.crownHolder);
  }

  // 8. Generate round-1 banners
  for (const p of state.players) {
    p.banners = generateBannersForPlayer(state, p.index);
  }

  return state;
}
