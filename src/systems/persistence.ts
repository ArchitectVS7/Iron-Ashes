/**
 * Persistence / Save-Load Layer
 *
 * Provides serialization, deserialization, and storage for game state.
 * Supports both server-side authoritative persistence and local session
 * checkpointing for mobile background resilience.
 *
 * @module persistence
 */

import type { GameState, GameMode, GameEndReason, GamePhase, ActionLogEntry } from '../models/game-state.js';
import type { Player, AIDifficulty, PlayerType } from '../models/player.js';
import type { BoardDefinition, BoardState, BoardNode } from '../models/board.js';
import type { Fellowship, Character } from '../models/characters.js';
import type { BehaviorCard, AntagonistForce } from '../models/game-state.js';

/**
 * Serialized game state for storage or transmission.
 *
 * This is a fully JSON-serializable representation of the game state.
 * All fields are primitive types or nested objects of primitives.
 */
export interface SerializedGameState {
  /** Schema version for migration support. */
  version: number;
  /** Session ID for multiplayer sessions. */
  sessionId: string;
  /** Random seed for this session. */
  seed: number;
  /** Game mode. */
  mode: GameMode;
  /** Current round number. */
  round: number;
  /** Current game phase. */
  phase: GamePhase;
  /** Active player index. */
  activePlayerIndex: number;
  /** Fixed turn order (player indices). */
  turnOrder: readonly number[];
  /** Doom toll position. */
  doomToll: number;
  /** Whether in final phase. */
  isFinalPhase: boolean;
  /** Board definition (immutable). */
  boardDefinition: SerializedBoardDefinition;
  /** Board state (runtime). */
  boardState: SerializedBoardState;
  /** All players. */
  players: SerializedPlayer[];
  /** Antagonist forces on the board. */
  antagonistForces: SerializedAntagonistForce[];
  /** Behavior card draw pile. */
  behaviorDeck: SerializedBehaviorCard[];
  /** Behavior card discard pile. */
  behaviorDiscard: SerializedBehaviorCard[];
  /** Current behavior card being resolved. */
  currentBehaviorCard: SerializedBehaviorCard | null;
  /** Fate card draw pile. */
  fateDeck: number[];
  /** Fate card discard pile. */
  fateDiscard: number[];
  /** Node where artifact is located. */
  artifactNode: string;
  /** Player index holding artifact, or null. */
  artifactHolder: number | null;
  /** Votes submitted this round. */
  votes: ('counter' | 'abstain' | null)[];
  /** Accusation cooldown rounds. */
  accusationCooldownRounds: number;
  /** Game end reason. */
  gameEndReason: GameEndReason;
  /** Winning player index. */
  winner: number | null;
  /** Action log. */
  actionLog: SerializedActionLogEntry[];
  /** Timestamp when this state was serialized. */
  timestamp: number;
}

/** Serialized board definition. */
export interface SerializedBoardDefinition {
  nodes: Record<string, SerializedBoardNode>;
  startingKeeps: readonly [string, string, string, string];
  antagonistBase: string;
  neutralCenter: string;
}

/** Serialized board node. */
export interface SerializedBoardNode {
  id: string;
  type: string;
  connections: readonly string[];
  startingCourt: number | null;
}

/** Serialized board state. */
export interface SerializedBoardState {
  [nodeId: string]: SerializedNodeState;
}

/** Serialized node state. */
export interface SerializedNodeState {
  claimedBy: number | null;
  hasWanderer: boolean;
  antagonistForces: string[];
}

/** Serialized player. */
export interface SerializedPlayer {
  index: number;
  type: PlayerType;
  aiDifficulty: AIDifficulty | null;
  fellowship: SerializedFellowship;
  warBanners: number;
  fateCards: number[];
  penaltyCards: number;
  isBroken: boolean;
  hasBloodPact: boolean;
  bloodPactRevealed: boolean;
  accusationLockoutRounds: number;
  actionsRemaining: number;
  stats: SerializedPlayerStats;
}

