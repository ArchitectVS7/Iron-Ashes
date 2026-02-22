/**
 * GLL (Genre Language Library) Type Definitions
 *
 * The GLL system ensures all in-world nouns are swappable content wrappers.
 * No noun is hardcoded in game logic — the engine references GLL token keys,
 * and the active content pack provides the concrete names, descriptions,
 * and presentation data.
 *
 * Example: the engine refers to `"antagonist"`, the Iron Throne content pack
 * resolves it to "Shadowking", and a Sea of Knives pack resolves it to
 * "Colonial Powers".
 */

/** Categories of GLL tokens for organization and validation. */
export type GLLCategory =
  | 'faction'
  | 'character'
  | 'location'
  | 'resource'
  | 'force'
  | 'mechanic'
  | 'artifact'
  | 'event';

/** A single GLL token definition within a content pack. */
export interface GLLTokenDef {
  /** Display name shown to players (e.g., "Shadowking"). */
  readonly name: string;
  /** Short description for tooltips and tutorial text. */
  readonly description: string;
  /** Plural form if applicable (e.g., "War Banners"). */
  readonly plural?: string;
  /** Category for grouping and validation. */
  readonly category: GLLCategory;
}

/**
 * A complete GLL content pack that maps engine token keys to themed content.
 * Every key used by the engine must be present in any valid content pack.
 */
export interface GLLContentPack {
  /** Unique identifier for this content pack (e.g., "iron-throne"). */
  readonly id: string;
  /** Display name (e.g., "Iron Throne of Ashes"). */
  readonly name: string;
  /** All token definitions, keyed by engine token key. */
  readonly tokens: Readonly<Record<string, GLLTokenDef>>;
}

/**
 * The set of token keys the Alliance Engine requires.
 * Any valid GLLContentPack must define all of these.
 */
export const REQUIRED_GLL_KEYS = [
  // Factions
  'faction',
  'faction_leader',

  // Characters
  'char_leader',
  'char_warrior',
  'char_diplomat',
  'char_producer',
  'char_wanderer',

  // Locations
  'loc_board',
  'loc_stronghold',
  'loc_forge',
  'loc_antagonist_base',
  'loc_neutral_center',
  'loc_starting_keep',

  // Resources
  'res_primary',
  'res_fate_card',
  'res_penalty_card',

  // Antagonist forces
  'force_antagonist',
  'force_lieutenant',
  'force_minion',

  // Artifacts
  'artifact_core',

  // Mechanics
  'mech_doom_track',
  'mech_combat',
  'mech_broken_state',
  'mech_rescue',
  'mech_vote',
  'mech_diplomatic_action',
  'mech_traitor_card',

  // Events
  'event_spawn',
  'event_move',
  'event_claim',
  'event_assault',
  'event_escalate',
] as const;

/** Union type of all required GLL token keys. */
export type GLLKey = (typeof REQUIRED_GLL_KEYS)[number];
