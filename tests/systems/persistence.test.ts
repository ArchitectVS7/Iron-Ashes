/**
 * Tests for the Persistence / Save-Load Layer
 *
 * Covers:
 *  1. MemoryStorageBackend CRUD
 *  2. setStorageBackend / getStorageBackend
 *  3. Serialize/deserialize round-trips for all sub-types
 *  4. Full GameState serialize/deserialize round-trip
 *  5. Schema version mismatch rejection
 *  6. saveGame / loadGame / deleteGame (via MemoryStorageBackend)
 *  7. saveLocalCheckpoint / loadLocalCheckpoint / deleteLocalCheckpoint
 *  8. validateGameState — all branches
 *  9. getGameSummary
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState } from '../../src/engine/game-loop.js';
import {
  MemoryStorageBackend,
  setStorageBackend,
  getStorageBackend,
  serializeBoardDefinition,
  deserializeBoardDefinition,
  serializeBoardState,
  deserializeBoardState,
  serializeFellowship,
  deserializeFellowship,
  serializePlayer,
  deserializePlayer,
  serializeAntagonistForce,
  deserializeAntagonistForce,
  serializeBehaviorCard,
  deserializeBehaviorCard,
  serializeActionLogEntry,
  deserializeActionLogEntry,
  serializeGameState,
  deserializeGameState,
  saveGame,
  loadGame,
  deleteGame,
  saveLocalCheckpoint,
  loadLocalCheckpoint,
  deleteLocalCheckpoint,
  validateGameState,
  getGameSummary,
  SCHEMA_VERSION,
  SESSION_KEY_PREFIX,
  LOCAL_CHECKPOINT_KEY,
} from '../../src/systems/persistence.js';
import type { GameState } from '../../src/models/game-state.js';
import type { LocalSessionCheckpoint } from '../../src/systems/persistence.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeState(players = 2, mode: 'competitive' | 'cooperative' | 'blood_pact' = 'competitive'): GameState {
  return createGameState(players, mode, 42);
}

// ── MemoryStorageBackend ───────────────────────────────────────────────────────

describe('MemoryStorageBackend', () => {
  let mem: MemoryStorageBackend;

  beforeEach(() => {
    mem = new MemoryStorageBackend();
  });

  it('returns null for missing key', () => {
    expect(mem.getItem('missing')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    mem.setItem('key', 'value');
    expect(mem.getItem('key')).toBe('value');
  });

  it('overwrites an existing key', () => {
    mem.setItem('key', 'first');
    mem.setItem('key', 'second');
    expect(mem.getItem('key')).toBe('second');
  });

  it('removes a key', () => {
    mem.setItem('key', 'value');
    mem.removeItem('key');
    expect(mem.getItem('key')).toBeNull();
  });

  it('clear() removes all keys', () => {
    mem.setItem('a', '1');
    mem.setItem('b', '2');
    mem.clear();
    expect(mem.getItem('a')).toBeNull();
    expect(mem.getItem('b')).toBeNull();
  });

  it('removeItem on absent key does not throw', () => {
    expect(() => mem.removeItem('ghost')).not.toThrow();
  });
});

// ── setStorageBackend / getStorageBackend ──────────────────────────────────────

describe('setStorageBackend / getStorageBackend', () => {
  it('getStorageBackend returns the active backend', () => {
    const mem = new MemoryStorageBackend();
    setStorageBackend(mem);
    expect(getStorageBackend()).toBe(mem);
  });

  it('swapping backend isolates data', () => {
    const a = new MemoryStorageBackend();
    const b = new MemoryStorageBackend();
    setStorageBackend(a);
    a.setItem('k', 'from-a');

    setStorageBackend(b);
    expect(getStorageBackend().getItem('k')).toBeNull();
  });
});

// ── Sub-type round-trips ───────────────────────────────────────────────────────

describe('serializeBoardDefinition / deserializeBoardDefinition', () => {
  it('round-trips the board definition faithfully', () => {
    const state = makeState();
    const serialized = serializeBoardDefinition(state.boardDefinition);
    const restored = deserializeBoardDefinition(serialized);

    expect(restored.antagonistBase).toBe(state.boardDefinition.antagonistBase);
    expect(restored.neutralCenter).toBe(state.boardDefinition.neutralCenter);
    expect(restored.startingKeeps).toEqual(state.boardDefinition.startingKeeps);
    expect(Object.keys(restored.nodes)).toEqual(Object.keys(state.boardDefinition.nodes));
  });

  it('serialized nodes preserve connections as arrays', () => {
    const state = makeState();
    const serialized = serializeBoardDefinition(state.boardDefinition);
    for (const node of Object.values(serialized.nodes)) {
      expect(Array.isArray(node.connections)).toBe(true);
    }
  });
});

describe('serializeBoardState / deserializeBoardState', () => {
  it('round-trips board state faithfully', () => {
    const state = makeState();
    const serialized = serializeBoardState(state.boardState);
    const restored = deserializeBoardState(serialized);

    expect(Object.keys(restored)).toEqual(Object.keys(state.boardState));
    for (const nodeId of Object.keys(state.boardState)) {
      expect(restored[nodeId].claimedBy).toBe(state.boardState[nodeId].claimedBy);
      expect(restored[nodeId].hasWanderer).toBe(state.boardState[nodeId].hasWanderer);
    }
  });

  it('antagonistForces arrays are independent copies after deserialization', () => {
    const state = makeState();
    const serialized = serializeBoardState(state.boardState);
    const restored = deserializeBoardState(serialized);

    const firstNodeId = Object.keys(restored)[0];
    restored[firstNodeId].antagonistForces.push('mutated');
    expect(state.boardState[firstNodeId].antagonistForces).not.toContain('mutated');
  });
});

describe('serializeFellowship / deserializeFellowship', () => {
  it('round-trips fellowship faithfully', () => {
    const state = makeState();
    const fellowship = state.players[0].fellowship;
    const serialized = serializeFellowship(fellowship);
    const restored = deserializeFellowship(serialized);

    expect(restored.courtIndex).toBe(fellowship.courtIndex);
    expect(restored.currentNode).toBe(fellowship.currentNode);
    expect(restored.characters.length).toBe(fellowship.characters.length);
  });

  it('character fields are preserved', () => {
    const state = makeState();
    const fellowship = state.players[0].fellowship;
    const serialized = serializeFellowship(fellowship);
    const restored = deserializeFellowship(serialized);

    for (let i = 0; i < fellowship.characters.length; i++) {
      expect(restored.characters[i].id).toBe(fellowship.characters[i].id);
      expect(restored.characters[i].role).toBe(fellowship.characters[i].role);
      expect(restored.characters[i].powerLevel).toBe(fellowship.characters[i].powerLevel);
      expect(restored.characters[i].diplomaticActionUsed).toBe(fellowship.characters[i].diplomaticActionUsed);
    }
  });
});

describe('serializePlayer / deserializePlayer', () => {
  it('round-trips player faithfully', () => {
    const state = makeState();
    const player = state.players[0];
    const serialized = serializePlayer(player);
    const restored = deserializePlayer(serialized);

    expect(restored.index).toBe(player.index);
    expect(restored.type).toBe(player.type);
    expect(restored.warBanners).toBe(player.warBanners);
    expect(restored.isBroken).toBe(player.isBroken);
    expect(restored.hasBloodPact).toBe(player.hasBloodPact);
  });

  it('fateCards is an independent copy', () => {
    const state = makeState();
    const player = state.players[0];
    const restored = deserializePlayer(serializePlayer(player));
    (restored.fateCards as number[]).push(99);
    expect(player.fateCards).not.toContain(99);
  });

  it('stats are copied correctly', () => {
    const state = makeState();
    const player = state.players[0];
    player.stats.combatsWon = 5;
    const restored = deserializePlayer(serializePlayer(player));
    expect(restored.stats.combatsWon).toBe(5);
  });
});

describe('serializeAntagonistForce / deserializeAntagonistForce', () => {
  it('round-trips antagonist force faithfully', () => {
    const state = makeState();
    if (state.antagonistForces.length === 0) {
      // Inject a synthetic force for testing
      (state.antagonistForces as typeof state.antagonistForces & { push: (val: unknown) => number }).push({
        id: 'test-force-1',
        type: 'lieutenant',
        powerLevel: 3,
        currentNode: 'node-a',
      });
    }
    const force = state.antagonistForces[0];
    const serialized = serializeAntagonistForce(force);
    const restored = deserializeAntagonistForce(serialized);

    expect(restored.id).toBe(force.id);
    expect(restored.type).toBe(force.type);
    expect(restored.powerLevel).toBe(force.powerLevel);
    expect(restored.currentNode).toBe(force.currentNode);
  });
});

describe('serializeBehaviorCard / deserializeBehaviorCard', () => {
  it('round-trips behavior card faithfully', () => {
    const state = makeState();
    const card = state.behaviorDeck[0];
    const serialized = serializeBehaviorCard(card);
    const restored = deserializeBehaviorCard(serialized);

    expect(restored.id).toBe(card.id);
    expect(restored.type).toBe(card.type);
  });
});

describe('serializeActionLogEntry / deserializeActionLogEntry', () => {
  it('round-trips action log entry faithfully', () => {
    const entry = {
      round: 3,
      phase: 'action' as const,
      playerIndex: 1,
      action: 'move',
      details: 'moved to node-5',
    };
    const serialized = serializeActionLogEntry(entry);
    const restored = deserializeActionLogEntry(serialized);

    expect(restored.round).toBe(3);
    expect(restored.phase).toBe('action');
    expect(restored.playerIndex).toBe(1);
    expect(restored.action).toBe('move');
    expect(restored.details).toBe('moved to node-5');
  });

  it('null playerIndex (system entry) is preserved', () => {
    const entry = { round: 1, phase: 'shadowking' as const, playerIndex: null, action: 'spawn', details: '' };
    const restored = deserializeActionLogEntry(serializeActionLogEntry(entry));
    expect(restored.playerIndex).toBeNull();
  });
});

// ── Full GameState round-trip ──────────────────────────────────────────────────

describe('serializeGameState / deserializeGameState', () => {
  it('round-trips a 2-player competitive state', () => {
    const state = makeState(2, 'competitive');
    const json = serializeGameState(state, 'sess-1');
    const restored = deserializeGameState(json);

    expect(restored.mode).toBe('competitive');
    expect(restored.round).toBe(state.round);
    expect(restored.phase).toBe(state.phase);
    expect(restored.doomToll).toBe(state.doomToll);
    expect(restored.players.length).toBe(2);
  });

  it('round-trips a 4-player state', () => {
    const state = makeState(4);
    const json = serializeGameState(state, 'sess-4');
    const restored = deserializeGameState(json);

    expect(restored.players.length).toBe(4);
    expect(restored.turnOrder.length).toBe(4);
  });

  it('preserves seed', () => {
    const state = makeState();
    const json = serializeGameState(state, 'sess-seed');
    const restored = deserializeGameState(json);
    expect(restored.seed).toBe(state.seed);
  });

  it('serialized JSON includes schema version', () => {
    const json = serializeGameState(makeState(), 'sess-ver');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(SCHEMA_VERSION);
  });

  it('serialized JSON includes timestamp', () => {
    const before = Date.now();
    const json = serializeGameState(makeState(), 'sess-ts');
    const parsed = JSON.parse(json);
    expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
  });

  it('throws on schema version mismatch', () => {
    const json = serializeGameState(makeState(), 'sess-bad');
    const parsed = JSON.parse(json);
    parsed.version = SCHEMA_VERSION + 999;
    expect(() => deserializeGameState(JSON.stringify(parsed))).toThrow(/Incompatible schema version/);
  });

  it('currentBehaviorCard null is preserved', () => {
    const state = makeState();
    state.currentBehaviorCard = null;
    const restored = deserializeGameState(serializeGameState(state, 's'));
    expect(restored.currentBehaviorCard).toBeNull();
  });
});

// ── saveGame / loadGame / deleteGame ──────────────────────────────────────────

describe('saveGame / loadGame / deleteGame', () => {
  beforeEach(() => {
    setStorageBackend(new MemoryStorageBackend());
  });

  it('saveGame returns true on success', () => {
    const state = makeState();
    expect(saveGame(state, 'session-1')).toBe(true);
  });

  it('loadGame returns null when session not found', () => {
    expect(loadGame('nonexistent')).toBeNull();
  });

  it('loadGame restores saved state', () => {
    const state = makeState();
    saveGame(state, 'session-2');
    const loaded = loadGame('session-2');
    expect(loaded).not.toBeNull();
    expect(loaded!.mode).toBe(state.mode);
    expect(loaded!.round).toBe(state.round);
    expect(loaded!.players.length).toBe(state.players.length);
  });

  it('deleteGame removes the saved session', () => {
    const state = makeState();
    saveGame(state, 'session-3');
    deleteGame('session-3');
    expect(loadGame('session-3')).toBeNull();
  });

  it('deleteGame returns true on success', () => {
    saveGame(makeState(), 'session-4');
    expect(deleteGame('session-4')).toBe(true);
  });

  it('deleteGame on nonexistent session returns true (no error)', () => {
    expect(deleteGame('ghost')).toBe(true);
  });

  it('storage key uses SESSION_KEY_PREFIX', () => {
    const mem = new MemoryStorageBackend();
    setStorageBackend(mem);
    saveGame(makeState(), 'session-key');
    expect(mem.getItem(`${SESSION_KEY_PREFIX}session-key`)).not.toBeNull();
  });
});

// ── Checkpoint save/load/delete ───────────────────────────────────────────────

describe('saveLocalCheckpoint / loadLocalCheckpoint / deleteLocalCheckpoint', () => {
  beforeEach(() => {
    setStorageBackend(new MemoryStorageBackend());
  });

  const checkpoint: LocalSessionCheckpoint = {
    seed: 1234,
    roundNumber: 5,
    mode: 'cooperative',
    playerCount: 3,
    aiDifficulties: [null, 'apprentice', 'knight'],
    timestamp: 1000000,
  };

  it('returns null when no checkpoint is saved', () => {
    expect(loadLocalCheckpoint()).toBeNull();
  });

  it('saveLocalCheckpoint returns true', () => {
    expect(saveLocalCheckpoint(checkpoint)).toBe(true);
  });

  it('loadLocalCheckpoint returns the saved checkpoint', () => {
    saveLocalCheckpoint(checkpoint);
    const loaded = loadLocalCheckpoint();
    expect(loaded).not.toBeNull();
    expect(loaded!.seed).toBe(1234);
    expect(loaded!.roundNumber).toBe(5);
    expect(loaded!.mode).toBe('cooperative');
    expect(loaded!.playerCount).toBe(3);
  });

  it('deleteLocalCheckpoint removes the checkpoint', () => {
    saveLocalCheckpoint(checkpoint);
    deleteLocalCheckpoint();
    expect(loadLocalCheckpoint()).toBeNull();
  });

  it('deleteLocalCheckpoint returns true', () => {
    expect(deleteLocalCheckpoint()).toBe(true);
  });

  it('checkpoint is stored under LOCAL_CHECKPOINT_KEY', () => {
    const mem = new MemoryStorageBackend();
    setStorageBackend(mem);
    saveLocalCheckpoint(checkpoint);
    expect(mem.getItem(LOCAL_CHECKPOINT_KEY)).not.toBeNull();
  });
});

// ── validateGameState ─────────────────────────────────────────────────────────

describe('validateGameState', () => {
  it('returns isValid=true for a freshly created state', () => {
    const { isValid, errors } = validateGameState(makeState());
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects player count below 2', () => {
    const state = makeState(2);
    state.players = [state.players[0]]; // 1 player
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('player count'))).toBe(true);
  });

  it('rejects doom toll below 0', () => {
    const state = makeState();
    state.doomToll = -1;
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('doom toll'))).toBe(true);
  });

  it('rejects doom toll above 13', () => {
    const state = makeState();
    state.doomToll = 14;
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('doom toll'))).toBe(true);
  });

  it('rejects round number below 1', () => {
    const state = makeState();
    state.round = 0;
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('round number'))).toBe(true);
  });

  it('rejects invalid phase', () => {
    const state = makeState();
    (state as GameState & { phase: string }).phase = 'invalid-phase';
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('phase'))).toBe(true);
  });

  it('rejects turn order length mismatch', () => {
    const state = makeState(2);
    (state as GameState & { turnOrder: number[] }).turnOrder = [0]; // only 1 of 2 players
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('Turn order'))).toBe(true);
  });

  it('rejects active player index out of range', () => {
    const state = makeState(2);
    state.activePlayerIndex = 5;
    const { isValid, errors } = validateGameState(state);
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('active player index'))).toBe(true);
  });

  it('accumulates multiple errors independently', () => {
    const state = makeState(2);
    state.doomToll = -1;
    state.round = 0;
    const { errors } = validateGameState(state);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts doom toll of exactly 13 (max valid)', () => {
    const state = makeState();
    state.doomToll = 13;
    const { isValid } = validateGameState(state);
    expect(isValid).toBe(true);
  });
});

// ── getGameSummary ────────────────────────────────────────────────────────────

describe('getGameSummary', () => {
  beforeEach(() => {
    setStorageBackend(new MemoryStorageBackend());
  });

  it('returns null for a nonexistent session', () => {
    expect(getGameSummary('ghost')).toBeNull();
  });

  it('returns a summary for a saved session', () => {
    const state = makeState(3);
    saveGame(state, 'summary-session');
    const summary = getGameSummary('summary-session');

    expect(summary).not.toBeNull();
    expect(summary!.round).toBe(state.round);
    expect(summary!.doomToll).toBe(state.doomToll);
    expect(summary!.playerCount).toBe(3);
    expect(summary!.mode).toBe('competitive');
    expect(typeof summary!.timestamp).toBe('number');
  });

  it('summary reflects the saved round, not just round 1', () => {
    const state = makeState();
    state.round = 7;
    saveGame(state, 'round-7-session');
    expect(getGameSummary('round-7-session')!.round).toBe(7);
  });
});