/** Serialized fellowship. */
export interface SerializedFellowship {
  courtIndex: number;
  currentNode: string;
  characters: SerializedCharacter[];
}

/** Serialized character. */
export interface SerializedCharacter {
  id: string;
  role: string;
  powerLevel: number;
  diplomaticActionUsed: boolean;
}

/** Serialized player stats. */
export interface SerializedPlayerStats {
  strongholdsClaimed: number;
  fellowsRecruited: number;
  warBannersSpent: number;
  combatsWon: number;
  combatsLost: number;
  timesBroken: number;
  rescuesGiven: number;
  rescuesReceived: number;
  votesCast: number;
  votesAbstained: number;
}

/** Serialized antagonist force. */
export interface SerializedAntagonistForce {
  id: string;
  type: 'lieutenant' | 'minion';
  powerLevel: number;
  currentNode: string;
}

/** Serialized behavior card. */
export interface SerializedBehaviorCard {
  id: string;
  type: string;
}

/** Serialized action log entry. */
export interface SerializedActionLogEntry {
  round: number;
  phase: GamePhase;
  playerIndex: number | null;
  action: string;
  details: string;
}

/** Local session checkpoint for mobile resume (P2 feature). */
export interface LocalSessionCheckpoint {
  seed: number;
  roundNumber: number;
  mode: GameMode;
  playerCount: number;
  aiDifficulties: (AIDifficulty | null)[];
  timestamp: number;
}

/** Storage backend interface for flexibility. */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/** localStorage-based storage backend (default for browser). */
export class LocalStorageBackend implements StorageBackend {
  getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  }
}

