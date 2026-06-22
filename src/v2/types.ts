/**
 * v2 Type System — the complete state shape for the redesigned engine.
 *
 * Built from ALGORITHM §2. Every runtime type the engine uses lives here.
 * No v1 types are imported — this is a clean-slate type layer.
 *
 * Determinism contract (§7): GameState is the single source of truth.
 * Same (playerCount, mode, seed, [scripted inputs]) ⇒ identical GameState.
 */

// ─── Phase & Mode ─────────────────────────────────────────────────

/** The four phases of a round, in fixed order. */
export type GamePhase = 'THREAT' | 'PLEDGE' | 'ACTION' | 'DAWN';

/** Game modes — Layer A (competitive) or Layer B (blood_pact). */
export type GameMode = 'competitive' | 'blood_pact';

/** Escalation acts — the noose tightens visibly (§5.5). */
export type Act = 'WHISPER' | 'MARCH' | 'RECKONING';

// ─── Board ────────────────────────────────────────────────────────

/** The structural tier of a node on the Closing Ring. */
export type NodeTier = 'keystone' | 'approach' | 'forge' | 'keep' | 'holding';

/** Which quadrant a node belongs to (0 = N, 1 = E, 2 = S, 3 = W). null = center (Keystone). */
export type Quadrant = 0 | 1 | 2 | 3 | null;

/** A node in the fixed board definition (immutable during play). */
export interface V2NodeDef {
  /** Unique string identifier. */
  readonly id: string;
  /** Structural tier determines behavior, income, and Blight rules. */
  readonly tier: NodeTier;
  /** Quadrant assignment for steered-front targeting. null for Keystone. */
  readonly quadrant: Quadrant;
  /** IDs of directly connected nodes (adjacency list). */
  readonly connections: readonly string[];
  /** Per-round income this node generates for its owner. */
  readonly income: number;
}

/** The fixed board graph — a 17-node Closing Ring (§2). */
export interface V2BoardDef {
  /** All node definitions keyed by ID. */
  readonly nodes: Readonly<Record<string, V2NodeDef>>;
  /** The center node ID. */
  readonly keystoneId: string;
  /** The 4 inner-ring chokepoint IDs. */
  readonly approachIds: readonly string[];
  /** The 4 mid-belt high-value IDs. */
  readonly forgeIds: readonly string[];
  /** The 4 outer-corner home IDs, indexed by quadrant (0-3 = N/E/S/W). */
  readonly keepIds: readonly [string, string, string, string];
  /** The 4 outer-edge claimable IDs. */
  readonly holdingIds: readonly string[];
  /** The 4 symmetric outer seams where Blight enters the map. */
  readonly blightEntrySeams: readonly string[];
}

/** Runtime state of a single node (mutable during play). */
export interface V2NodeState {
  /** Player index that owns/claimed this node, or null. */
  owner: number | null;
  /** Whether this node is permanently ashed (gone for the game). */
  ashed: boolean;
  /** How close to ashing (0 = clean, BLIGHT_TO_ASH = ashed). */
  blightLevel: number;
  /** Player pieces present on this node. */
  pieces: Piece[];
  /** Shadowking forces present on this node. */
  shadowkingForces: ShadowkingForce[];
}

/** Runtime board state — all node states keyed by ID. */
export interface V2BoardState {
  readonly nodes: Record<string, V2NodeState>;
}

// ─── Pieces ───────────────────────────────────────────────────────

/** Player piece types (§2: start minimal). */
export type PieceType = 'warlord' | 'retinue';

/** A player-owned piece on the board. */
export interface Piece {
  /** Unique identifier. */
  readonly id: string;
  /** Piece type. */
  readonly type: PieceType;
  /** Owning player index. */
  readonly owner: number;
  /** Combat power contribution. */
  power: number;
  /** Current node location. */
  nodeId: string;
}

/** Shadowking force types (§2). */
export type ShadowkingForceType = 'death_knight' | 'blight';

/** A Shadowking force on the board. */
export interface ShadowkingForce {
  /** Unique identifier. */
  readonly id: string;
  /** Force type. */
  readonly type: ShadowkingForceType;
  /** Combat power. */
  power: number;
  /** Current node location. */
  nodeId: string;
}

