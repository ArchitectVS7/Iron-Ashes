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

/**
 * Difficulty tiers (Stage D1) — a DARK-STRENGTH setting scaling the dark via the DOOM_COST curve.
 * A descending martial-rank ladder (harder → easier): `warlord` (HARD, DEFAULT — the locked
 * reference, byte-identical to the current build), `knight` (NORMAL), `squire` (EASY). See
 * `difficulty.ts` for the calibrated per-tier doomCost overrides + the flawless-play tier table.
 */
export type Difficulty = 'warlord' | 'knight' | 'squire';

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
  /**
   * The Discovery token (§5.1) — ENGINE-ONLY hidden state. Pre-bound at setup on every
   * neutral Holding as `f(seed, nodeId)` (§7 D1/D9), frozen here, revealed (never re-drawn)
   * by a CLAIM flip (§12 #19). `null` for nodes that never carried a token (Keeps/Forges/
   * Approaches/Keystone). Deciders must NEVER read the content — only the back-sigil — and
   * receive it via `observableState` (§7 D2), which redacts unflipped content.
   */
  hiddenToken: HiddenToken | null;
}

// ─── Discovery tokens (§5.1, §7 D1/D2/D9) ─────────────────────────

/** The three things a face-down Discovery token can contain (§5.1). */
export type TokenKind = 'recruit' | 'blight_seed' | 'death_knight';

/**
 * The pre-flip back-sigil — the ONLY observable derived from token content (§13 P0-12).
 * `g(content)` has an exhaustively specified codomain `{ bright, dark }`: a partial telegraph
 * that hints reward-vs-risk without revealing the exact payload, so CLAIM is press-your-luck.
 *   bright — a recruit waits (safe upside).
 *   dark   — a risk waits: either a Blight-seed (fightable, with a bonus) or a Death-Knight
 *            (the ambiguity is the whole point — see `backSigil`).
 */
export type BackSigil = 'bright' | 'dark';

/**
 * A pre-bound Discovery token (§5.1). Bound at setup from the namespaced sub-stream
 * `SeededRandom(hash(seed, nodeId))` (§7 D9) and frozen. A flip sets `flipped = true` and
 * resolves the effect from this frozen content — never a lazy live-stream draw (§7 D1), so
 * the layout is claim-order-independent and not save-scummable.
 */
export interface HiddenToken {
  /** What this token resolves to on flip. */
  readonly kind: TokenKind;
  /** The partial telegraph `sigil = g(kind)` — the sole observable (§13 P0-12, §7 D2). */
  readonly sigil: BackSigil;
  /** Recruit only: the discovered retainer's archetype (Marshal/Steward). null otherwise. */
  readonly archetype: Archetype | null;
  /** Recruit only: the retainer's seeded name. null otherwise. */
  readonly retainerName: string | null;
  /**
   * Blight-seed only: the bonus recruit pre-bound under the SAME node key (§7 D9), granted
   * when the seed's fightable threat is cleared (STRIKE). null for other kinds.
   */
  readonly bonusArchetype: Archetype | null;
  /** Blight-seed only: the bonus retainer's seeded name. null otherwise. */
  readonly bonusName: string | null;
  /** Whether this token has been flipped (revealed). Bound `false`; a CLAIM flips it. */
  flipped: boolean;
  /** Blight-seed only: whether the cleared-threat bonus recruit has been granted. */
  bonusClaimed: boolean;
}

/** Runtime board state — all node states keyed by ID. */
export interface V2BoardState {
  readonly nodes: Record<string, V2NodeState>;
}

// ─── Pieces ───────────────────────────────────────────────────────

/**
 * Court archetypes (§2). Each is a distinct piece with its own power / verb / passive:
 *   warlord — leader (1/player); high power; its deposal = elimination.
 *   marshal — the muscle; high combat; may declare Last Stand.
 *   steward — the economy; low combat; adds Banners at its node each Dawn (STEWARD_INCOME).
 *   herald  — the political reach; low combat; +HERALD_HAND_BONUS hand; PARLEY; never fights.
 */
