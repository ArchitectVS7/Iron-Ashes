/**
 * Presentation Moves (T-101) — the semantic event stream the v3 UI animates from.
 *
 * A `Move` is a single semantic presentation event (a piece stepped A→B, a token flipped,
 * a captive was taken, the act advanced, the game ended, …). `diffObservable(prev, next)`
 * derives the moves for one tick purely from two `observableState` projections **for the
 * same `viewerSeat`** — nothing else. Because both inputs are already fogged (§7 D2), the
 * move stream is leak-safe BY CONSTRUCTION: this module imports only TYPES from `src/v3`
 * (never the reducer / setup / events), never touches `seed`, and only surfaces a token's
 * hidden content from a token whose `flipped === true` in `next`. A face-down token can
 * contribute nothing but the (already-public) back-sigil, and even that only via reveal.
 *
 * Determinism: `diffObservable` is a pure function of its two arguments — no `Math.random`,
 * no `Date.now`, no ambient timing — and emits in a fixed canonical order, so the same pair
 * of projections always yields a byte-identical `Move[]` (the M1 "byte-identical stream over
 * 2 seeds" metric depends on this). `diffObservable(a, a) === []`.
 */

import type { ObservableState, ObservableNodeState } from '../v3/observable.js';
import type { Command, ActionType } from '../v3/commands.js';
import type {
  Archetype,
  BackSigil,
  GameEndReason,
  ShadowkingForceType,
  TokenKind,
} from '../v3/types.js';

// ─── The Move union ───────────────────────────────────────────────

/** A player piece stepped from one node to another. */
export interface PieceMoveMove {
  readonly type: 'piece_move';
  readonly pieceId: string;
  readonly owner: number;
  readonly from: string;
  readonly to: string;
}

/** A new court piece appeared on the board (RECRUIT / CLAIM discovery / STRIKE bonus). */
export interface PieceRecruitedMove {
  readonly type: 'piece_recruited';
  readonly pieceId: string;
  readonly owner: number;
  readonly archetype: Archetype;
  readonly node: string;
}

/** A piece was taken hostage (a new captive ledger entry). */
export interface CaptureMove {
  readonly type: 'capture';
  readonly pieceId: string;
  readonly ownerSeat: number;
  readonly captorSeat: number;
  /** The node the piece was standing on when captured (from the prev projection), or '' if unknown. */
  readonly node: string;
}

/** A captive was freed (a captive ledger entry was removed). */
export interface RansomMove {
  readonly type: 'ransom';
  readonly pieceId: string;
  readonly ownerSeat: number;
}

/** A piece was ROUTED off-board (a tempo loss, not removal). */
export interface RoutMove {
  readonly type: 'rout';
  readonly pieceId: string;
  readonly owner: number;
}

/** A face-down Discovery token flipped to reveal its content. */
export interface TokenRevealMove {
  readonly type: 'token_reveal';
  readonly node: string;
  readonly sigil: BackSigil;
  readonly kind: TokenKind;
  /** Recruit only — the discovered retainer's archetype; null for non-recruit kinds. */
  readonly archetype: Archetype | null;
}

/** A node changed hands (claimed from neutral, or seized from a rival). */
export interface NodeClaimedMove {
  readonly type: 'node_claimed';
  readonly node: string;
  readonly owner: number;
}

/** A node's Blight level changed. */
export interface NodeBlightedMove {
  readonly type: 'node_blighted';
  readonly node: string;
  readonly from: number;
  readonly to: number;
}

/** A node was permanently ashed. */
export interface NodeAshedMove {
  readonly type: 'node_ashed';
  readonly node: string;
}

/** A seat's Banner count changed. */
export interface BannersDeltaMove {
  readonly type: 'banners_delta';
  readonly seat: number;
  readonly from: number;
  readonly to: number;
}

/** A seat's hand size changed. */
export interface HandDeltaMove {
  readonly type: 'hand_delta';
  readonly seat: number;
  readonly from: number;
  readonly to: number;
}

/** A seat committed a pledge this tick. */
export interface PledgeMove {
  readonly type: 'pledge';
  readonly seat: number;
  readonly amount: number;
}