// ─── Player ───────────────────────────────────────────────────────

/** Whether a player is human or AI-controlled. */
export type PlayerType = 'human' | 'ai';

/** Per-player state (§2). */
export interface PlayerState {
  /** Player index (0-based, matches seat). */
  readonly index: number;
  /** Human or AI. */
  readonly type: PlayerType;

  /** Whether this player is in Broken state. */
  isBroken: boolean;
  /** Round number when the player entered Broken (null if not Broken). */
  brokenSince: number | null;
  /** Consecutive rounds spent Broken (for recovery cap / decay). */
  brokenRoundsConsecutive: number;

  /** Card hand — array of card power values. Persists between rounds. */
  hand: number[];
  /** Per-round tactical income — spent on movement/claiming, discarded at Dawn. */
  banners: number;

  /** Whether this player currently holds the Crown (recomputed at Dawn). */
  crownHeld: boolean;
  /** Accumulated wounds toward the Broken threshold. */
  wounds: number;
  /** Actions remaining this turn. */
  actionsRemaining: number;

  /** Node ID of this player's Warlord piece. */
  warlordNodeId: string;

  /** Active binding debt owed to a rescuer (§5.4), or null. */
  rescueDebt: RescueDebt | null;

  // ── Blood Pact (Layer B) ──
  /** Whether this player holds the Blood Pact (traitor). */
  hasBloodPact: boolean;
}

// ─── Shadowking ───────────────────────────────────────────────────

/** The Shadowking's telegraphed intent for this round (§4.1). */
export interface ShadowkingTelegraph {
  /** The effect type the villain will execute. */
  readonly effect: string;
  /** The target node ID. */
  readonly targetNodeId: string;
  /** Card threshold the table must collectively meet in the Pledge. */
  readonly doomCost: number;
  /** Player index being struck/named (null if area effect). */
  readonly struckPlayerIndex: number | null;
  /** Quadrant the steered front is aimed at. */
  readonly steerQuadrant: number;
  /** The villain's first-person line (for UI/log). */
  readonly firstPersonLine: string;
}

/** Shadowking aggregate state (§2, §5.6). */
export interface ShadowkingState {
  /** All Shadowking forces on the board. */
  forces: ShadowkingForce[];
  /** The current round's telegraphed intent (set during THREAT, null before first round). */
  telegraph: ShadowkingTelegraph | null;
  /** Per-player grudge weight (decays each round, capped). */
  grudge: number[];
  /** Patience ratchet — rises when the table blocks; triggers escalation when full. */
  patience: number;
}

// ─── Pledge ───────────────────────────────────────────────────────

/** Pledge tier classification for the Suspicion Log (§10). */
export type PledgeTier = 'high' | 'medium' | 'low' | 'none';

/** A single player's pledge entry for a round. */
export interface PledgeEntry {
  /** Player index. */
  readonly playerIndex: number;
  /** Number of cards pledged. */
  readonly amount: number;
  /** Classified tier for Suspicion Log. */
  readonly tier: PledgeTier;
}

// ─── Rescue debt (§5.4) ───────────────────────────────────────────

/** The binding one-round obligation a rescued Warlord owes their rescuer (§5.4). */
export interface RescueDebt {
  /** The rescuer this debt is owed to. */
  readonly creditor: number;
  /** Forced minimum Pledge the debtor must make (enforced in open modes). */
  readonly forcedMinPledge: number;
  /** Round (inclusive) through which the debt binds; cleared at that round's Dawn. */
  readonly expiresRound: number;
}

// ─── Blood Pact / Accusation (Layer B, §10) ──────────────────────

/** One player's vote in an active accusation. */
export interface AccusationVote {
  /** The voting player's index. */
  readonly playerIndex: number;
  /** Whether they back the accusation. */
  readonly agree: boolean;
}

/** How an accusation resolved (§10). */
export type AccusationOutcome = 'correct' | 'wrong' | 'fizzled';

