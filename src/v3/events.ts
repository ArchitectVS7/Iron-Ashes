/**
 * Events — the discriminated union of all outputs the reducer emits.
 *
 * Every meaningful state change produces one or more GameEvents.
 * These form the `actionLog` the UI renders from and post-game reviews.
 *
 * Extensible: Stage 3b adds mechanic-specific event variants;
 * Stage 3d adds Blood Pact events.
 */

import type {
  Act,
  AccusationOutcome,
  GameEndReason,
  GamePhase,
  PledgeTier,
  ShadowkingTelegraph,
  TokenKind,
} from './types.js';
import type { ActionType } from './commands.js';

// ─── Event Union ──────────────────────────────────────────────────

export type GameEvent =
  | PhaseChangedEvent
  | RoundStartedEvent
  | ThreatDeclaredEvent
  | PledgeSubmittedEvent
  | PledgeCommittedEvent
  | PledgeResolvedEvent
  | PlayerActedEvent
  | PlayerEliminatedEvent
  | ActivePlayerChangedEvent
  | CrownChangedEvent
  | ActEscalatedEvent
  | RoundEndedEvent
  | GameOverEvent
  | BlightAdvancedEvent
  | NodeAshedEvent
  | GrudgeChangedEvent
  | SkVoiceLineEvent
  | AuditResultEvent
  | AccusationOpenedEvent
  | AccusationVoteCastEvent
  | AccusationResolvedEvent
  | DiscoveryFlippedEvent;

// ─── Individual Events ────────────────────────────────────────────

export interface PhaseChangedEvent {
  readonly type: 'PHASE_CHANGED';
  readonly phase: GamePhase;
  readonly round: number;
}

export interface RoundStartedEvent {
  readonly type: 'ROUND_STARTED';
  readonly round: number;
  readonly act: Act;
}

export interface ThreatDeclaredEvent {
  readonly type: 'THREAT_DECLARED';
  readonly telegraph: ShadowkingTelegraph;
}

export interface PledgeSubmittedEvent {
  readonly type: 'PLEDGE_SUBMITTED';
  readonly playerIndex: number;
  readonly amount: number;
  readonly tier: PledgeTier;
}

/**
 * Concealed pledge commit (Blood Pact only, §10): the table sees only that a
 * player committed — never the amount or tier (those go to the Suspicion Log,
 * visible only from the accusation screen). Replaces PLEDGE_SUBMITTED in
 * blood_pact mode so the public log can't be data-mined.
 */
export interface PledgeCommittedEvent {
  readonly type: 'PLEDGE_COMMITTED';
  readonly playerIndex: number;
}

export interface PledgeResolvedEvent {
  readonly type: 'PLEDGE_RESOLVED';
  readonly effective: number;
  readonly threshold: number;
  readonly ratio: number;
  readonly averted: boolean;
}

export interface PlayerActedEvent {
  readonly type: 'PLAYER_ACTED';
  readonly playerIndex: number;
  readonly action: ActionType;
  readonly details: Record<string, unknown>;
}

/** A Warlord was eliminated at Dawn (deposed / zero living strongholds, §6). */
export interface PlayerEliminatedEvent {
  readonly type: 'PLAYER_ELIMINATED';
  readonly playerIndex: number;
  readonly round: number;
}

export interface ActivePlayerChangedEvent {
  readonly type: 'ACTIVE_PLAYER_CHANGED';
  readonly playerIndex: number;
}

export interface CrownChangedEvent {
  readonly type: 'CROWN_CHANGED';
  readonly previousHolder: number | null;
  readonly newHolder: number | null;
}

export interface ActEscalatedEvent {
  readonly type: 'ACT_ESCALATED';
  readonly previousAct: Act;
  readonly newAct: Act;
}

export interface RoundEndedEvent {
  readonly type: 'ROUND_ENDED';
  readonly round: number;
}

export interface GameOverEvent {
  readonly type: 'GAME_OVER';
  readonly reason: GameEndReason;
  readonly winner: number | null;
}

// ─── Stage 3b: Blight / Shadowking Events ───────────────────────

/** Source that caused the Blight advance. */
export type BlightSource = 'strike' | 'escalation' | 'dawn';

export interface BlightAdvancedEvent {
  readonly type: 'BLIGHT_ADVANCED';
  readonly nodeId: string;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly source: BlightSource;
}

export interface NodeAshedEvent {
  readonly type: 'NODE_ASHED';
  readonly nodeId: string;
  readonly previousOwner: number | null;
}

export interface GrudgeChangedEvent {
  readonly type: 'GRUDGE_CHANGED';
  readonly playerIndex: number;
  readonly previousGrudge: number;
  readonly newGrudge: number;
  readonly reason: string;
}

export interface SkVoiceLineEvent {
  readonly type: 'SK_VOICE_LINE';
  readonly line: string;
  readonly trigger: string;
}

// ─── Stage 3d: Blood Pact Events (§10) ───────────────────────────

/** Result of an Audit — the auditor learns a target's last pledge. */
export interface AuditResultEvent {
  readonly type: 'AUDIT_RESULT';
  readonly auditorIndex: number;
  readonly targetIndex: number;
  readonly amount: number;
  readonly tier: PledgeTier;
  readonly round: number;
}

/** An accusation was opened against a suspected traitor. */
export interface AccusationOpenedEvent {
  readonly type: 'ACCUSATION_OPENED';
  readonly accuser: number;
  readonly accused: number;
}

/** A required voter cast their vote on the open accusation. */
export interface AccusationVoteCastEvent {
  readonly type: 'ACCUSATION_VOTE_CAST';
  readonly playerIndex: number;
  readonly agree: boolean;
}

// ─── Stage 3c: Discovery (§5.1) ──────────────────────────────────

/** A CLAIM flipped a Holding's face-down Discovery token, revealing its content (§12 #19). */
export interface DiscoveryFlippedEvent {
  readonly type: 'DISCOVERY_FLIPPED';
  /** The node whose token was flipped. */
  readonly nodeId: string;
  /** Player who flipped it (the claimer). */
  readonly playerIndex: number;
  /** What was revealed. */
  readonly kind: TokenKind;
  /** Recruit: the retainer's archetype/name; otherwise null. */
  readonly retainerName: string | null;
}

/** The accusation resolved (correct / wrong / fizzled). */
export interface AccusationResolvedEvent {
  readonly type: 'ACCUSATION_RESOLVED';
  readonly accuser: number;
  readonly accused: number;
  readonly outcome: AccusationOutcome;
  /** True iff the accused actually held the Blood Pact. */
  readonly wasTraitor: boolean;
}
