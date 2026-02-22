import { describe, it, expect, beforeEach } from 'vitest';
import { GLLRegistry, GLLValidationError } from '../../src/gll/registry.js';
import { GLLContentPack, REQUIRED_GLL_KEYS } from '../../src/gll/types.js';
import { IRON_THRONE_PACK } from '../../content/iron-throne/content-pack.js';

describe('GLLRegistry', () => {
  let registry: GLLRegistry;

  beforeEach(() => {
    registry = new GLLRegistry();
  });

  describe('load()', () => {
    it('should load a valid content pack without error', () => {
      expect(() => registry.load(IRON_THRONE_PACK)).not.toThrow();
      expect(registry.isLoaded).toBe(true);
      expect(registry.packId).toBe('iron-throne');
    });

    it('should throw GLLValidationError for missing keys', () => {
      const incompletePack: GLLContentPack = {
        id: 'incomplete',
        name: 'Incomplete Pack',
        tokens: {
          faction: {
            name: 'Test Faction',
            description: 'A test faction.',
            category: 'faction',
          },
        },
      };

      expect(() => registry.load(incompletePack)).toThrow(GLLValidationError);
    });

    it('should report all missing keys in the error', () => {
      const incompletePack: GLLContentPack = {
        id: 'incomplete',
        name: 'Incomplete Pack',
        tokens: {
          faction: {
            name: 'Test',
            description: 'Test',
            category: 'faction',
          },
        },
      };

      try {
        registry.load(incompletePack);
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GLLValidationError);
        const err = e as GLLValidationError;
        // Should be missing all keys except 'faction'
        expect(err.missingKeys.length).toBe(REQUIRED_GLL_KEYS.length - 1);
        expect(err.missingKeys).not.toContain('faction');
      }
    });
  });

  describe('name()', () => {
    it('should return the display name for a token key', () => {
      registry.load(IRON_THRONE_PACK);
      expect(registry.name('force_antagonist')).toBe('Shadowking');
      expect(registry.name('res_primary')).toBe('War Banner');
      expect(registry.name('mech_doom_track')).toBe('Doom Toll');
    });
  });

  describe('plural()', () => {
    it('should return the explicit plural when defined', () => {
      registry.load(IRON_THRONE_PACK);
      expect(registry.plural('res_primary')).toBe('War Banners');
      expect(registry.plural('force_lieutenant')).toBe('Death Knights');
    });

    it('should fall back to name + "s" when no explicit plural', () => {
      registry.load(IRON_THRONE_PACK);
      // force_antagonist has no plural defined — "Shadowking" → "Shadowkings"
      expect(registry.plural('force_antagonist')).toBe('Shadowkings');
    });
  });

  describe('description()', () => {
    it('should return the description for a token key', () => {
      registry.load(IRON_THRONE_PACK);
      const desc = registry.description('mech_broken_state');
      expect(desc).toContain('elimination');
    });
  });

  describe('error handling', () => {
    it('should throw if no pack is loaded', () => {
      expect(() => registry.name('faction')).toThrow('No GLL content pack loaded');
    });

    it('should report isLoaded as false when no pack loaded', () => {
      expect(registry.isLoaded).toBe(false);
      expect(registry.packId).toBeNull();
    });
  });

  describe('Iron Throne content pack completeness', () => {
    it('should define all required GLL keys', () => {
      // This test ensures the Iron Throne pack stays in sync with engine requirements
      for (const key of REQUIRED_GLL_KEYS) {
        expect(IRON_THRONE_PACK.tokens[key]).toBeDefined();
        expect(IRON_THRONE_PACK.tokens[key].name).toBeTruthy();
        expect(IRON_THRONE_PACK.tokens[key].description).toBeTruthy();
        expect(IRON_THRONE_PACK.tokens[key].category).toBeTruthy();
      }
    });
  });
});
