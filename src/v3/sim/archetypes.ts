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

/**
 * Stage V3-4b verb knobs, layered ON TOP of the gen policies here (NOT in data/archetypes.json —
 * the gen substrate stays pristine; these sim-only knobs make the new v3 verbs FIRE in sweeps so
 * the diagnostic metrics are non-zero). Distinct per archetype so the capture/ransom/heart fire
 * rates spread instead of one strategy hogging the mechanic. The saboteur abstains (it wants the
 * doom). `baseline` is deliberately excluded — it MUST stay the DEFAULT_AI_POLICY object reference.
 */
type VerbKnobs = Pick<AIPolicy, 'captureBias' | 'ransomBias' | 'heartBias'>;
const VERB_KNOBS: Readonly<Record<Exclude<ArchetypeId, 'baseline'>, VerbKnobs>> = {
  aggressor: { captureBias: 0.7, heartBias: 0.5 },
  turtle: { ransomBias: 0.7, heartBias: 0.2 },
  opportunist: { captureBias: 0.5, ransomBias: 0.6, heartBias: 0.4 },
  cooperator: { captureBias: 0.2, ransomBias: 0.6, heartBias: 0.6 },
  gambler: { captureBias: 0.3, heartBias: 0.8 },
  saboteur: {},
};

/** Merge the verb knobs onto a gen policy (a new object; never mutates the gen data). */
function withVerbs(base: AIPolicy, knobs: VerbKnobs): AIPolicy {
  return { ...base, ...knobs };
}

/** The roster. `baseline` reuses DEFAULT_AI_POLICY by reference (identity guard); the
 *  6 strategy vectors flow from data/archetypes.json via archetypes.gen.ts, then get the
 *  Stage-4b verb knobs layered on here (sim-only — see VERB_KNOBS). */
export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = Object.freeze({
  baseline: { id: 'baseline', label: 'Baseline economic', policy: DEFAULT_AI_POLICY },
  aggressor: { id: 'aggressor', label: ARCHETYPE_DATA.aggressor.label, policy: withVerbs(ARCHETYPE_DATA.aggressor.policy, VERB_KNOBS.aggressor) },
  turtle: { id: 'turtle', label: ARCHETYPE_DATA.turtle.label, policy: withVerbs(ARCHETYPE_DATA.turtle.policy, VERB_KNOBS.turtle) },
  opportunist: { id: 'opportunist', label: ARCHETYPE_DATA.opportunist.label, policy: withVerbs(ARCHETYPE_DATA.opportunist.policy, VERB_KNOBS.opportunist) },
  cooperator: { id: 'cooperator', label: ARCHETYPE_DATA.cooperator.label, policy: withVerbs(ARCHETYPE_DATA.cooperator.policy, VERB_KNOBS.cooperator) },
  gambler: { id: 'gambler', label: ARCHETYPE_DATA.gambler.label, policy: withVerbs(ARCHETYPE_DATA.gambler.policy, VERB_KNOBS.gambler) },
  saboteur: { id: 'saboteur', label: ARCHETYPE_DATA.saboteur.label, policy: withVerbs(ARCHETYPE_DATA.saboteur.policy, VERB_KNOBS.saboteur) },
});

export const ARCHETYPE_IDS: readonly ArchetypeId[] =
  Object.keys(ARCHETYPES) as ArchetypeId[];

/** Look up an archetype's policy by id. */
export function policyOf(id: ArchetypeId): AIPolicy {
  return ARCHETYPES[id].policy;
}
