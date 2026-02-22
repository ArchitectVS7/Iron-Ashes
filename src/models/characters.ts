/**
 * Character & Fellowship Data Models
 *
 * Characters are typed by role. Each role has a fixed Power Level in v1.0.
 * A Fellowship is a player's collection of characters on the board.
 */

/** Character roles map to GLL token keys. */
export type CharacterRole = 'leader' | 'warrior' | 'diplomat' | 'producer';

/** Power levels per role (fixed in v1.0). */
export const POWER_LEVELS: Record<CharacterRole, number> = {
  leader: 8,
  warrior: 6,
  diplomat: 0,
  producer: 3,
};

/** A single character in a Fellowship. */
export interface Character {
  /** Unique identifier. */
  readonly id: string;
  /** The character's role. */
  readonly role: CharacterRole;
  /** Power level (derived from role, fixed in v1.0). */
  readonly powerLevel: number;
  /** Whether this diplomat has used their diplomatic action (once per game). */
  diplomaticActionUsed: boolean;
}

/** A player's Fellowship — their warband on the board. */
export interface Fellowship {
  /** The court index (0-3) this Fellowship belongs to. */
  readonly courtIndex: number;
  /** All characters in the Fellowship (max 8 including leader). */
  characters: Character[];
  /** The node ID where this Fellowship is currently located. */
  currentNode: string;
}

/** Maximum Fellowship size (including leader). */
export const MAX_FELLOWSHIP_SIZE = 8;

/** Create a character with a unique ID. */
export function createCharacter(id: string, role: CharacterRole): Character {
  return {
    id,
    role,
    powerLevel: POWER_LEVELS[role],
    diplomaticActionUsed: false,
  };
}

/** Create the starting Fellowship for a court. */
export function createStartingFellowship(
  courtIndex: number,
  startingNodeId: string,
  idPrefix: string,
): Fellowship {
  return {
    courtIndex,
    characters: [
      createCharacter(`${idPrefix}-leader`, 'leader'),
      createCharacter(`${idPrefix}-warrior`, 'warrior'),
      createCharacter(`${idPrefix}-diplomat`, 'diplomat'),
      createCharacter(`${idPrefix}-producer`, 'producer'),
    ],
    currentNode: startingNodeId,
  };
}