export type Archetype = 'warlord' | 'marshal' | 'steward' | 'herald';

/** Player board piece types (§2) — the on-board projection of a court archetype. */
export type PieceType = Archetype;

/**
 * A piece in a player's COURT (§2) — the canonical roster entry. The court is the
 * source of truth for who a player commands; on-board combat power reads the mirrored
 * `Piece` on the node. `captiveOf` is the capture-economy placeholder (wired in 3d):
 * null while the piece is free, else the captor's seat (a captive produces nothing).
 */
export interface CourtPiece {
  /** Unique identifier (matches the on-board `Piece.id` while the piece is in play). */
  readonly id: string;
  /** Which archetype this piece is. */
  readonly archetype: Archetype;
  /** Display name (§2 — "names are state"): a Discovery retainer carries its PRE-BOUND seeded
   *  name (§7 D9); a starting Warlord carries its fixed faction name; a Herald carries the
   *  faction's voice. Cosmetic — drives attachment + the UI Hold rail, never mechanics. */
  readonly name: string;
  /** One-line identity flavor (§2) — a PURE function of `name` (`identityFor`, court.ts),
   *  never a live-stream draw (§7 D1/D9). Cosmetic. */
  readonly identity: string;
  /** Node the piece currently sits on. */
  node: string;
  /** Captor's seat while held hostage, or null when free (capture economy, §5.2). A captive
   *  has no on-board mirror, produces nothing, and is not gained by the captor (§2/§12 #7). */
  captiveOf: number | null;
  /** Rout state (P0-1): if non-null, this piece was ROUTED in combat and is OFF-BOARD, due to
   *  return to its owner's nearest stronghold at the named round's Dawn. ROUT is a TEMPO loss,
   *  never removal (§5.2/§13 P0-1). null while the piece is on the board or held captive. */
  routedReturnRound: number | null;
  /** Round until which this piece is capture/rout-IMMUNE (§5.3 recapture immunity). Set when a
   *  piece returns from a rout or is freed by RANSOM; a piece is immune while `round < this`.
   *  0 = no immunity. Kills the recapture grief pump (stress-test E1). */
  recaptureImmuneUntil: number;
}

/**
 * A hostage in the capture economy (§5.2/§5.3, §2 `captives[]`). The authoritative ledger
 * for guard-cap enforcement (§12 #25), captor-death freeing (§12 #6), and ransom. Mirrors
 * the held piece's `CourtPiece.captiveOf`. A captive produces nothing and is never gained by
 * the captor; the Warlord is NEVER directly captured (deposal via zero-strongholds only).
 */
export interface CaptiveRecord {
  /** The captured piece's id (matches its `CourtPiece.id` in the owner's court). */
  readonly pieceId: string;
  /** Seat that owns the captured piece (it returns here when freed). */
  readonly ownerSeat: number;
  /** Seat currently holding the captive (the captor). */
  captorSeat: number;
  /** Round the capture happened. */
  readonly capturedRound: number;
  /** Round until which the freed piece will be capture/rout-immune once ransomed (§5.3). */
  recaptureImmuneUntil: number;
}

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

/**
 * A card sitting in the Shadowking's strike pool (§5.5, §13 P0-4 / §7 D7). Eliminated
 * players' hands feed the pool; it fuels future strikes and is the wraith's ammunition.
 * `id` is a monotonic per-game sequence number: LOWER id ⇒ OLDER. Both the Dawn decay
 * (oldest removed-from-game) and a strike's consumption (lowest-card-id first) operate on
 * the low-id end, so the pool behaves as a deterministic FIFO. `power` feeds Σ(card.power).
 */
export interface StrikePoolCard {
  /** Monotonic insertion sequence — lower = older. Drives decay + consumption order. */
  readonly id: number;
  /** The card's power (the same scale as a hand card). */
  readonly power: number;
}

