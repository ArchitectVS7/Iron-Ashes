/**
 * Strategic archetypes (Stage 4b) — the diverse AI "players" the balance sim
 * pits against each other, from aggressive to defensive.
 *
 * Each archetype is a full `AIPolicy` (every knob explicit) with a stable id. The
 * `baseline` archetype IS `DEFAULT_AI_POLICY` (same object reference) so a
 * homogeneous baseline table reproduces the plain AI-vs-AI game bit-for-bit, and
 * the referential-identity guard in `chooseAction` only diverges for the others.
 *
 * The 6 STRATEGY vectors are hand-editable data: data/archetypes.json → archetypes.gen.ts
 * (run `npm run gen:data` after editing). `baseline` is deliberately NOT in the JSON — it
 * must stay the DEFAULT_AI_POLICY object reference for the identity guard. The point of
 * the roster is to prove no single strategy dominates (the §9 "no dominant line").
 */

import { DEFAULT_AI_POLICY, type AIPolicy } from '../ai-player.js';
import { ARCHETYPE_DATA } from './archetypes.gen.js';

export type ArchetypeId =
  | 'baseline'
  | 'aggressor'
  | 'turtle'
  | 'opportunist'
  | 'cooperator'
  | 'gambler'
  | 'saboteur';

export interface Archetype {
  readonly id: ArchetypeId;
  readonly label: string;
  readonly policy: AIPolicy;
}

/** The roster. `baseline` reuses DEFAULT_AI_POLICY by reference (identity guard); the
 *  6 strategy vectors flow from data/archetypes.json via archetypes.gen.ts. */
export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = Object.freeze({
  baseline: { id: 'baseline', label: 'Baseline economic', policy: DEFAULT_AI_POLICY },
  aggressor: { id: 'aggressor', label: ARCHETYPE_DATA.aggressor.label, policy: ARCHETYPE_DATA.aggressor.policy },
  turtle: { id: 'turtle', label: ARCHETYPE_DATA.turtle.label, policy: ARCHETYPE_DATA.turtle.policy },
  opportunist: { id: 'opportunist', label: ARCHETYPE_DATA.opportunist.label, policy: ARCHETYPE_DATA.opportunist.policy },
  cooperator: { id: 'cooperator', label: ARCHETYPE_DATA.cooperator.label, policy: ARCHETYPE_DATA.cooperator.policy },
  gambler: { id: 'gambler', label: ARCHETYPE_DATA.gambler.label, policy: ARCHETYPE_DATA.gambler.policy },
  saboteur: { id: 'saboteur', label: ARCHETYPE_DATA.saboteur.label, policy: ARCHETYPE_DATA.saboteur.policy },
});

export const ARCHETYPE_IDS: readonly ArchetypeId[] =
  Object.keys(ARCHETYPES) as ArchetypeId[];

/** Look up an archetype's policy by id. */
export function policyOf(id: ArchetypeId): AIPolicy {
  return ARCHETYPES[id].policy;
}
