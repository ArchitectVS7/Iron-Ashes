/**
 * Sea of Knives — GLL Content Pack (Reskin Test)
 *
 * An Age of Sail pirate reskin used to verify that the Alliance Engine
 * has no hardcoded nouns. All engine token keys are mapped to nautical
 * theme equivalents.
 */

import { GLLContentPack } from '../../src/gll/types.js';

export const SEA_OF_KNIVES_PACK: GLLContentPack = {
  id: 'sea-of-knives',
  name: 'Sea of Knives',
  tokens: {
    // Factions
    faction: {
      name: 'Pirate Fleet',
      plural: 'Pirate Fleets',
      description: 'One of four rival fleets fighting for control of the Shattered Seas.',
      category: 'faction',
    },
    faction_leader: {
      name: 'Admiral',
      plural: 'Admirals',
      description: 'The commander of a Pirate Fleet. Cannot be removed from a Crew.',
      category: 'faction',
    },

    // Characters
    char_leader: {
      name: 'Admiral',
      plural: 'Admirals',
      description: 'Leader of the Crew. Drives Fate Card draw count in naval battles. Power Level 8.',
      category: 'character',
    },
    char_warrior: {
      name: 'Corsair',
      plural: 'Corsairs',
      description: 'Combat specialist. Can claim Harbors and challenge Man-o-Wars. Power Level 6.',
      category: 'character',
    },
    char_diplomat: {
      name: 'Envoy',
      plural: 'Envoys',
      description: 'Recruits Drifters and grants Safe Passage when sailing alone. Power Level 0.',
      category: 'character',
    },
    char_producer: {
      name: 'Quartermaster',
      plural: 'Quartermasters',
      description: 'Generates Doubloons each turn. Output multiplied at Trade Ports. Power Level 3.',
      category: 'character',
    },
    char_wanderer: {
      name: 'Drifter',
      plural: 'Drifters',
      description: 'Face-down character tokens distributed across the seas. Revealed by Envoys.',
      category: 'character',
    },

    // Locations
    loc_board: {
      name: 'The Shattered Seas',
      description: 'The point-to-point map representing the world of Sea of Knives.',
      category: 'location',
    },
    loc_stronghold: {
      name: 'Harbor',
      plural: 'Harbors',
      description: 'A claimable port on the map. Standard Harbors grant +1 Doubloon/turn.',
      category: 'location',
    },
    loc_forge: {
      name: 'Trade Port',
      plural: 'Trade Ports',
      description: 'A strategic Harbor that grants +3 Doubloons/turn to the controlling Fleet.',
      category: 'location',
    },
    loc_antagonist_base: {
      name: 'Leviathan\'s Maw',
      description: 'The sea monster\'s lair. Not claimable by players. Target for Envoy diplomatic action.',
      category: 'location',
    },
    loc_neutral_center: {
      name: 'Freeport',
      description: 'Neutral waters where the Compass Rose begins the game.',
      category: 'location',
    },
    loc_starting_keep: {
      name: 'Home Port',
      plural: 'Home Ports',
      description: 'Each Fleet\'s starting Harbor, pre-claimed at game start.',
      category: 'location',
    },

    // Resources
    res_primary: {
      name: 'Doubloon',
      plural: 'Doubloons',
      description: 'The single unified resource. Pays for sailing, claiming, and adds to combat strength.',
      category: 'resource',
    },
    res_fate_card: {
      name: 'Fortune Card',
      plural: 'Fortune Cards',
      description: 'Drawn during naval battles and spent during Council. Weighted value distribution.',
      category: 'resource',
    },
    res_penalty_card: {
      name: 'Damage Card',
      plural: 'Damage Cards',
      description: 'Accumulated from battle losses. When total meets Doubloons, triggers Scuttled status.',
      category: 'resource',
    },

    // Antagonist forces
    force_antagonist: {
      name: 'Leviathan',
      description: 'The autonomous sea monster. Draws Tide Cards each round. Follows primal instinct.',
      category: 'force',
    },
    force_lieutenant: {
      name: 'Man-o-War',
      plural: 'Men-o-War',
      description: 'Mobile Leviathan warship. Power Level 10. Defeating one calms the Tides by 1.',
      category: 'force',
    },
    force_minion: {
      name: 'Kraken Spawn',
      plural: 'Kraken Spawn',
      description: 'Static Leviathan tentacle. Power Level 6. Claims Harbors but does not move after surfacing.',
      category: 'force',
    },

    // Artifacts
    artifact_core: {
      name: 'Compass Rose',
      description: 'The ancient navigational artifact. Stolen by the Leviathan. Recovering it is the path to victory.',
      category: 'artifact',
    },

    // Mechanics
    mech_doom_track: {
      name: 'Tide Gauge',
      description: 'A 13-space shared track. If it reaches 13, the seas are lost. The primary loss condition.',
      category: 'mechanic',
    },
    mech_combat: {
      name: 'Naval Battle',
      description: 'Combat resolution when two Crews share a harbor. Fortune Cards determine the outcome.',
      category: 'mechanic',
    },
    mech_broken_state: {
      name: 'Scuttled',
      description: 'Replaces fleet elimination. Reduced to 1 action/turn but retains full Council voting rights.',
      category: 'mechanic',
    },
    mech_rescue: {
      name: 'Salvage',
      description: 'An active Admiral donates Fortune Cards to restore a Scuttled fleet.',
      category: 'mechanic',
    },
    mech_vote: {
      name: 'Council',
      description: 'All Admirals vote to RESIST or YIELD on the Leviathan\'s Tide Card each round.',
      category: 'mechanic',
    },
    mech_diplomatic_action: {
      name: 'Parley',
      description: 'An Envoy reaching the Leviathan\'s Maw alone calms the Tides by 1 without combat.',
      category: 'mechanic',
    },
    mech_traitor_card: {
      name: 'Kraken\'s Mark',
      description: 'Secret traitor card. The bearer wins if the Tides reach 13. All others are lost.',
      category: 'mechanic',
    },

    // Events (Behavior Card types)
    event_spawn: {
      name: 'SURFACE',
      description: 'Up to 2 Kraken Spawn emerge adjacent to the Leviathan\'s Maw.',
      category: 'event',
    },
    event_move: {
      name: 'SURGE',
      description: 'The closest Man-o-War sails 2 harbors toward the leading Admiral.',
      category: 'event',
    },
    event_claim: {
      name: 'SEIZE',
      description: 'The farthest Man-o-War seizes the nearest unclaimed Harbor.',
      category: 'event',
    },
    event_assault: {
      name: 'BROADSIDE',
      description: 'A Man-o-War adjacent to the weakest Admiral opens fire.',
      category: 'event',
    },
    event_escalate: {
      name: 'MAELSTROM',
      description: 'Tides rise by 2. Cannot be fully resisted — unanimous vote reduces to +1.',
      category: 'event',
    },
  },
};