/**
 * A Wraith — an eliminated Warlord serving the dark in the afterlife (§5.5, §2). Each round
 * it gets ONE bounded input (steer the dark's existing target/grudge, or add a visible strike-
 * pool card), capped by WRAITH_INPUT_CAP. The bounded-input resolution is built in 3f; this
 * record is created at elimination (the afterlife join) and resolved in original-seat order
 * (§12 #24). De-weaponized: it scores on the dark's progress, never a chosen revenge face (P0-8).
 */
export interface Wraith {
  /** The eliminated Warlord's original seat index (the afterlife identity). */
  readonly seat: number;
  /** Round the Warlord was eliminated (joined the dark). */
  readonly eliminatedRound: number;
}

/**
 * The dark's heart (§5.6) — the Kill-the-Dark objective. Spawns as a real on-map node at the
 * Reckoning crossing (built in 3g). Present here so the state shape matches §2; `null` until
 * Reckoning. ASSAULT_HEART commits damage its HP track over telegraphed rounds.
 */
export interface HeartState {
  /** The on-map node the heart occupies (the Reckoning crossing = the Keystone). */
  readonly nodeId: string;
  /** Public HP track (HEART_HP at spawn). */
  hp: number;
  /** Whether the heart is exposed (assaultable). false once broken. */
  exposed: boolean;
  /** Cumulative ASSAULT_HEART commit per seat (§12 #21) — the LARGEST is the raid-leader.
   *  Indexed by seat; bound to 0 for all seats at spawn. JSON-serializable. */
  committedBySeat: number[];
  /** The current raid-leader (largest cumulative committer; ties → lowest seat, §12 #21) — the
   *  seat the dark retaliates against by name and the one penalized post-dark (§13 P0-7). null
   *  until the first assault commit lands. */
  raidLeader: number | null;
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

  /** Whether this Warlord has been eliminated from the game (§5.5/§6). Once true it
   *  spectates (a Wraith in later stages) and is skipped in turn order. */
  isEliminated: boolean;
  /** Round in which this player was eliminated (null while alive). */
  eliminatedRound: number | null;
  /** Whether this Warlord is flagged for deposal (zero living strongholds, or its last
   *  stronghold taken). The flag is set in ACTION; elimination RESOLVES ONLY AT DAWN in
   *  seat order via `resolveDeposals` (§6, determinism §7 D5). */
  deposed: boolean;

  /** Card hand — array of card power values. Persists between rounds. */
  hand: number[];
  /** Per-round tactical income — spent on movement/claiming, discarded at Dawn. */
  banners: number;

  /** Whether this player currently holds the Crown (recomputed at Dawn). */
  crownHeld: boolean;
  /** Actions remaining this turn. */
  actionsRemaining: number;

  /** Node ID of this player's Warlord piece. */
  warlordNodeId: string;

  /** The player's COURT (§2) — every piece they command (Warlord + recruited
   *  Marshal/Steward/Herald). Seeded with the Warlord at setup; grown by Discovery (3c). */
  court: CourtPiece[];

  // ── Herald / political-martial stance (§ Herald, FOCUS-GROUP-R3) ──
  /** Per-player hand cap (init HAND_LIMIT; raised by recruiting a Herald). */
  handLimit: number;
  /** Build identity: 'martial' (default — fat board) vs 'political' (deep hand, weaker fighter). */
  stance: 'martial' | 'political';
  /** Combat-power penalty (the "fighter off the board" cost of the political stance). */
  combatPenalty: number;
  /** Node the player's Herald piece sits on (§HL — the literal lone runner), or null if
   *  martial / no Herald. The Herald MARCHes independently and must REACH the blighted front
   *  to PARLEY; a rival Warlord or Death Knight co-located with it captures it. */
  heraldNodeId: string | null;