/** The Shadowking telegraphed (or re-telegraphed) its intent. */
export interface TelegraphMove {
  readonly type: 'telegraph';
  readonly effect: string;
  readonly targetNode: string;
  readonly doomCost: number;
}

/** A Shadowking force appeared on / moved to a node. */
export interface DarkForceMove {
  readonly type: 'dark_force';
  readonly forceId: string;
  readonly forceType: ShadowkingForceType;
  /** Previous node, or null when the force is newly placed. */
  readonly from: string | null;
  readonly to: string;
}

/** The phase advanced within the round. */
export interface PhaseAdvanceMove {
  readonly type: 'phase_advance';
  readonly from: string;
  readonly to: string;
}

/** A new round began. */
export interface RoundAdvanceMove {
  readonly type: 'round_advance';
  readonly from: number;
  readonly to: number;
}

/** The escalation act advanced. */
export interface ActAdvanceMove {
  readonly type: 'act_advance';
  readonly from: string;
  readonly to: string;
}

/** The Crown moved to a different seat (or was lost). */
export interface CrownChangeMove {
  readonly type: 'crown_change';
  readonly from: number | null;
  readonly to: number | null;
}

/** Two seats forged an Oath. */
export interface OathSwornMove {
  readonly type: 'oath_sworn';
  readonly seatA: number;
  readonly seatB: number;
}

/** A seat broke an Oath (became an oathbreaker). */
export interface OathBrokenMove {
  readonly type: 'oath_broken';
  readonly breaker: number;
}

/** An accusation was opened (Blood Pact). */
export interface AccusationOpenedMove {
  readonly type: 'accusation_opened';
  readonly accuser: number;
  readonly accused: number;
}

/** An open accusation resolved. */
export interface AccusationResolvedMove {
  readonly type: 'accusation_resolved';
  readonly accused: number;
  readonly convicted: boolean;
}

/** The Blood Pact holder was exposed. */
export interface BloodPactExposedMove {
  readonly type: 'bloodpact_exposed';
}

/** The dark's heart spawned at the Reckoning crossing. */
export interface HeartSpawnMove {
  readonly type: 'heart_spawn';
  readonly node: string;
  readonly hp: number;
}

/** The heart took damage from an assault. */
export interface HeartAssaultMove {
  readonly type: 'heart_assault';
  readonly node: string;
  readonly from: number;
  readonly to: number;
}

/** The dark was defeated (the heart fell). */
export interface DarkDefeatedMove {
  readonly type: 'dark_defeated';
}

/** An eliminated Warlord joined the dark as a Wraith. */
export interface WraithJoinedMove {
  readonly type: 'wraith_joined';
  readonly seat: number;
}

/** A Warlord was eliminated. */
export interface EliminationMove {
  readonly type: 'elimination';
  readonly seat: number;
}

/** The game ended. */
export interface GameEndMove {
  readonly type: 'game_end';
  readonly reason: GameEndReason;
  readonly winner: number | null;
}

/** The discriminated union of every presentation Move. */
export type Move =
  | PieceMoveMove
  | PieceRecruitedMove
  | CaptureMove
  | RansomMove
  | RoutMove
  | TokenRevealMove
  | NodeClaimedMove
  | NodeBlightedMove
  | NodeAshedMove
  | BannersDeltaMove
  | HandDeltaMove
  | PledgeMove
  | TelegraphMove
  | DarkForceMove
  | PhaseAdvanceMove
  | RoundAdvanceMove
  | ActAdvanceMove
  | CrownChangeMove
  | OathSwornMove
  | OathBrokenMove
  | AccusationOpenedMove
  | AccusationResolvedMove
  | BloodPactExposedMove
  | HeartSpawnMove
  | HeartAssaultMove
  | DarkDefeatedMove
  | WraithJoinedMove
  | EliminationMove
  | GameEndMove;

/** The discriminant of `Move`. */
export type MoveType = Move['type'];

/**
 * The Move types that carry a HAND delta (T-302). This is the single registration point for
 * hand-carrying move types: `hand-anim.ts` keys its preset registry on it with an explicit
 * `Record<HandDeltaMoveType, …>`, so adding a type here without a preset is a `tsc` error.
 */
