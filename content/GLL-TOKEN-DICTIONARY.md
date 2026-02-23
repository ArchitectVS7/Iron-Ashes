# GLL Token Dictionary

> Alliance Engine v1.0 — Genre Language Library Reference

This document defines all 35 required GLL token keys. Every content pack must provide a `GLLTokenDef` for each key listed below. The engine references these keys internally — it never uses themed nouns in game logic.

## How to Create a Reskin

1. Copy `content/iron-throne/content-pack.ts` as a starting template.
2. Replace all `name`, `plural`, and `description` values with your theme.
3. Keep every key present — the registry validates completeness on load.
4. Import and load your pack with `GLLRegistry.load(yourPack)`.
5. Run `tests/gll/reskin.test.ts` to verify swappability.

See `content/sea-of-knives/content-pack.ts` for a working example (Age of Sail pirate reskin).

---

## Token Keys by Category

### Factions (2 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `faction` | A player's faction | Elemental Court | Pirate Fleet |
| `faction_leader` | The faction's leader character | Arch-Regent | Admiral |

### Characters (5 keys)

| Key | Engine Role | Power | Iron Throne | Sea of Knives |
|---|---|---|---|---|
| `char_leader` | Leader role — drives Fate Card draw, cannot be removed | 8 | Arch-Regent | Admiral |
| `char_warrior` | Combat specialist — claims strongholds, challenges lieutenants | 6 | Knight | Corsair |
| `char_diplomat` | Recruiter — reveals wanderers, grants diplomatic protection solo | 0 | Herald | Envoy |
| `char_producer` | Resource generator — output multiplied at forge nodes | 3 | Artificer | Quartermaster |
| `char_wanderer` | Face-down tokens distributed across the board at game start | — | Unknown Wanderer | Drifter |

### Locations (6 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `loc_board` | The game board / map | The Known Lands | The Shattered Seas |
| `loc_stronghold` | Standard claimable node (+1 resource/turn) | Stronghold | Harbor |
| `loc_forge` | High-value node (+3 resource/turn) | Forge Keep | Trade Port |
| `loc_antagonist_base` | Antagonist home — not claimable by players | Dark Fortress | Leviathan's Maw |
| `loc_neutral_center` | Neutral node where the core artifact starts | Hall of Neutrality | Freeport |
| `loc_starting_keep` | Pre-claimed starting node for each faction | Starting Keep | Home Port |

### Resources (3 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `res_primary` | The single unified resource — pays for movement, claiming, combat | War Banner | Doubloon |
| `res_fate_card` | Drawn in combat and spent during voting | Fate Card | Fortune Card |
| `res_penalty_card` | Accumulated from combat losses, triggers broken state | Penalty Card | Damage Card |

### Antagonist Forces (3 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `force_antagonist` | The autonomous antagonist entity | Shadowking | Leviathan |
| `force_lieutenant` | Mobile antagonist unit (Power 10) — defeating one recedes doom | Death Knight | Man-o-War |
| `force_minion` | Static antagonist unit (Power 6) — placed by SPAWN cards | Blight Wraith | Kraken Spawn |

### Artifacts (1 key)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `artifact_core` | The central artifact — holding it enables territory victory | Heartstone | Compass Rose |

### Mechanics (7 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `mech_doom_track` | 13-space shared loss track | Doom Toll | Tide Gauge |
| `mech_combat` | Combat resolution mechanic | War Field | Naval Battle |
| `mech_broken_state` | Degraded state (reduced actions, retains voting rights) | Broken Court | Scuttled |
| `mech_rescue` | Action to restore a broken player | Rescue | Salvage |
| `mech_vote` | Voting phase mechanic (COUNTER or ABSTAIN) | Voting Phase | Council |
| `mech_diplomatic_action` | Diplomat's one-time doom reduction at antagonist base | Diplomatic Action | Parley |
| `mech_traitor_card` | Secret traitor card (Blood Pact mode only) | Blood Pact | Kraken's Mark |

### Events / Behavior Cards (5 keys)

| Key | Engine Role | Iron Throne | Sea of Knives |
|---|---|---|---|
| `event_spawn` | Place up to 2 minions adjacent to antagonist base | SPAWN | SURFACE |
| `event_move` | Closest lieutenant moves 2 nodes toward leading player | MOVE | SURGE |
| `event_claim` | Farthest lieutenant claims nearest unclaimed stronghold | CLAIM | SEIZE |
| `event_assault` | Lieutenant adjacent to weakest player initiates combat | ASSAULT | BROADSIDE |
| `event_escalate` | Doom advances by 2 (1 if vote blocked) — cannot be fully blocked | ESCALATE | MAELSTROM |

---

## Token Definition Schema

Each token in a content pack must conform to `GLLTokenDef`:

```typescript
interface GLLTokenDef {
  name: string;         // Display name (e.g., "Shadowking")
  description: string;  // Tooltip/tutorial description
  plural?: string;      // Optional plural form (e.g., "War Banners")
  category: GLLCategory; // One of: faction, character, location, resource,
                         //         force, mechanic, artifact, event
}
```

## Validation

The `GLLRegistry.load(pack)` method validates that all 35 keys are present. Missing keys throw a `GLLValidationError` listing the absent keys. The reskin test suite (`tests/gll/reskin.test.ts`) provides automated verification that:

1. Both content packs load without errors
2. All 35 required keys are defined with name, description, and category
3. Display names differ between packs (proving the engine is theme-agnostic)
4. The engine creates valid game states and runs simulations without any content pack loaded
5. Abstract role types are used in all game logic (not themed nouns)