  // ── Death-Curse killer tracking (§5.5/§13 P0-9, §12 #26) ──
  /** Seat of the most-recent RIVAL stronghold-stripping action against this player — the
   *  "killer" (§12 #26). null if none, or if the most recent strip was dark-caused. NOT the
   *  Death-Curse target itself (the curse is decoupled from eliminating — §13 P0-9). */
  lastStrippedBy: number | null;
  /** Whether the most-recent stronghold strip against this player was DARK-caused (auto-pressure
   *  / strike). A dark-caused kill redirects the Death-Curse to the living BENEFICIARY (§12 #26). */
  lastStripByDark: boolean;
  /** The node of the most-recent stronghold strip — used to find the BENEFICIARY (nearest living
   *  claimant of the ashed land) when the kill was dark-caused (§12 #26). null if none. */
  lastStrippedNode: string | null;
  /** Whether this player has BROKEN an Oath (§ Oaths) — a standing "oathbreaker" marker the
   *  Death-Curse / dark-steer may target (§13 P0-9). Set by BREAK_OATH; never cleared. */
  oathbreaker: boolean;

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
  /** Extra strike power committed by Wraith card-adds THIS round (§5.5, §12 #24). Mutable, optional
   *  (absent ⇒ 0 — `chooseShadowkingIntent` always seeds it to 0). The THREAT-phase wraith sweep
   *  raises it AFTER the telegraph is computed (one strikePool card per add, consumed from the
   *  pool); the Pledge resolves against `doomCost + this`. */
  wraithStrikeBonus?: number;
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

  /** Cards fed by elimination (§5.5/§13 P0-4) — fuels future strikes + is the wraith's
   *  ammunition. Capped at STRIKEPOOL_CAP; the oldest (lowest id) decays each Dawn. */
  strikePool: StrikePoolCard[];
  /** Monotonic id counter for new strikePool cards (lower id = older — drives FIFO decay
   *  + lowest-card-id-first consumption). Never decremented; JSON-serializable. */
  strikePoolSeq: number;
  /** Eliminated Warlords serving the dark in the afterlife (§5.5). The bounded per-round
   *  input is wired in 3f; the record is created at elimination. */
  wraiths: Wraith[];
  /** The dark's heart (§5.6) — null until it spawns at Reckoning (built in 3g). */
  heart: HeartState | null;
  /**
   * Whether a REAL ASSAULT_HEART hit landed THIS round (§13 P0-5/P0-6). Suppresses the
   * Reckoning auto-pressure (§6) — a stalled/token assault does NOT count. Reset to false at
   * THREAT, set true by a landed ASSAULT_HEART hit in ACTION (§5.6, 3g): a real heart-hit this
   * round + a minimum commit. A stalled/token assault does NOT count.
   */
  heartAssaultLiveThisRound: boolean;

  /** Whether the heart has fallen (§5.6) — the apocalypse clock is REMOVED: no Blight advance,
   *  no strikes, no Reckoning auto-pressure. Set by `resolveHeartCollapse` the Dawn HP hits 0. */
  darkDefeated: boolean;
  /** The single named Dawn (round) the post-dark two-act scramble resolves (§5.6/§12 #18) —
   *  OVERRIDES ROUND_CAP. null until the heart falls. */
  postDarkResolutionRound: number | null;
  /** The raid-leader SHIELDED from deposal the Dawn the dark dies (§12 #17), or null. Read by
   *  `resolveDeposals` only when `heroShieldRound === round` (the shield is one Dawn). */
  heroShieldSeat: number | null;
  /** The round the hero shield applies (§12 #17) — only that single Dawn. null when no shield. */
  heroShieldRound: number | null;
  /** The raid-leader's committed-force home nodes that count UN-PRODUCING for the post-dark
   *  resolution (§13 P0-7) — the spent-force penalty in the win currency (not auto-robbed). */
  unproducingNodes: string[];
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

/**
 * An Oath — a public, breakable two-player pact (§ Oaths). Symmetric (a < b).
 * While active the two cannot RAID each other and earn a Dawn fealty dividend;
 * it matures (dissolves with a loyalty bonus) after OATH_DURATION rounds, or is
 * BROKEN for a banner burst at the cost of climbing the dark's Ledger (grudge).
 */
export interface Oath {
  /** The two sworn players, low seat index first (a < b). */
  readonly a: number;
  readonly b: number;
  /** Round the Oath was sworn. */
  readonly swornRound: number;
  /** Strain accrued — ticks each Dawn; at OATH_DURATION the Oath matures. */
  strain: number;
  /** Whether this Oath was forged by a Death BEQUEST (§5.5, §12 #23). A bequest-oath is EXEMPT
   *  from the eliminated-player oath-dissolve sweep (it is meant to persist posthumously). The
   *  Bequest that sets this is built in 3f; the dissolve hook reads it now. */
  readonly viaBequest?: boolean;
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
  | 'last_standing'   // one living Warlord remains (the new elimination win, §6)
  | 'doom_complete'
  | 'attrition'       // zero living Warlords ⇒ Shadowking wins (the all_broken successor, §6/§12 #2)
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

