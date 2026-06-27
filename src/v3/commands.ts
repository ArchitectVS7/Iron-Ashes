/**
 * Commands — the discriminated union of all inputs the reducer accepts.
 *
 * Every mutation to GameState is expressed as a Command dispatched
 * through applyCommand. No direct state mutation anywhere.
 *
 * Extensible: Stage 3b adds mechanic-specific command variants;
 * Stage 3d adds Blood Pact commands.
 */

// ─── Player Actions (ACTION phase) ───────────────────────────────

/** The set of actions a player can take during the ACTION phase. */
export type ActionType =
  | 'MARCH'     // Move a piece 1 node (cost 1 banner)
  | 'CLAIM'     // Claim current unclaimed Holding/Forge (cost 1 banner)
  | 'RAID'      // Initiate combat vs a co-located rival (§5.3)
  | 'STRIKE'    // Initiate combat vs a co-located Shadowking force (§5.3)
  | 'RECRUIT'   // Recruit a court piece (§2 archetypes; Herald stance today)
  | 'AUDIT'     // Reveal one opponent's last pledge (Blood Pact only, §10)
  | 'SWEAR_OATH' // Forge a public pact with a rival (§ Oaths) — free, no action point
  | 'BREAK_OATH' // Betray a sworn ally for a burst; climb the dark's Ledger (§ Oaths)
  | 'PARLEY'    // Herald pushes back the dark without spending a card (§ Herald)
  | 'PASS';     // End actions early

/** A player action with its parameters. */
export interface PlayerAction {
  /** The action type. */
  readonly type: ActionType;
  /** Target node for movement (MARCH). */
  readonly targetNodeId?: string;
  /** Target player for RAID / AUDIT / accusation. */
  readonly targetPlayerIndex?: number;
  /** Piece ID to move/recruit. */
  readonly pieceId?: string;
}

// ─── Command Union ────────────────────────────────────────────────

/** All commands the reducer can process. */
export type Command =
  | AdvancePhaseCommand
  | SubmitPledgeCommand
  | PlayerActionCommand
  | LastStandCommitCommand
  | InitiateAccusationCommand
  | AccusationVoteCommand;

/** Advance to the next phase (or next round at Dawn → Threat). */
export interface AdvancePhaseCommand {
  readonly type: 'ADVANCE_PHASE';
}

/** Submit a player's pledge during the PLEDGE phase. */
export interface SubmitPledgeCommand {
  readonly type: 'SUBMIT_PLEDGE';
  readonly playerIndex: number;
  /** Number of cards to pledge (0 to hand.length). */
  readonly amount: number;
}

/** Execute a player action during the ACTION phase. */
export interface PlayerActionCommand {
  readonly type: 'PLAYER_ACTION';
  readonly playerIndex: number;
  readonly action: PlayerAction;
}

/** Commit additional cards for a Last Stand during combat resolution. */
export interface LastStandCommitCommand {
  readonly type: 'LAST_STAND_COMMIT';
  readonly playerIndex: number;
  /** Number of additional cards to commit. */
  readonly cardCount: number;
}

/** Open an accusation against a suspected Blood Pact holder (§10, Blood Pact only). */
export interface InitiateAccusationCommand {
  readonly type: 'INITIATE_ACCUSATION';
  readonly accuserIndex: number;
  readonly accusedIndex: number;
}

/** Cast a vote on the open accusation (§10). All required voters must agree to convict. */
export interface AccusationVoteCommand {
  readonly type: 'ACCUSATION_VOTE';
  readonly playerIndex: number;
  readonly agree: boolean;
}
