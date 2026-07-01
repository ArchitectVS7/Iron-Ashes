/**
 * v2 Engine — Public API
 *
 * This barrel export is the entry point for the redesigned engine.
 * Import everything from 'src/v2' — never reach into submodules directly.
 */

// ── Setup ──
export { createGame } from './setup.js';

// ── Difficulty (Stage D1 — dark-strength tiers via the doomCost curve) ──
export {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TUNABLES,
  difficultyTunables,
  withDifficulty,
} from './difficulty.js';

// ── Reducer ──
export { applyCommand, InvalidCommandError } from './reducer.js';
export type { CommandResult } from './reducer.js';

// ── Types ──
export type {
  Act,
  Difficulty,
  AccusationOutcome,
  AccusationState,
  AccusationVote,
  Archetype,
  AuditEntry,
  CaptiveRecord,
  CourtPiece,
  GameEndReason,
  GameMode,
  GamePhase,
  GameState,
  GambitState,
  NodeTier,
  Oath,
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
  StrikePoolCard,
  Wraith,
  HeartState,
  V2BoardDef,
  V2BoardState,
  V2NodeDef,
  V2NodeState,
  BackSigil,
  HiddenToken,
  TokenKind,
  BequestChoiceInput,
  WraithInputKind,
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
  SetBequestCommand,
  SetWraithInputCommand,
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
  effectiveCaptureMargin,
  isProductionLeader,
  trailingDefenseBonus,
  stewardHomeDefenseBonus,
  chooseCombatCommit,
  chooseRaidAttackCommit,
} from './combat.js';
export type { CombatSetup, CombatResult, CombatType, LastStandResult } from './combat.js';

// ── Actions ──
export {
  executeMarch,
  executeClaim,
  executeStrike,
  executeRaid,
  executeRansom,
  executeRecruit,
  areAdjacent,
  isPlayerAtNode,
  hasRivalAtNode,
  hasSKForcesAtNode,
  findOath,
  areSworn,
  parleyTarget,
} from './actions.js';
export type { RaidEffect, RaidElect } from './actions.js';

// ── Capture & Ransom economy (§5.2/§5.3, §13 P0-1/2/3/10) ──
export {
  capturePiece,
  routPiece,
  nearestStronghold,
  legalRaidTargets,
  freeRetainerCount,
  canCapture,
  returnRoutedPieces,
  enforceGuardCap,
  guardCapacity,
  freeCaptiveToOwner,
  resolveCaptivesAfterDeposals,
} from './capture.js';

// ── Elimination machinery (§5.5/§6, §13 P0-4/P0-5/P0-9; Stage 3e) ──
export {
  feedHandToStrikePool,
  strikePoolPower,
  decayStrikePool,
  consumeStrikePower,
  cardsAccountedFor,
  joinWraith,
  markStrippedByRival,
  markStrippedByDark,
  nearestClaimant,
  deathCurseTarget,
  applyReckoningAutoPressure,
  decideBequest,
  applyDeathBequest,
  boardLeaderSeat,
  planWraithInputs,
  applyWraithNudges,
  applyWraithCardAdds,
} from './elimination.js';
export type { BequestChoice, WraithDecision } from './elimination.js';

// ── Kill the Dark — heart + two-act ending (§5.6, §13 P0-6/P0-7; Stage 3g) ──
export {
  spawnHeartAtReckoning,
  executeAssaultHeart,
  computeRaidLeader,
  resolveHeartCollapse,
  computePostDarkWinner,
} from './heart.js';

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
export { TUNABLES, HERALD_RECRUIT_COST } from './tunables.js';

// ── Sequencer (for advanced/test use) ──
export {
  computeCrownHolder,
  classifyPledgeTier,
  resolveDeposals,
  checkEndConditions,
} from './sequencer.js';