export type HandDeltaMoveType = Extract<MoveType, 'hand_delta'>;

// ─── Exhaustive per-command expectation table (compile-time gate) ──

/** The set of command discriminants — derived (no `CommandType` alias is exported by `src/v3`). */
export type CommandType = Command['type'];

/**
 * Which move kinds a given command may legally produce. The **explicit** `Record<CommandType, …>`
 * annotation is the compile-time gate: every command discriminant is a REQUIRED key, so deleting
 * one (or adding a new v3 command without a mapping here) is a `tsc` error. The lists are
 * SUPERSETS used by tests to assert every emitted move is allowed for the command that produced
 * it — err on the side of listing more.
 */
export const MOVE_EXPECTATIONS: Record<CommandType, readonly MoveType[]> = {
  ADVANCE_PHASE: [
    'phase_advance',
    'round_advance',
    'act_advance',
    'telegraph',
    'pledge',
    // Dawn resolution relocates court pieces (a rout sends a piece home), so a phase advance can
    // legitimately emit piece moves. Added T-239: the T-102 coverage pool was widened and caught
    // this trajectory, which the original two fixed-seed games never reached.
    'piece_move',
    'banners_delta',
    'hand_delta',
    'crown_change',
    'node_claimed',
    'node_blighted',
    'node_ashed',
    'dark_force',
    'elimination',
    'wraith_joined',
    'heart_spawn',
    'rout',
    'ransom',
    'capture',
    'dark_defeated',
    'accusation_resolved',
    'oath_sworn',
    'game_end',
  ],
  SUBMIT_PLEDGE: ['pledge', 'hand_delta', 'banners_delta'],
  PLAYER_ACTION: [
    'piece_move',
    'piece_recruited',
    'capture',
    'ransom',
    'rout',
    'token_reveal',
    'node_claimed',
    'node_blighted',
    'node_ashed',
    'banners_delta',
    'hand_delta',
    'dark_force',
    'crown_change',
    'oath_sworn',
    'oath_broken',
    'telegraph',
    'heart_assault',
    'heart_spawn',
    'dark_defeated',
    'elimination',
    'game_end',
  ],
  LAST_STAND_COMMIT: ['hand_delta', 'capture', 'rout', 'node_claimed', 'elimination', 'game_end'],
  INITIATE_ACCUSATION: ['accusation_opened'],
  // Exposing the traitor applies ACCUSATION_PUSHBACK to the worst frontier node (blood-pact.ts),
  // which changes that node's blight level — so a resolved vote can emit `node_blighted` too.
  // Added T-239 (same widened-coverage catch as ADVANCE_PHASE's `piece_move` above).
  ACCUSATION_VOTE: ['accusation_resolved', 'bloodpact_exposed', 'node_blighted'],
  SET_BEQUEST: [],
  SET_WRAITH_INPUT: [],
};

/**
 * Which move kinds a given ACTION-phase player action may legally produce. Same explicit-`Record`
 * gate as `MOVE_EXPECTATIONS`: dropping an `ActionType` key fails `tsc`.
 */
export const PLAYER_ACTION_EXPECTATIONS: Record<ActionType, readonly MoveType[]> = {
  MARCH: ['piece_move', 'banners_delta'],
  CLAIM: [
    'node_claimed',
    'token_reveal',
    'piece_recruited',
    'banners_delta',
    'dark_force',
    'node_blighted',
  ],
  RAID: ['capture', 'rout', 'node_claimed', 'hand_delta', 'piece_move', 'elimination', 'game_end'],
  STRIKE: ['dark_force', 'hand_delta', 'piece_recruited', 'node_blighted'],
  RANSOM: ['ransom', 'hand_delta', 'banners_delta', 'oath_sworn'],
  ASSAULT_HEART: ['heart_assault', 'hand_delta', 'dark_defeated', 'game_end'],
  RECRUIT: ['piece_recruited', 'banners_delta'],
  AUDIT: ['hand_delta'],
  SWEAR_OATH: ['oath_sworn'],
  BREAK_OATH: ['oath_broken', 'banners_delta'],
  PARLEY: ['telegraph', 'node_blighted'],
  PASS: [],
};

