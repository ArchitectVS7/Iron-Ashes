import { describe, it, expect } from 'vitest';
import {
  createCharacter,
  createStartingFellowship,
  POWER_LEVELS,
  MAX_FELLOWSHIP_SIZE,
} from '../../src/models/characters.js';

describe('Characters Model', () => {
  describe('POWER_LEVELS', () => {
    it('should define correct power levels per PRD', () => {
      expect(POWER_LEVELS.leader).toBe(8);
      expect(POWER_LEVELS.warrior).toBe(6);
      expect(POWER_LEVELS.diplomat).toBe(0);
      expect(POWER_LEVELS.producer).toBe(3);
    });
  });

  describe('MAX_FELLOWSHIP_SIZE', () => {
    it('should be 8 per PRD', () => {
      expect(MAX_FELLOWSHIP_SIZE).toBe(8);
    });
  });

  describe('createCharacter()', () => {
    it('should create a character with the correct power level for its role', () => {
      const knight = createCharacter('k1', 'warrior');
      expect(knight.role).toBe('warrior');
      expect(knight.powerLevel).toBe(6);
      expect(knight.diplomaticActionUsed).toBe(false);
    });

    it('should create a diplomat with power level 0', () => {
      const herald = createCharacter('h1', 'diplomat');
      expect(herald.powerLevel).toBe(0);
    });
  });

  describe('createStartingFellowship()', () => {
    it('should create a Fellowship with exactly 4 characters', () => {
      const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
      expect(fellowship.characters.length).toBe(4);
    });

    it('should include one of each starting role', () => {
      const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
      const roles = fellowship.characters.map((c) => c.role);
      expect(roles).toContain('leader');
      expect(roles).toContain('warrior');
      expect(roles).toContain('diplomat');
      expect(roles).toContain('producer');
    });

    it('should set the starting node correctly', () => {
      const fellowship = createStartingFellowship(2, 'keep-2', 'court-2');
      expect(fellowship.currentNode).toBe('keep-2');
      expect(fellowship.courtIndex).toBe(2);
    });

    it('should generate unique character IDs with the prefix', () => {
      const fellowship = createStartingFellowship(0, 'keep-0', 'court-0');
      const ids = fellowship.characters.map((c) => c.id);
      expect(new Set(ids).size).toBe(4); // All unique
      expect(ids.every((id) => id.startsWith('court-0'))).toBe(true);
    });
  });
});
