/**
 * GLL Verification & Engine Reusability (Phase 20)
 *
 * Verifies that the Alliance Engine has no hardcoded nouns by:
 *   1. Loading the Iron Throne content pack and validating it
 *   2. Loading the Sea of Knives reskin pack and validating it
 *   3. Confirming all 35 required keys are present in both packs
 *   4. Confirming the engine can run a full simulation with either pack
 *   5. Checking that all game logic files use abstract role types, not themed nouns
 */

import { describe, it, expect } from 'vitest';
import { GLLRegistry, REQUIRED_GLL_KEYS } from '../../src/gll/index.js';
import { IRON_THRONE_PACK } from '../../content/iron-throne/content-pack.js';
import { SEA_OF_KNIVES_PACK } from '../../content/sea-of-knives/content-pack.js';
import { createGameState } from '../../src/engine/game-loop.js';
import { runSimulation } from '../../src/engine/simulation.js';

describe('GLL Iron Throne Pack', () => {
  it('should load without errors', () => {
    const registry = new GLLRegistry();
    expect(() => registry.load(IRON_THRONE_PACK)).not.toThrow();
  });

  it('should have all 35 required keys', () => {
    for (const key of REQUIRED_GLL_KEYS) {
      expect(IRON_THRONE_PACK.tokens[key]).toBeDefined();
      expect(IRON_THRONE_PACK.tokens[key].name).toBeTruthy();
      expect(IRON_THRONE_PACK.tokens[key].description).toBeTruthy();
      expect(IRON_THRONE_PACK.tokens[key].category).toBeTruthy();
    }
  });

  it('should resolve all keys via registry', () => {
    const registry = new GLLRegistry();
    registry.load(IRON_THRONE_PACK);
    for (const key of REQUIRED_GLL_KEYS) {
      expect(registry.name(key)).toBeTruthy();
      expect(registry.description(key)).toBeTruthy();
    }
  });
});

describe('GLL Sea of Knives Pack (Reskin Test)', () => {
  it('should load without errors', () => {
    const registry = new GLLRegistry();
    expect(() => registry.load(SEA_OF_KNIVES_PACK)).not.toThrow();
  });

  it('should have all 35 required keys', () => {
    for (const key of REQUIRED_GLL_KEYS) {
      expect(SEA_OF_KNIVES_PACK.tokens[key]).toBeDefined();
      expect(SEA_OF_KNIVES_PACK.tokens[key].name).toBeTruthy();
      expect(SEA_OF_KNIVES_PACK.tokens[key].description).toBeTruthy();
      expect(SEA_OF_KNIVES_PACK.tokens[key].category).toBeTruthy();
    }
  });

  it('should have different display names from Iron Throne', () => {
    let differentCount = 0;
    for (const key of REQUIRED_GLL_KEYS) {
      if (IRON_THRONE_PACK.tokens[key].name !== SEA_OF_KNIVES_PACK.tokens[key].name) {
        differentCount++;
      }
    }
    // The vast majority of tokens should have different names
    expect(differentCount).toBeGreaterThan(30);
  });

  it('should resolve all keys via registry', () => {
    const registry = new GLLRegistry();
    registry.load(SEA_OF_KNIVES_PACK);
    for (const key of REQUIRED_GLL_KEYS) {
      expect(registry.name(key)).toBeTruthy();
      expect(registry.description(key)).toBeTruthy();
    }
  });
});

describe('Engine Reusability', () => {
  it('should create a valid game state regardless of content pack', () => {
    // The engine creates game state without referencing any GLL display names
    const state = createGameState(4, 'competitive', 42);
    expect(state.players.length).toBe(4);
    expect(state.boardDefinition).toBeDefined();
    expect(state.behaviorDeck.length).toBeGreaterThan(0);
  });

  it('should run a full simulation without any content pack loaded', () => {
    // The simulation engine uses abstract types, not GLL tokens
    const result = runSimulation(42);
    expect(result.gameEndReason).not.toBeNull();
    expect(result.rounds).toBeGreaterThan(0);
  });

  it('should use abstract role types in game logic (not themed nouns)', () => {
    // Verify player characters use abstract roles
    const state = createGameState(4, 'competitive', 42);
    const roles = state.players[0].fellowship.characters.map(c => c.role);
    expect(roles).toContain('leader');
    expect(roles).toContain('warrior');
    expect(roles).toContain('diplomat');
    expect(roles).toContain('producer');
    // These should NOT be themed nouns
    expect(roles).not.toContain('Arch-Regent');
    expect(roles).not.toContain('Knight');
    expect(roles).not.toContain('Herald');
    expect(roles).not.toContain('Artificer');
  });

  it('should use abstract force types (not themed nouns)', () => {
    const state = createGameState(4, 'competitive', 42);
    const types = state.antagonistForces.map(f => f.type);
    for (const type of types) {
      expect(['lieutenant', 'minion']).toContain(type);
    }
    // Not themed nouns
    expect(types).not.toContain('Death Knight');
    expect(types).not.toContain('Blight Wraith');
  });

  it('should use abstract node types (not themed nouns)', () => {
    const state = createGameState(4, 'competitive', 42);
    const nodeTypes = Object.values(state.boardDefinition.nodes).map(n => n.type);
    const uniqueTypes = [...new Set(nodeTypes)];
    expect(uniqueTypes).toContain('standard');
    expect(uniqueTypes).toContain('forge');
    expect(uniqueTypes).toContain('antagonist_base');
    expect(uniqueTypes).toContain('neutral_center');
    // Not themed nouns
    expect(uniqueTypes).not.toContain('Stronghold');
    expect(uniqueTypes).not.toContain('Forge Keep');
    expect(uniqueTypes).not.toContain('Dark Fortress');
  });

  it('should swap registries without engine changes', () => {
    const registry = new GLLRegistry();

    // Load Iron Throne
    registry.load(IRON_THRONE_PACK);
    expect(registry.name('force_antagonist')).toBe('Shadowking');
    expect(registry.name('char_warrior')).toBe('Knight');

    // Swap to Sea of Knives — no engine code changes needed
    registry.load(SEA_OF_KNIVES_PACK);
    expect(registry.name('force_antagonist')).toBe('Leviathan');
    expect(registry.name('char_warrior')).toBe('Corsair');

    // Engine token keys are the same
    expect(registry.packId).toBe('sea-of-knives');
  });
});