  /** Active Oaths — public, breakable two-player pacts (§ Oaths). Each player in ≤1. */
  oaths: Oath[];

  /** Hostages in the capture economy (§5.2/§5.3, §2). The authoritative ledger for the
   *  guard cap (§12 #25), captor-death freeing (§12 #6), and RANSOM. Empty in Layer A until
   *  a winning RAID elects CAPTURE_PIECE. */
  captives: CaptiveRecord[];

  /** Cards REMOVED-FROM-GAME (§7 D4/D7): strikePool overflow/decay + consumed strikes leave the
   *  game here (never reshuffled into the live stream — that would reorder draws + break replay).
   *  The conservation invariant |hands| + |strikePool| + |removed| is constant between draws. */
  removed: number[];

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

  /**
   * The difficulty tier for this session (Stage D1) — a DARK-STRENGTH setting applied through the
   * getTunables/withTunables seam as a doomCost-curve override. `warlord` (DEFAULT) is the locked
   * reference (byte-identical to the current build). Part of the determinism key: same
   * `(playerCount, mode, seed, difficulty)` ⇒ an identical game.
   */
  readonly difficulty: Difficulty;

  /**
   * Human-only Death Bequest overrides (§13 P0-11 UI), keyed by the dying seat. When present and
   * still LEGAL for a seat, `decideBequest` returns it instead of the scripted policy — so an
   * eliminated human chooses its own exit beat. Set ONLY by the SET_BEQUEST command (interactive
   * path); the sim/AI NEVER set it, so every headless run stays byte-identical (§7). Optional +
   * JSON-serializable; absent by default.
   */
  pendingBequests?: Record<number, BequestChoiceInput>;

  /**
   * Human-only Wraith input overrides (§13 P0-11 UI), keyed by the wraith's seat: the ONE bounded
   * afterlife input it chooses this round ('nudge' | 'card_add'). `planWraithInputs` consults it for
   * that seat (falling back to 'nudge' when 'card_add' has no ammo); absent ⇒ the scripted decision.
   * Set ONLY by the SET_WRAITH_INPUT command; the sim/AI never set it ⇒ byte-identical replay (§7).
   */
  wraithInputs?: Record<number, WraithInputKind>;
}

/** The ONE bounded input a Wraith may pick (§5.5) — used by the human-override seam. */
export type WraithInputKind = 'nudge' | 'card_add';

/**
 * A human's chosen Death Bequest (§5.5, §13 P0-11 UI) — the structural mirror of elimination.ts's
 * `BequestChoice`, defined here so `GameState` can carry the override without a value-import cycle.
 */
export type BequestChoiceInput =
  | { readonly kind: 'bequeath_captive'; readonly pieceId: string; readonly beneficiary: number }
  | { readonly kind: 'bequeath_cards'; readonly beneficiary: number }
  | { readonly kind: 'death_curse'; readonly target: number | null };
