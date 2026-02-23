/**
 * Engine barrel export.
 */

export {
  createGameState,
  createBehaviorDeck,
  createFateDeck,
  advancePhase,
  advanceActionTurn,
  isActionPhaseComplete,
  startRound,
  startCleanup,
} from './game-loop.js';

export {
  runSimulation,
  runBatchSimulation,
  simulateRound,
  simulatePlayerAction,
  type SimulationResult,
  type BatchResult,
} from './simulation.js';
