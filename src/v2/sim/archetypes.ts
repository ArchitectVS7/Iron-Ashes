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
  | 'gambler'
  | 'saboteur';

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
      defensiveness: 0.1, claimVsRaidPref: 0.3, gambitAmbition: 0.2, rescueWillingness: 0.2, gambitContest: 0.9,
      heraldAffinity: 0.05, parleyBias: 0.2, forgeValuation: 0.7, darkHuntBias: 0.7, oathWillingness: 0.2, oathLoyalty: 0.45, // fights more than it allies; sometimes betrays
    },
  },
  turtle: {
    id: 'turtle',
    label: 'Turtle (defensive, holds & pledges)',
    policy: {
      selfishness: 0.2, targetCover: 0.7, handReserve: 1,
      pledgeGenerosity: 0.8, aggression: 0.05, raidLeaderBias: 0,
      defensiveness: 0.9, claimVsRaidPref: 0.9, gambitAmbition: 0, rescueWillingness: 0.6, gambitContest: 0.5,
      heraldAffinity: 0.7, parleyBias: 0.8, forgeValuation: 0.3, darkHuntBias: 0.5, oathWillingness: 0.6, oathLoyalty: 0.9, // a loyal ally
    },
  },
  opportunist: {
    id: 'opportunist',
    label: 'Opportunist (situational, steers the dark)',
    policy: {
      selfishness: 0.4, targetCover: 0.5, handReserve: 1,
      pledgeGenerosity: 0.9, aggression: 0.5, raidLeaderBias: 0.9,
      defensiveness: 0.3, claimVsRaidPref: 0.5, gambitAmbition: 0.3, rescueWillingness: 0.5, gambitContest: 0.8,
      heraldAffinity: 0.4, parleyBias: 0.5, forgeValuation: 0.6, darkHuntBias: 0.5, oathWillingness: 0.5, oathLoyalty: 0.5, // the schemer — swears, sometimes betrays
    },
  },
  cooperator: {
    id: 'cooperator',
    label: 'Cooperator (high pledge, rescues, no raiding)',
    policy: {
      selfishness: 0.0, targetCover: 0.6, handReserve: 1,
      pledgeGenerosity: 1.6, aggression: 0.0, raidLeaderBias: 0,
      defensiveness: 0.4, claimVsRaidPref: 0.8, gambitAmbition: 0, rescueWillingness: 0.9, gambitContest: 0.4,
      heraldAffinity: 0.6, parleyBias: 0.7, forgeValuation: 0.2, darkHuntBias: 0.6, oathWillingness: 0.8, oathLoyalty: 0.95, // the loyal allier (rescues forge Oaths)
    },
  },
  gambler: {
    id: 'gambler',
    label: 'Gambler (pursues the Crown\'s Gambit)',
    policy: {
      selfishness: 0.5, targetCover: 0.5, handReserve: 1,
      pledgeGenerosity: 0.7, aggression: 0.4, raidLeaderBias: 0.3,
      defensiveness: 0.1, claimVsRaidPref: 0.4, gambitAmbition: 0.9, rescueWillingness: 0,
      heraldAffinity: 0.0, parleyBias: 0.0, forgeValuation: 0.8, darkHuntBias: 0.1, oathWillingness: 0.2, oathLoyalty: 0.5, // single-minded on the Gambit
    },
  },
  saboteur: {
    id: 'saboteur',
    label: 'Saboteur (Blood Pact traitor — suppresses pledges, feeds the dark)',
    policy: {
      // Plays a normal-looking opportunist UNLESS it actually holds the Pact, at
      // which point saboteurPledgeSuppression suppresses its pledges + front pushback.
      selfishness: 0.6, targetCover: 0.4, handReserve: 1,
      pledgeGenerosity: 0.8, aggression: 0.4, raidLeaderBias: 0.4,
      defensiveness: 0.2, claimVsRaidPref: 0.5, gambitAmbition: 0,
      rescueWillingness: 0.3, gambitContest: 0.6, saboteurPledgeSuppression: 0.8,
      heraldAffinity: 0.2, parleyBias: 0.3, forgeValuation: 0.4, darkHuntBias: 0.3, oathWillingness: 0.4, oathLoyalty: 0.45, // treacherous (already a traitor)
    },
  },
});

export const ARCHETYPE_IDS: readonly ArchetypeId[] =
  Object.keys(ARCHETYPES) as ArchetypeId[];

/** Look up an archetype's policy by id. */
export function policyOf(id: ArchetypeId): AIPolicy {
  return ARCHETYPES[id].policy;
}
