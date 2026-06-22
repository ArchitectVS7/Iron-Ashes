/**
 * Matchups (Stage 4c) — deterministic seat → archetype assignments.
 *
 * The sweep runs these table compositions across many seeds so balance is
 * measured where strategies actually collide (not one greedy bot). Each Matchup
 * maps a player count to a fixed list of archetype ids — purely, no RNG, so
 * win-rate-by-archetype is cleanly attributable.
 */

import { ARCHETYPE_IDS, type ArchetypeId } from './archetypes.js';

export interface Matchup {
  readonly id: string;
  /** The archetype at each seat for a given table size. */
  seatsFor(playerCount: number): ArchetypeId[];
}

/** A table where every seat plays the same archetype (self-stability check). */
export function homogeneous(id: ArchetypeId): Matchup {
  return { id: `homo:${id}`, seatsFor: (n) => Array.from({ length: n }, () => id) };
}

/** A fixed diverse lineup — the headline "do strategies coexist" table. */
export const MIXED_CANONICAL: Matchup = {
  id: 'mixed',
  seatsFor: (n) => {
    const order: ArchetypeId[] = ['aggressor', 'turtle', 'opportunist', 'cooperator', 'gambler', 'baseline'];
    return Array.from({ length: n }, (_, s) => order[s % order.length]);
  },
};

/** Alternate two archetypes around the table (A,B,A,B…) — the core pairwise signal. */
export function roundRobin(a: ArchetypeId, b: ArchetypeId): Matchup {
  return { id: `rr:${a}-vs-${b}`, seatsFor: (n) => Array.from({ length: n }, (_, s) => (s % 2 === 0 ? a : b)) };
}

/** Seat 0 is `x`; the rest are baseline — isolates x's edge against a neutral field. */
export function oneVsField(x: ArchetypeId): Matchup {
  return { id: `1vF:${x}`, seatsFor: (n) => Array.from({ length: n }, (_, s) => (s === 0 ? x : 'baseline')) };
}

/** Every distinct unordered pair of archetypes as a round-robin matchup. */
export function allRoundRobins(): Matchup[] {
  const out: Matchup[] = [];
  for (let i = 0; i < ARCHETYPE_IDS.length; i++) {
    for (let j = i + 1; j < ARCHETYPE_IDS.length; j++) {
      out.push(roundRobin(ARCHETYPE_IDS[i], ARCHETYPE_IDS[j]));
    }
  }
  return out;
}

/** Blood Pact tables: a saboteur in seat 0 against varied fields (it becomes the traitor). */
export function bloodPactMatchups(): Matchup[] {
  const fields: ArchetypeId[][] = [
    ['saboteur', 'baseline', 'baseline', 'baseline'],
    ['saboteur', 'cooperator', 'opportunist', 'turtle'],
    ['saboteur', 'aggressor', 'cooperator', 'baseline'],
  ];
  return fields.map((f, i) => ({
    id: `bp:field${i}`,
    seatsFor: (n: number) => Array.from({ length: n }, (_, s) => f[s % f.length]),
  }));
}

/** The default, reasonably-broad matchup set for a balance sweep. */
export function standardMatchups(): Matchup[] {
  return [
    ...ARCHETYPE_IDS.map(homogeneous),
    MIXED_CANONICAL,
    ...allRoundRobins(),
    ...ARCHETYPE_IDS.filter(id => id !== 'baseline').map(oneVsField),
  ];
}
