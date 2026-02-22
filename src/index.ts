/**
 * Alliance Engine v1.0 — Iron Throne of Ashes
 *
 * Public API surface for the game engine.
 */

// GLL system
export {
  GLLRegistry,
  GLLValidationError,
  REQUIRED_GLL_KEYS,
  type GLLCategory,
  type GLLContentPack,
  type GLLKey,
  type GLLTokenDef,
} from './gll/index.js';

// Data models
export {
  ACTIONS_PER_TURN_BROKEN,
  ACTIONS_PER_TURN_NORMAL,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  DOOM_TOLL_MAX,
  DOOM_TOLL_MIN,
  LIEUTENANT_MAX_COUNT,
  LIEUTENANT_POWER,
  LIEUTENANT_START_COUNT,
  MAX_FELLOWSHIP_SIZE,
  MINION_MAX_COUNT,
  MINION_POWER,
  POWER_LEVELS,
  VOTE_COST_FINAL_PHASE,
  VOTE_COST_STANDARD,
  createCharacter,
  createInitialBoardState,
  createInitialStats,
  createPlayer,
  createStartingFellowship,
  type AIDifficulty,
  type ActionLogEntry,
  type AntagonistForce,
  type BehaviorCard,
  type BehaviorCardType,
  type BoardDefinition,
  type BoardNode,
  type BoardState,
  type Character,
  type CharacterRole,
  type Fellowship,
  type GameEndReason,
  type GameMode,
  type GamePhase,
  type GameState,
  type NodeState,
  type NodeType,
  type Player,
  type PlayerStats,
  type PlayerType,
  type VoteChoice,
} from './models/index.js';

// Utilities
export { SeededRandom } from './utils/index.js';
