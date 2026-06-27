/**
 * v2 Engine — Public API
 *
 * This barrel export is the entry point for the redesigned engine.
 * Import everything from 'src/v2' — never reach into submodules directly.
 */

// ── Setup ──
export { createGame } from './setup.js';

// ── Reducer ──
export { applyCommand, InvalidCommandError } from './reducer.js';
export type { CommandResult } from './reducer.js';

// ── Types ──
export type {
  Act,
  AccusationOutcome,
  AccusationState,
  AccusationVote,
  Archetype,
  AuditEntry,
  CourtPiece,
  GameEndReason,
  GameMode,
  GamePhase,
  GameState,
  GambitState,
  NodeTier,
  Piece,
  PieceType,
  PledgeEntry,
  PledgeTier,
  PlayerState,
  PlayerType,
  Quadrant,
  ShadowkingForce,
  ShadowkingForceType,
  ShadowkingState,
  ShadowkingTelegraph,
  V2BoardDef,
  V2BoardState,
  V2NodeDef,
  V2NodeState,
  BackSigil,
  HiddenToken,
  TokenKind,
} from './types.js';

// ── Commands ──
export type {
  ActionType,
  Command,
  PlayerAction,
  AdvancePhaseCommand,
  SubmitPledgeCommand,
  PlayerActionCommand,
  LastStandCommitCommand,
} from './commands.js';

// ── Events ──
export type { GameEvent, BlightSource } from './events.js';

// ── Board ──
export { buildClosingRing, createInitialBoardState, validateClosingRing } from './board.js';
export type { BoardValidationResult } from './board.js';
export { NODE_IDS } from './board.js';

// ── Blight ──
export {
  advanceBlightOnNode,
  advanceBlightOnSpoke,
  applyDawnBlightAdvance,
  applyPushback,
  ashNode,
  checkActAdvance,
  countAshedNodes,
  getBlightFrontier,
  getSpokeFrontier,
  getSpokePath,
  isKeystoneAshed,
  resolveStrike,
  spreadShieldedOnSpoke,
} from './blight.js';

// ── Shadowking Effects (§5.6 effect table) ──
export { applyShadowkingStrike } from './shadowking-effects.js';

// ── Shadowking Policy ──
export {
  addGrudge,
  chooseShadowkingIntent,
  chooseTarget,
  chooseEffect,
  decayGrudge,
  generateReactiveVoiceLine,
} from './shadowking-policy.js';
export type { ShadowkingEffect } from './shadowking-policy.js';

// ── Combat ──
export {
  resolveCombat,
  resolveLastStand,
  chooseLastStandCards,
  applyCombatOutcome,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
  livingStrongholdCount,
} from './combat.js';
export type { CombatSetup, CombatResult, CombatType, LastStandResult } from './combat.js';

// ── Actions ──
export {
  executeMarch,
  executeClaim,
  executeStrike,
  executeRaid,
  executeRecruit,
  areAdjacent,
  isPlayerAtNode,
  hasRivalAtNode,
  hasSKForcesAtNode,
} from './actions.js';

// ── The Court (§2 archetypes) ──
export {
  addCourtPiece,
  archetypePower,
  canLastStand,
  stewardIncome,
} from './court.js';

// ── Gambit ──
export {
  checkGambitSeize,
  evaluateGambitAtDawn,
  getEffectivePledgeWeight,
  isKeystoneGarrisoned,
  computeTerritoryWinner,
} from './gambit.js';

// ── Blood Pact (Layer B, §10) ──
export {
  recordSuspicionLog,
  executeAudit,
  initiateAccusation,
  submitAccusationVote,
  isAccusationComplete,
  suspicionScore,
  chooseAuditTarget,
  chooseAccusation,
  chooseAccusationVote,
} from './blood-pact.js';
export type { BloodPactResult, AuditResult } from './blood-pact.js';

// ── AI Player ──
export {
  choosePledge,
  chooseAction,
  runAIPledge,
  runAITurn,
  DEFAULT_AI_POLICY,
} from './ai-player.js';
export type { AIPolicy } from './ai-player.js';

// ── Discovery (§5.1, §7 D1/D2/D9) ──
export {
  bindHiddenTokens,
  deriveToken,
  backSigil,
  hashSeedNode,
  makeFlipDeathKnight,
  makeBlightSeedForce,
  blightSeedRedeemable,
} from './discovery.js';

// ── Observable projection (§7 D2) ──
export { observableState, SEED_REDACTED } from './observable.js';
export type {
  ObservableState,
  ObservableToken,
  ObservableNodeState,
  ObservableBoardState,
  RedactedToken,
  RedactedSeed,
} from './observable.js';

// ── Tunables ──
export { TUNABLES } from './tunables.js';

// ── Sequencer (for advanced/test use) ──
export {
  computeCrownHolder,
  classifyPledgeTier,
  resolveDeposals,
  checkEndConditions,
} from './sequencer.js';
