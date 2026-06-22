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
} from './blight.js';

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
  applyCombatOutcome,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
  checkBrokenState,
} from './combat.js';
export type { CombatSetup, CombatResult, CombatType, LastStandResult } from './combat.js';

// ── Actions ──
export {
  executeMarch,
  executeClaim,
  executeStrike,
  executeRaid,
  executeRescue,
  executeRecruit,
  checkBrokenRecovery,
  areAdjacent,
  isPlayerAtNode,
  hasRivalAtNode,
  hasSKForcesAtNode,
} from './actions.js';

// ── Gambit ──
export {
  checkGambitSeize,
  evaluateGambitAtDawn,
  getEffectivePledgeWeight,
  isKeystoneGarrisoned,
  computeTerritoryWinner,
} from './gambit.js';

// ── AI Player ──
export {
  choosePledge,
  chooseAction,
  runAIPledge,
  runAITurn,
  DEFAULT_AI_POLICY,
} from './ai-player.js';
export type { AIPolicy } from './ai-player.js';

// ── Tunables ──
export { TUNABLES } from './tunables.js';

// ── Sequencer (for advanced/test use) ──
export { computeCrownHolder, classifyPledgeTier } from './sequencer.js';