// ─── diffObservable ───────────────────────────────────────────────

interface BoardPieceInfo {
  readonly node: string;
  readonly owner: number;
  readonly archetype: Archetype;
}

interface DarkForceInfo {
  readonly node: string;
  readonly forceType: ShadowkingForceType;
}

interface CourtInfo {
  readonly owner: number;
  readonly routedReturnRound: number | null;
}

/** Map every on-board player piece id → its node/owner/archetype. */
function boardPieces(obs: ObservableState): Map<string, BoardPieceInfo> {
  const out = new Map<string, BoardPieceInfo>();
  const nodes = obs.board.state.nodes;
  for (const id of Object.keys(nodes)) {
    for (const p of nodes[id].pieces) {
      out.set(p.id, { node: id, owner: p.owner, archetype: p.type });
    }
  }
  return out;
}

/** Map every on-board Shadowking force id → its node/type. */
function darkForces(obs: ObservableState): Map<string, DarkForceInfo> {
  const out = new Map<string, DarkForceInfo>();
  const nodes = obs.board.state.nodes;
  for (const id of Object.keys(nodes)) {
    for (const f of nodes[id].shadowkingForces) {
      out.set(f.id, { node: id, forceType: f.type });
    }
  }
  return out;
}

/** Map every court piece id → owner seat + rout state. */
function courtPieces(obs: ObservableState): Map<string, CourtInfo> {
  const out = new Map<string, CourtInfo>();
  for (const player of obs.players) {
    for (const c of player.court) {
      out.set(c.id, { owner: player.index, routedReturnRound: c.routedReturnRound });
    }
  }
  return out;
}

/** Sorted union of node ids across both projections (board is fixed, but be robust). */
function sortedNodeIds(prev: ObservableState, next: ObservableState): string[] {
  const ids = new Set<string>([
    ...Object.keys(prev.board.state.nodes),
    ...Object.keys(next.board.state.nodes),
  ]);
  return [...ids].sort();
}

/**
 * Derive the presentation Move stream for one tick from two `observableState` projections of
 * the SAME `viewerSeat`. Pure, leak-safe, deterministic canonical order. `diff(a, a) === []`.
 */
