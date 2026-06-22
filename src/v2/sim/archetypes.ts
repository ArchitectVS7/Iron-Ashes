/**
 * Strategic archetypes (Stage 4b) — the diverse AI "players" the balance sim
 * pits against each other, from aggressive to defensive.
 *
 * Each archetype is a full `AIPolicy` (every knob explicit) with a stable id. The
 * `baseline` archetype IS `DEFAULT_AI_POLICY` (same object reference) so a
 * homogeneous baseline table reproduces the plain AI-vs-AI game bit-for-bit, and
 * the referential-identity guard in `chooseAction` only diverges for the others.
 *
 * Knob values here are plausible *distinct strategies*, not tuned numbers —
 * Stage 5 will sweep them. The point of Stage 4 is to prove no single strategy
 * dominates and balance holds across the spectrum (the §9 "no dominant line").
 */

import { DEFAULT_AI_POLICY, type AIPolicy } from '../ai-player.js';

export type ArchetypeId =
  | 'baseline'
  | 'aggressor'
  | 'turtle'
  | 'opportunist'
  | 'cooperator'
  | 'gambler';

export interface Archetype {
  readonly id: ArchetypeId;
  readonly label: string;
  readonly policy: AIPolicy;
}

/** The roster. `baseline` reuses DEFAULT_AI_POLICY by reference (identity guard). */
export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = Object.freeze({
  baseline: {
    id: 'baseline',
    label: 'Baseline economic',
    policy: DEFAULT_AI_POLICY,
  },
  aggressor: {
    id: 'aggressor',
    label: 'Aggressor (raids, hunts the leader)',
    policy: {
      selfishness: 0.6, targetCover: 0.4, handReserve: 1,
      pledgeGenerosity: 0.6, aggression: 0.9, raidLeaderBias: 0.7,
      defensiveness: 0.1, claimVsRaidPref: 0.3, gambitAmbition: 0.2, rescueWillingness: 0,
    },
  },
  turtle: {
    id: 'turtle',
    label: 'Turtle (defensive, holds & pledges)',
    policy: {
      selfishness: 0.2, targetCover: 0.7, handReserve: 1,
      pledgeGenerosity: 0.8, aggression: 0.05, raidLeaderBias: 0,
      defensiveness: 0.9, claimVsRaidPref: 0.9, gambitAmbition: 0, rescueWillingness: 0.2,
    },
  },
  opportunist: {
    id: 'opportunist',
    label: 'Opportunist (situational, steers the dark)',
    policy: {
      selfishness: 0.4, targetCover: 0.5, handReserve: 1,
      pledgeGenerosity: 0.9, aggression: 0.5, raidLeaderBias: 0.9,
      defensiveness: 0.3, claimVsRaidPref: 0.5, gambitAmbition: 0.3, rescueWillingness: 0.1,
    },
  },
  cooperator: {
    id: 'cooperator',
    label: 'Cooperator (high pledge, rescues, no raiding)',
    policy: {
      selfishness: 0.0, targetCover: 0.6, handReserve: 1,
      pledgeGenerosity: 1.6, aggression: 0.0, raidLeaderBias: 0,
      defensiveness: 0.4, claimVsRaidPref: 0.8, gambitAmbition: 0, rescueWillingness: 0.8,
    },
  },
  gambler: {
    id: 'gambler',
    label: 'Gambler (pursues the Crown\'s Gambit)',
    policy: {
      selfishness: 0.5, targetCover: 0.5, handReserve: 1,
      pledgeGenerosity: 0.7, aggression: 0.4, raidLeaderBias: 0.3,
      defensiveness: 0.1, claimVsRaidPref: 0.4, gambitAmbition: 0.9, rescueWillingness: 0,
    },
  },
});

export const ARCHETYPE_IDS: readonly ArchetypeId[] =
  Object.keys(ARCHETYPES) as ArchetypeId[];

/** Look up an archetype's policy by id. */
export function policyOf(id: ArchetypeId): AIPolicy {
  return ARCHETYPES[id].policy;
}
