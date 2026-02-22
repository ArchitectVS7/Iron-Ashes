/**
 * Iron Throne of Ashes — GLL Content Pack
 *
 * Maps all engine token keys to the dark fantasy theme.
 * This is the launch content pack for Alliance Engine v1.0.
 */

import { GLLContentPack } from '../../src/gll/types.js';

export const IRON_THRONE_PACK: GLLContentPack = {
  id: 'iron-throne',
  name: 'Iron Throne of Ashes',
  tokens: {
    // Factions
    faction: {
      name: 'Elemental Court',
      plural: 'Elemental Courts',
      description: 'One of four dynastic factions vying for control of the Known Lands.',
      category: 'faction',
    },
    faction_leader: {
      name: 'Arch-Regent',
      plural: 'Arch-Regents',
      description: 'The ruler of an Elemental Court. Cannot be removed from a Fellowship.',
      category: 'faction',
    },

    // Characters
    char_leader: {
      name: 'Arch-Regent',
      plural: 'Arch-Regents',
      description: 'Leader of the Fellowship. Drives Fate Card draw count in combat. Power Level 8.',
      category: 'character',
    },
    char_warrior: {
      name: 'Knight',
      plural: 'Knights',
      description: 'Combat specialist. Can claim Strongholds and challenge Death Knights. Power Level 6.',
      category: 'character',
    },
    char_diplomat: {
      name: 'Herald',
      plural: 'Heralds',
      description: 'Recruits Unknown Wanderers and grants Diplomatic Protection when traveling alone. Power Level 0.',
      category: 'character',
    },
    char_producer: {
      name: 'Artificer',
      plural: 'Artificers',
      description: 'Generates War Banners each turn. Output multiplied at Forge Keeps. Power Level 3.',
      category: 'character',
    },
    char_wanderer: {
      name: 'Unknown Wanderer',
      plural: 'Unknown Wanderers',
      description: 'Face-down character tokens distributed across the board. Revealed by Heralds.',
      category: 'character',
    },

    // Locations
    loc_board: {
      name: 'The Known Lands',
      description: 'The point-to-point board representing the world of Iron Throne of Ashes.',
      category: 'location',
    },
    loc_stronghold: {
      name: 'Stronghold',
      plural: 'Strongholds',
      description: 'A claimable node on the board. Standard Strongholds grant +1 War Banner/turn.',
      category: 'location',
    },
    loc_forge: {
      name: 'Forge Keep',
      plural: 'Forge Keeps',
      description: 'A strategic Stronghold that grants +3 War Banners/turn to the controlling Court.',
      category: 'location',
    },
    loc_antagonist_base: {
      name: 'Dark Fortress',
      description: 'The Shadowking\'s home position. Not claimable by players. Target for Herald diplomatic action.',
      category: 'location',
    },
    loc_neutral_center: {
      name: 'Hall of Neutrality',
      description: 'Neutral territory where the Heartstone begins the game.',
      category: 'location',
    },
    loc_starting_keep: {
      name: 'Starting Keep',
      plural: 'Starting Keeps',
      description: 'Each Court\'s home Stronghold, pre-claimed at game start.',
      category: 'location',
    },

    // Resources
    res_primary: {
      name: 'War Banner',
      plural: 'War Banners',
      description: 'The single unified resource. Pays for movement, claiming, and adds to combat strength.',
      category: 'resource',
    },
    res_fate_card: {
      name: 'Fate Card',
      plural: 'Fate Cards',
      description: 'Drawn during combat and spent during Voting Phase. Weighted value distribution.',
      category: 'resource',
    },
    res_penalty_card: {
      name: 'Penalty Card',
      plural: 'Penalty Cards',
      description: 'Accumulated from combat losses. When total meets War Banners, triggers Broken Court.',
      category: 'resource',
    },

    // Antagonist forces
    force_antagonist: {
      name: 'Shadowking',
      description: 'The autonomous AI antagonist. Draws Behavior Cards each round. Has no agenda — follows the card.',
      category: 'force',
    },
    force_lieutenant: {
      name: 'Death Knight',
      plural: 'Death Knights',
      description: 'Mobile Shadowking lieutenant. Power Level 10. Defeating one reduces the Doom Toll by 1.',
      category: 'force',
    },
    force_minion: {
      name: 'Blight Wraith',
      plural: 'Blight Wraiths',
      description: 'Static Shadowking occupation unit. Power Level 6. Claims Strongholds but does not move after placement.',
      category: 'force',
    },

    // Artifacts
    artifact_core: {
      name: 'Heartstone',
      description: 'The ancient artifact that maintained peace. Stolen by the Shadowking. Reclaiming it is the path to victory.',
      category: 'artifact',
    },

    // Mechanics
    mech_doom_track: {
      name: 'Doom Toll',
      description: 'A 13-space shared track. If it reaches 13, all players lose. The primary loss condition.',
      category: 'mechanic',
    },
    mech_combat: {
      name: 'War Field',
      description: 'Combat resolution when two Fellowships share a node. Fate Cards determine the outcome.',
      category: 'mechanic',
    },
    mech_broken_state: {
      name: 'Broken Court',
      description: 'Replaces player elimination. Reduced to 1 action/turn but retains full voting rights.',
      category: 'mechanic',
    },
    mech_rescue: {
      name: 'Rescue',
      description: 'An active Arch-Regent donates Fate Cards to restore a Broken Court player. The emotional peak of the session.',
      category: 'mechanic',
    },
    mech_vote: {
      name: 'Voting Phase',
      description: 'All Arch-Regents vote to COUNTER or ABSTAIN on the Shadowking\'s Behavior Card each round.',
      category: 'mechanic',
    },
    mech_diplomatic_action: {
      name: 'Diplomatic Action',
      description: 'A Herald reaching the Dark Fortress alone reduces the Doom Toll by 1 without combat.',
      category: 'mechanic',
    },
    mech_traitor_card: {
      name: 'Blood Pact',
      description: 'Secret traitor card. The holder wins if the Doom Toll reaches 13. All others lose.',
      category: 'mechanic',
    },

    // Events (Behavior Card types)
    event_spawn: {
      name: 'SPAWN',
      description: 'Place up to 2 Blight Wraiths adjacent to the Dark Fortress.',
      category: 'event',
    },
    event_move: {
      name: 'MOVE',
      description: 'The closest Death Knight moves 2 nodes toward the leading Arch-Regent.',
      category: 'event',
    },
    event_claim: {
      name: 'CLAIM',
      description: 'The farthest Death Knight claims the nearest unoccupied Standard Stronghold.',
      category: 'event',
    },
    event_assault: {
      name: 'ASSAULT',
      description: 'A Death Knight adjacent to the weakest Arch-Regent initiates combat.',
      category: 'event',
    },
    event_escalate: {
      name: 'ESCALATE',
      description: 'Doom Toll advances by 2. Cannot be fully blocked — unanimous vote reduces to +1.',
      category: 'event',
    },
  },
};