export function diffObservable(prevObs: ObservableState, nextObs: ObservableState): Move[] {
  const moves: Move[] = [];

  // ── Region A: temporal advances ──────────────────────────────────
  if (prevObs.round !== nextObs.round) {
    moves.push({ type: 'round_advance', from: prevObs.round, to: nextObs.round });
  }
  if (prevObs.act !== nextObs.act) {
    moves.push({ type: 'act_advance', from: prevObs.act, to: nextObs.act });
  }
  if (prevObs.phase !== nextObs.phase) {
    moves.push({ type: 'phase_advance', from: prevObs.phase, to: nextObs.phase });
  }

  // ── Region B: per-seat deltas (seat index order) ─────────────────
  const seatCount = Math.max(prevObs.players.length, nextObs.players.length);
  for (let seat = 0; seat < seatCount; seat++) {
    const p = prevObs.players[seat];
    const n = nextObs.players[seat];
    if (p === undefined || n === undefined) continue;

    if (p.banners !== n.banners) {
      moves.push({ type: 'banners_delta', seat, from: p.banners, to: n.banners });
    }
    if (p.hand.length !== n.hand.length) {
      moves.push({ type: 'hand_delta', seat, from: p.hand.length, to: n.hand.length });
    }
    if (!p.isEliminated && n.isEliminated) {
      moves.push({ type: 'elimination', seat });
    }
    // `oathbreaker` is a monotone false→true marker set only by BREAK_OATH — the one
    // unambiguous structural signal that distinguishes a BREAK from a maturity dissolve.
    if (!p.oathbreaker && n.oathbreaker) {
      moves.push({ type: 'oath_broken', breaker: seat });
    }
  }

  // ── Region C: rout (court, sorted by piece id) ───────────────────
  const prevCourt = courtPieces(prevObs);
  const nextCourt = courtPieces(nextObs);
  for (const pieceId of [...nextCourt.keys()].sort()) {
    const before = prevCourt.get(pieceId);
    const after = nextCourt.get(pieceId);
    if (after === undefined) continue;
    if (before !== undefined && before.routedReturnRound === null && after.routedReturnRound !== null) {
      moves.push({ type: 'rout', pieceId, owner: after.owner });
    }
  }

  // ── Region D: pledges, oaths, crown, wraiths ─────────────────────
  if (nextObs.pledgeBuffer.length > prevObs.pledgeBuffer.length) {
    for (let i = prevObs.pledgeBuffer.length; i < nextObs.pledgeBuffer.length; i++) {
      const e = nextObs.pledgeBuffer[i];
      moves.push({ type: 'pledge', seat: e.playerIndex, amount: e.amount });
    }
  }

  const prevOathKeys = new Set(prevObs.oaths.map(o => `${o.a}:${o.b}`));
  const newOaths = nextObs.oaths
    .filter(o => !prevOathKeys.has(`${o.a}:${o.b}`))
    .sort((x, y) => x.a - y.a || x.b - y.b);
  for (const o of newOaths) {
    moves.push({ type: 'oath_sworn', seatA: o.a, seatB: o.b });
  }

  if (prevObs.crownHolder !== nextObs.crownHolder) {
    moves.push({ type: 'crown_change', from: prevObs.crownHolder, to: nextObs.crownHolder });
  }

  const prevWraithSeats = new Set(prevObs.shadowking.wraiths.map(w => w.seat));
  const newWraithSeats = nextObs.shadowking.wraiths
    .map(w => w.seat)
    .filter(s => !prevWraithSeats.has(s))
    .sort((a, b) => a - b);
  for (const seat of newWraithSeats) {
    moves.push({ type: 'wraith_joined', seat });
  }

  // ── Region E: per-node deltas (sorted node id order) ─────────────
  const prevBoard = boardPieces(prevObs);
  const nextBoard = boardPieces(nextObs);
  const prevDark = darkForces(prevObs);
  const nextDark = darkForces(nextObs);
  const prevCourtIds = new Set(prevCourt.keys());

  for (const id of sortedNodeIds(prevObs, nextObs)) {
    const pn: ObservableNodeState | undefined = prevObs.board.state.nodes[id];
    const nn: ObservableNodeState | undefined = nextObs.board.state.nodes[id];
    if (pn === undefined || nn === undefined) continue;

    if (pn.owner !== nn.owner && nn.owner !== null) {
      moves.push({ type: 'node_claimed', node: id, owner: nn.owner });
    }
    if (pn.blightLevel !== nn.blightLevel) {
      moves.push({ type: 'node_blighted', node: id, from: pn.blightLevel, to: nn.blightLevel });
    }
    if (!pn.ashed && nn.ashed) {
      moves.push({ type: 'node_ashed', node: id });
    }

    // Token reveal — ONLY when a face-down token flips face-up in `next`. A face-down token
    // exposes nothing but its (public) sigil; the hidden `kind`/`archetype` are read solely
    // from the now-flipped token, which is already fully public content (§7 D2).
    const pt = pn.hiddenToken;
    const nt = nn.hiddenToken;
    if (nt !== null && nt.flipped && (pt === null || !pt.flipped)) {
      moves.push({
        type: 'token_reveal',
        node: id,
        sigil: nt.sigil,
        kind: nt.kind,
        archetype: nt.archetype,
      });
    }
  }

  // Board-piece adds (recruits) and moves — keyed by piece id, sorted.
  for (const pieceId of [...nextBoard.keys()].sort()) {
    const before = prevBoard.get(pieceId);
    const after = nextBoard.get(pieceId);
    if (after === undefined) continue;
    if (before === undefined) {
      // New ON-BOARD piece. A piece id already known to the court (returning from rout/
      // capture) is not a recruit — only a brand-new court entry is.
      if (!prevCourtIds.has(pieceId)) {
        moves.push({
          type: 'piece_recruited',
          pieceId,
          owner: after.owner,
          archetype: after.archetype,
          node: after.node,
        });
      }
    } else if (before.node !== after.node) {
      moves.push({
        type: 'piece_move',
        pieceId,
        owner: after.owner,
        from: before.node,
        to: after.node,
      });
    }
  }

  // Dark forces — adds + moves, keyed by force id, sorted.
  for (const forceId of [...nextDark.keys()].sort()) {
    const before = prevDark.get(forceId);
    const after = nextDark.get(forceId);
    if (after === undefined) continue;
    if (before === undefined) {
      moves.push({
        type: 'dark_force',
        forceId,
        forceType: after.forceType,
        from: null,
        to: after.node,
      });
    } else if (before.node !== after.node) {
      moves.push({
        type: 'dark_force',
        forceId,
        forceType: after.forceType,
        from: before.node,
        to: after.node,
      });
    }
  }

  // ── Region F: captives, accusation, heart, telegraph ─────────────
  const prevCaptives = new Set(prevObs.captives.map(c => c.pieceId));
  const nextCaptives = new Set(nextObs.captives.map(c => c.pieceId));
  for (const c of [...nextObs.captives].sort((x, y) => x.pieceId.localeCompare(y.pieceId))) {
    if (!prevCaptives.has(c.pieceId)) {
      // Where the piece stood when taken — read from the prev board projection.
      const node = prevBoard.get(c.pieceId)?.node ?? '';
      moves.push({
        type: 'capture',
        pieceId: c.pieceId,
        ownerSeat: c.ownerSeat,
        captorSeat: c.captorSeat,
        node,
      });
    }
  }
  for (const c of [...prevObs.captives].sort((x, y) => x.pieceId.localeCompare(y.pieceId))) {
    if (!nextCaptives.has(c.pieceId)) {
      moves.push({ type: 'ransom', pieceId: c.pieceId, ownerSeat: c.ownerSeat });
    }
  }

  // Accusation lifecycle.
  const pa = prevObs.accusationState;
  const na = nextObs.accusationState;
  const prevOpen = pa !== null && !pa.resolved;
  if (pa === null && na !== null) {
    moves.push({ type: 'accusation_opened', accuser: na.accuser, accused: na.accused });
  }
  if (prevOpen && (na === null || na.resolved)) {
    const settled = na ?? pa;
    if (settled !== null) {
      moves.push({
        type: 'accusation_resolved',
        accused: settled.accused,
        convicted: (na?.outcome ?? pa?.outcome) === 'correct',
      });
    }
  }
  if (!prevObs.bloodPactExposed && nextObs.bloodPactExposed) {
    moves.push({ type: 'bloodpact_exposed' });
  }

  // Heart lifecycle.
  const ph = prevObs.shadowking.heart;
  const nh = nextObs.shadowking.heart;
  if (ph === null && nh !== null) {
    moves.push({ type: 'heart_spawn', node: nh.nodeId, hp: nh.hp });
  } else if (ph !== null && nh !== null && nh.hp < ph.hp) {
    moves.push({ type: 'heart_assault', node: nh.nodeId, from: ph.hp, to: nh.hp });
  }
  if (!prevObs.shadowking.darkDefeated && nextObs.shadowking.darkDefeated) {
    moves.push({ type: 'dark_defeated' });
  }

  // Telegraph (set or re-aimed) — compare the public intent fields.
  const ptel = prevObs.shadowking.telegraph;
  const ntel = nextObs.shadowking.telegraph;
  if (ntel !== null) {
    const changed =
      ptel === null ||
      ptel.effect !== ntel.effect ||
      ptel.targetNodeId !== ntel.targetNodeId ||
      ptel.doomCost !== ntel.doomCost;
    if (changed) {
      moves.push({
        type: 'telegraph',
        effect: ntel.effect,
        targetNode: ntel.targetNodeId,
        doomCost: ntel.doomCost,
      });
    }
  }

  // ── Region G: terminal ───────────────────────────────────────────
  if (prevObs.gameEndReason === null && nextObs.gameEndReason !== null) {
    moves.push({ type: 'game_end', reason: nextObs.gameEndReason, winner: nextObs.winner });
  }

  return moves;
}