/** In-memory storage backend (for testing). */
export class MemoryStorageBackend implements StorageBackend {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/** Current storage backend (default: localStorage). */
let storageBackend: StorageBackend = new LocalStorageBackend();

/**
 * Set the storage backend.
 *
 * @param backend - The storage backend to use.
 */
export function setStorageBackend(backend: StorageBackend): void {
  storageBackend = backend;
}

/**
 * Get the current storage backend.
 *
 * @returns The current storage backend.
 */
export function getStorageBackend(): StorageBackend {
  return storageBackend;
}

/** Current schema version for serialization. */
export const SCHEMA_VERSION = 1;

/** Storage key prefix for session data. */
export const SESSION_KEY_PREFIX = 'iron-ashes:session:';

/** Storage key for local session checkpoint. */
export const LOCAL_CHECKPOINT_KEY = 'iron-ashes:local-checkpoint';

/**
 * Serialize a board definition to a JSON-serializable format.
 *
 * @param definition - The board definition to serialize.
 * @returns The serialized board definition.
 */
export function serializeBoardDefinition(
  definition: BoardDefinition,
): SerializedBoardDefinition {
  const nodes: Record<string, SerializedBoardNode> = {};
  for (const [id, node] of Object.entries(definition.nodes)) {
    nodes[id] = {
      id: node.id,
      type: node.type,
      connections: [...node.connections],
      startingCourt: node.startingCourt,
    };
  }
  return {
    nodes,
    startingKeeps: [...definition.startingKeeps],
    antagonistBase: definition.antagonistBase,
    neutralCenter: definition.neutralCenter,
  };
}

/**
 * Deserialize a board definition from a serialized format.
 *
 * @param serialized - The serialized board definition.
 * @returns The deserialized board definition.
 */
export function deserializeBoardDefinition(
  serialized: SerializedBoardDefinition,
): BoardDefinition {
  const nodes: Record<string, BoardNode> = {};
  for (const [id, node] of Object.entries(serialized.nodes)) {
    nodes[id] = {
      id: node.id,
      type: node.type as BoardNode['type'],
      connections: node.connections,
      startingCourt: node.startingCourt,
    };
  }
  return {
    nodes,
    startingKeeps: serialized.startingKeeps,
    antagonistBase: serialized.antagonistBase,
    neutralCenter: serialized.neutralCenter,
  };
}

/**
 * Serialize board state to a JSON-serializable format.
 *
 * @param state - The board state to serialize.
 * @returns The serialized board state.
 */
export function serializeBoardState(state: BoardState): SerializedBoardState {
  const serialized: SerializedBoardState = {};
  for (const [nodeId, nodeState] of Object.entries(state)) {
    serialized[nodeId] = {
      claimedBy: nodeState.claimedBy,
      hasWanderer: nodeState.hasWanderer,
      antagonistForces: [...nodeState.antagonistForces],
    };
  }
  return serialized;
}

/**
 * Deserialize board state from a serialized format.
 *
 * @param serialized - The serialized board state.
 * @returns The deserialized board state.
 */
export function deserializeBoardState(
  serialized: SerializedBoardState,
): BoardState {
  const state: BoardState = {};
  for (const [nodeId, nodeState] of Object.entries(serialized)) {
    state[nodeId] = {
      claimedBy: nodeState.claimedBy,
      hasWanderer: nodeState.hasWanderer,
      antagonistForces: [...nodeState.antagonistForces],
    };
  }
  return state;
}

/**
 * Serialize a fellowship to a JSON-serializable format.
 *
 * @param fellowship - The fellowship to serialize.
 * @returns The serialized fellowship.
 */
export function serializeFellowship(fellowship: Fellowship): SerializedFellowship {
  return {
    courtIndex: fellowship.courtIndex,
    currentNode: fellowship.currentNode,
    characters: fellowship.characters.map(char => ({
      id: char.id,
      role: char.role,
      powerLevel: char.powerLevel,
      diplomaticActionUsed: char.diplomaticActionUsed,
    })),
  };
}

/**
 * Deserialize a fellowship from a serialized format.
 *
 * @param serialized - The serialized fellowship.
 * @returns The deserialized fellowship.
 */
export function deserializeFellowship(
  serialized: SerializedFellowship,
): Fellowship {
  return {
    courtIndex: serialized.courtIndex,
    currentNode: serialized.currentNode,
    characters: serialized.characters.map(char => ({
      id: char.id,
      role: char.role as Character['role'],
      powerLevel: char.powerLevel,
      diplomaticActionUsed: char.diplomaticActionUsed,
    })),
  };
}

/**
 * Serialize a player to a JSON-serializable format.
 *
 * @param player - The player to serialize.
 * @returns The serialized player.
 */
export function serializePlayer(player: Player): SerializedPlayer {
  return {
    index: player.index,
    type: player.type,
    aiDifficulty: player.aiDifficulty,
    fellowship: serializeFellowship(player.fellowship),
    warBanners: player.warBanners,
    fateCards: [...player.fateCards],
    penaltyCards: player.penaltyCards,
    isBroken: player.isBroken,
    hasBloodPact: player.hasBloodPact,
    bloodPactRevealed: player.bloodPactRevealed,
    accusationLockoutRounds: player.accusationLockoutRounds,
    actionsRemaining: player.actionsRemaining,
    stats: { ...player.stats },
  };
}

/**
 * Deserialize a player from a serialized format.
 *
 * @param serialized - The serialized player.
 * @returns The deserialized player.
 */
export function deserializePlayer(serialized: SerializedPlayer): Player {
  return {
    index: serialized.index,
    type: serialized.type,
    aiDifficulty: serialized.aiDifficulty,
    fellowship: deserializeFellowship(serialized.fellowship),
    warBanners: serialized.warBanners,
    fateCards: [...serialized.fateCards],
    penaltyCards: serialized.penaltyCards,
    isBroken: serialized.isBroken,
    hasBloodPact: serialized.hasBloodPact,
    bloodPactRevealed: serialized.bloodPactRevealed,
    accusationLockoutRounds: serialized.accusationLockoutRounds,
    actionsRemaining: serialized.actionsRemaining,
    stats: { ...serialized.stats },
  };
}

/**
 * Serialize an antagonist force.
 *
 * @param force - The antagonist force to serialize.
 * @returns The serialized antagonist force.
 */
export function serializeAntagonistForce(
  force: AntagonistForce,
): SerializedAntagonistForce {
  return {
    id: force.id,
    type: force.type,
    powerLevel: force.powerLevel,
    currentNode: force.currentNode,
  };
}

/**
 * Deserialize an antagonist force.
 *
 * @param serialized - The serialized antagonist force.
 * @returns The deserialized antagonist force.
 */
export function deserializeAntagonistForce(
  serialized: SerializedAntagonistForce,
): AntagonistForce {
  return {
    id: serialized.id,
    type: serialized.type,
    powerLevel: serialized.powerLevel,
    currentNode: serialized.currentNode,
  };
}

/**
 * Serialize a behavior card.
 *
 * @param card - The behavior card to serialize.
 * @returns The serialized behavior card.
 */
export function serializeBehaviorCard(card: BehaviorCard): SerializedBehaviorCard {
  return {
    id: card.id,
    type: card.type,
  };
}

/**
 * Deserialize a behavior card.
 *
 * @param serialized - The serialized behavior card.
 * @returns The deserialized behavior card.
 */
export function deserializeBehaviorCard(
  serialized: SerializedBehaviorCard,
): BehaviorCard {
  return {
    id: serialized.id,
    type: serialized.type as BehaviorCard['type'],
  };
}

/**
 * Serialize an action log entry.
 *
 * @param entry - The action log entry to serialize.
 * @returns The serialized action log entry.
 */
export function serializeActionLogEntry(
  entry: ActionLogEntry,
): SerializedActionLogEntry {
  return {
    round: entry.round,
    phase: entry.phase,
    playerIndex: entry.playerIndex,
    action: entry.action,
    details: entry.details,
  };
}

/**
 * Deserialize an action log entry.
 *
 * @param serialized - The serialized action log entry.
 * @returns The deserialized action log entry.
 */
export function deserializeActionLogEntry(
  serialized: SerializedActionLogEntry,
): ActionLogEntry {
  return {
    round: serialized.round,
    phase: serialized.phase,
    playerIndex: serialized.playerIndex,
    action: serialized.action,
    details: serialized.details,
  };
}

/**
 * Serialize the complete game state to a JSON string.
 *
 * @param state - The game state to serialize.
 * @param sessionId - The session ID for storage key.
 * @returns The serialized game state as a JSON string.
 */
export function serializeGameState(
  state: GameState,
  sessionId: string,
): string {
  const serialized: SerializedGameState = {
    version: SCHEMA_VERSION,
    sessionId,
    seed: state.seed,
    mode: state.mode,
    round: state.round,
    phase: state.phase,
    activePlayerIndex: state.activePlayerIndex,
    turnOrder: state.turnOrder,
    doomToll: state.doomToll,
    isFinalPhase: state.isFinalPhase,
    boardDefinition: serializeBoardDefinition(state.boardDefinition),
    boardState: serializeBoardState(state.boardState),
    players: state.players.map(serializePlayer),
    antagonistForces: state.antagonistForces.map(serializeAntagonistForce),
    behaviorDeck: state.behaviorDeck.map(serializeBehaviorCard),
    behaviorDiscard: state.behaviorDiscard.map(serializeBehaviorCard),
    currentBehaviorCard: state.currentBehaviorCard
      ? serializeBehaviorCard(state.currentBehaviorCard)
      : null,
    fateDeck: [...state.fateDeck],
    fateDiscard: [...state.fateDiscard],
    artifactNode: state.artifactNode,
    artifactHolder: state.artifactHolder,
    votes: state.votes,
    accusationCooldownRounds: state.accusationCooldownRounds,
    gameEndReason: state.gameEndReason,
    winner: state.winner,
    actionLog: state.actionLog.map(serializeActionLogEntry),
    timestamp: Date.now(),
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize a game state from a JSON string.
 *
 * @param json - The JSON string to deserialize.
 * @returns The deserialized game state.
 * @throws Error if the serialized data is invalid or incompatible.
 */
export function deserializeGameState(json: string): GameState {
  const serialized: SerializedGameState = JSON.parse(json);

  // Validate version
  if (serialized.version !== SCHEMA_VERSION) {
    throw new Error(
      `Incompatible schema version: expected ${SCHEMA_VERSION}, got ${serialized.version}`,
    );
  }

  return {
    seed: serialized.seed,
    mode: serialized.mode,
    round: serialized.round,
    phase: serialized.phase,
    activePlayerIndex: serialized.activePlayerIndex,
    turnOrder: serialized.turnOrder,
    doomToll: serialized.doomToll,
    isFinalPhase: serialized.isFinalPhase,
    boardDefinition: deserializeBoardDefinition(serialized.boardDefinition),
    boardState: deserializeBoardState(serialized.boardState),
    players: serialized.players.map(deserializePlayer),
    antagonistForces: serialized.antagonistForces.map(deserializeAntagonistForce),
    behaviorDeck: serialized.behaviorDeck.map(deserializeBehaviorCard),
    behaviorDiscard: serialized.behaviorDiscard.map(deserializeBehaviorCard),
    currentBehaviorCard: serialized.currentBehaviorCard
      ? deserializeBehaviorCard(serialized.currentBehaviorCard)
      : null,
    fateDeck: serialized.fateDeck,
    fateDiscard: serialized.fateDiscard,
    artifactNode: serialized.artifactNode,
    artifactHolder: serialized.artifactHolder,
    votes: serialized.votes,
    accusationCooldownRounds: serialized.accusationCooldownRounds,
    gameEndReason: serialized.gameEndReason,
    winner: serialized.winner,
    actionLog: serialized.actionLog.map(deserializeActionLogEntry),
  };
}

/**
 * Save a game state to storage.
 *
 * @param state - The game state to save.
 * @param sessionId - The session ID for storage key.
 * @returns True if save was successful, false otherwise.
 */
export function saveGame(state: GameState, sessionId: string): boolean {
  try {
    const json = serializeGameState(state, sessionId);
    storageBackend.setItem(`${SESSION_KEY_PREFIX}${sessionId}`, json);
    return true;
  } catch (error) {
    console.error('Failed to save game state:', error);
    return false;
  }
}

/**
 * Load a game state from storage.
 *
 * @param sessionId - The session ID to load.
 * @returns The loaded game state, or null if not found.
 */
export function loadGame(sessionId: string): GameState | null {
  try {
    const json = storageBackend.getItem(`${SESSION_KEY_PREFIX}${sessionId}`);
    if (!json) {
      return null;
    }
    return deserializeGameState(json);
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Delete a saved game from storage.
 *
 * @param sessionId - The session ID to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export function deleteGame(sessionId: string): boolean {
  try {
    storageBackend.removeItem(`${SESSION_KEY_PREFIX}${sessionId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete game state:', error);
    return false;
  }
}

/**
 * Save a local session checkpoint for mobile resume.
 *
 * @param checkpoint - The checkpoint data to save.
 * @returns True if save was successful, false otherwise.
 */
export function saveLocalCheckpoint(checkpoint: LocalSessionCheckpoint): boolean {
  try {
    const json = JSON.stringify(checkpoint);
    storageBackend.setItem(LOCAL_CHECKPOINT_KEY, json);
    return true;
  } catch (error) {
    console.error('Failed to save local checkpoint:', error);
    return false;
  }
}

/**
 * Load a local session checkpoint.
 *
 * @returns The loaded checkpoint, or null if not found.
 */
export function loadLocalCheckpoint(): LocalSessionCheckpoint | null {
  try {
    const json = storageBackend.getItem(LOCAL_CHECKPOINT_KEY);
    if (!json) {
      return null;
    }
    return JSON.parse(json) as LocalSessionCheckpoint;
  } catch (error) {
    console.error('Failed to load local checkpoint:', error);
    return null;
  }
}

/**
 * Delete a local session checkpoint.
 *
 * @returns True if deletion was successful, false otherwise.
 */
export function deleteLocalCheckpoint(): boolean {
  try {
    storageBackend.removeItem(LOCAL_CHECKPOINT_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete local checkpoint:', error);
    return false;
  }
}

/**
 * List all saved session IDs.
 *
 * @returns An array of session IDs.
 */
export function listSavedSessions(): string[] {
  const sessions: string[] = [];
  try {
    for (let i = 0; i < storageBackend.getItem.length; i++) {
      // This approach won't work with localStorage - we need a different method
      // For localStorage, we'd need to iterate over keys
    }
  } catch {
    // Storage iteration not supported
  }

  // Alternative approach for localStorage
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSION_KEY_PREFIX)) {
        const sessionId = key.substring(SESSION_KEY_PREFIX.length);
        sessions.push(sessionId);
      }
    }
  }

  return sessions;
}

/**
 * Clear all saved game data.
 *
 * @returns True if clear was successful, false otherwise.
 */
export function clearAllSavedData(): boolean {
  try {
    const sessions = listSavedSessions();
    for (const sessionId of sessions) {
      storageBackend.removeItem(`${SESSION_KEY_PREFIX}${sessionId}`);
    }
    deleteLocalCheckpoint();
    return true;
  } catch (error) {
    console.error('Failed to clear saved data:', error);
    return false;
  }
}

/**
 * Validate that a game state is complete and consistent.
 *
 * @param state - The game state to validate.
 * @returns An object with isValid flag and any errors found.
 */
export function validateGameState(
  state: GameState,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate player count
  if (state.players.length < 2 || state.players.length > 4) {
    errors.push(`Invalid player count: ${state.players.length} (expected 2-4)`);
  }

  // Validate doom toll range
  if (state.doomToll < 0 || state.doomToll > 13) {
    errors.push(`Invalid doom toll: ${state.doomToll} (expected 0-13)`);
  }

  // Validate round number
  if (state.round < 1) {
    errors.push(`Invalid round number: ${state.round} (expected >= 1)`);
  }

  // Validate phase
  const validPhases = ['shadowking', 'voting', 'action', 'cleanup'];
  if (!validPhases.includes(state.phase)) {
    errors.push(`Invalid phase: ${state.phase}`);
  }

  // Validate turn order
  if (state.turnOrder.length !== state.players.length) {
    errors.push(
      `Turn order length (${state.turnOrder.length}) doesn't match player count (${state.players.length})`,
    );
  }

  // Validate active player index
  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= state.players.length) {
    errors.push(
      `Invalid active player index: ${state.activePlayerIndex} (expected 0-${state.players.length - 1})`,
    );
  }

  // Validate player indices
  for (const player of state.players) {
    if (player.index < 0 || player.index >= state.players.length) {
      errors.push(`Player ${player.index} has invalid index`);
    }
  }

  // Validate game end state consistency
  if (state.gameEndReason !== null) {
    if (state.winner === null && state.gameEndReason !== 'all_broken' && state.gameEndReason !== 'doom_complete') {
      errors.push('Game ended but no winner specified');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Get a summary of a saved game for UI display.
 *
 * @param sessionId - The session ID to summarize.
 * @returns A summary object, or null if the game is not found.
 */
export function getGameSummary(
  sessionId: string,
): {
  round: number;
  phase: string;
  doomToll: number;
  playerCount: number;
  mode: string;
  timestamp: number;
} | null {
  try {
    const json = storageBackend.getItem(`${SESSION_KEY_PREFIX}${sessionId}`);
    if (!json) {
      return null;
    }
    const serialized: SerializedGameState = JSON.parse(json);
    return {
      round: serialized.round,
      phase: serialized.phase,
      doomToll: serialized.doomToll,
      playerCount: serialized.players.length,
      mode: serialized.mode,
      timestamp: serialized.timestamp,
    };
  } catch (error) {
    console.error('Failed to get game summary:', error);
    return null;
  }
}
