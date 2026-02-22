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
  BOARD_FORGE_NODES,
  BOARD_STANDARD_NODES,
  BOARD_TOTAL_NODES,
  DEFAULT_BEHAVIOR_DECK_COMPOSITION,
  DOOM_TOLL_FINAL_PHASE_THRESHOLD,
  DOOM_TOLL_MAX,
  DOOM_TOLL_MIN,
  KNOWN_LANDS,
  LIEUTENANT_MAX_COUNT,
  LIEUTENANT_POWER,
  LIEUTENANT_START_COUNT,
  MAX_FELLOWSHIP_SIZE,
  MINION_MAX_COUNT,
  MINION_POWER,
  POWER_LEVELS,
  VOTE_COST_FINAL_PHASE,
  VOTE_COST_STANDARD,
  WANDERER_TOKEN_COUNT,
  createCharacter,
  createInitialBoardState,
  createInitialStats,
  createPlayer,
  createStartingFellowship,
  getForgeNodes,
  getNodesByType,
  getStandardNodes,
  selectWandererNodes,
  validateBoard,
  type AIDifficulty,
  type ActionLogEntry,
  type AntagonistForce,
  type BehaviorCard,
  type BehaviorCardType,
  type BoardDefinition,
  type BoardNode,
  type BoardState,
  type BoardValidationResult,
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
export {
  SeededRandom,
  findNearest,
  findShortestPath,
  getAllDistances,
  getDistance,
  getNodesWithinDistance,
} from './utils/index.js';