/** A live accusation against a suspected traitor (§10). */
export interface AccusationState {
  /** Player who opened the accusation (auto-agrees). */
  readonly accuser: number;
  /** Player being accused of holding the Blood Pact. */
  readonly accused: number;
  /** Round the accusation was opened. */
  readonly round: number;
  /** Votes collected so far (accuser pre-included as agree). */
  votes: AccusationVote[];
  /** Whether resolution has run. */
  resolved: boolean;
  /** The resolved outcome, or null while pending. */
  outcome: AccusationOutcome | null;
}

/** A single Audit reveal — the auditor learned a target's last pledge (§10). */
export interface AuditEntry {
  /** Round the Audit was performed. */
  readonly round: number;
  /** Player who paid for the Audit. */
  readonly auditor: number;
  /** Player whose last pledge was revealed. */
  readonly target: number;
  /** The revealed pledge amount. */
  readonly amount: number;
  /** The revealed pledge tier. */
  readonly tier: PledgeTier;
}

// ─── Victory / Loss ───────────────────────────────────────────────

/** How the game ended (§6). */
export type GameEndReason =
  | 'territory_victory'
  | 'gambit_victory'
  | 'doom_complete'
  | 'all_broken'
  | null;

// ─── Gambit ───────────────────────────────────────────────────────

/** Tracks a live Crown's Gambit attempt (§6). */
export interface GambitState {
  /** Player index who seized the Keystone. */
  readonly claimant: number;
  /** Round the Gambit was declared (held Keystone at Dawn). */
  readonly declaredRound: number;
  /** Whether the dark has named the claimant this round. */
  named: boolean;
}

// ─── Action Log Events ────────────────────────────────────────────
// (imported from events.ts — forward declaration for GameState)

import type { GameEvent } from './events.js';

// ─── Top-Level GameState ──────────────────────────────────────────

/**
 * The complete game state — the single source of truth.
 *
 * Same (playerCount, mode, seed, [scripted inputs]) ⇒ identical GameState.
 * All systems read from this; all mutations go through applyCommand.
 */
export interface GameState {
  /** The random seed for this session. */
  readonly seed: number;
  /** Current round number (1-based). */
  round: number;
  /** Current escalation act. */
  act: Act;
  /** Current phase within the round. */
  phase: GamePhase;

  /** All players (2-4). */
  players: PlayerState[];

  /** The board — fixed definition + mutable state. */
  board: {
    readonly definition: V2BoardDef;
    state: V2BoardState;
  };

  /** Shadowking aggregate state. */
  shadowking: ShadowkingState;

  /** Player index currently holding the Crown (recomputed at Dawn). null before first computation. */
  crownHolder: number | null;

  /** Current-round pledge entries (collected during PLEDGE phase). */
  pledgeBuffer: PledgeEntry[];
  /** Retained per-round pledge history — feeds Suspicion Log & Audit (§10). */
  pledgeHistory: PledgeEntry[][];

  /** Index of the player whose action turn it is (during ACTION phase). */
  activePlayerIndex: number;
  /** Fixed turn order for the session (set at setup, never changes). */
  readonly turnOrder: readonly number[];
  /** Index into turnOrder for tracking whose turn it is within ACTION. */
  turnOrderPosition: number;

  /** How the game ended, or null if still in progress. */
  gameEndReason: GameEndReason;
  /** Index of the winning player, or null. */
  winner: number | null;

  /** Active Gambit state, or null if no Gambit is live. */
  gambit: GambitState | null;

  // ── Blood Pact (Layer B) ──
  /** Player index holding the Blood Pact, or null (Layer A). */
  bloodPactHolder: number | null;
  /** Whether the traitor has been correctly accused (forfeits the doom_complete win). */
  bloodPactExposed: boolean;
  /** Suspicion Log — recent per-round pledge tiers (Layer B only, bounded, §10). */
  suspicionLog: PledgeEntry[][];
  /** Live accusation, or null when none is open (Layer B only, §10). */
  accusationState: AccusationState | null;
  /** Round number until which new accusations are locked out (anti-spam, §10). */
  accusationLockoutUntilRound: number;
  /** Persistent record of Audit reveals (Layer B only, §10). */
  auditLog: AuditEntry[];

  /** The event stream the UI renders from / post-game reviews. */
  actionLog: GameEvent[];

  /** The game mode for this session. */
  readonly mode: GameMode;
}
