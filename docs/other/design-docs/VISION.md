# Iron Throne of Ashes

## Vision Document — Alliance Engine

> *“Four ancient courts. One dying world. And a Shadowking who grows stronger while you squabble.”*

**Genre:** Dark Fantasy Strategy
**Format:** Digital board game
**Players:** 2–4
**Session length:** 60–90 minutes
**Engine:** Alliance Engine v1.0

-----

## The Premise

For a thousand years, the Four Elemental Courts — Earth, Air, Fire, and Water — maintained an uneasy peace through the Heartstone Compact. The Heartstone, an artifact of immense power held in the Hall of Neutrality, prevented any one Court from claiming dominance.

When the Shadowking rose from the Blighted Wastes and claimed the Heartstone, the Compact shattered. Each Arch-Regent now rules alone — and every one of them wants the Heartstone back, for very different reasons.

The Doom Toll — a spectral bell that strikes each time the Shadowking’s power grows — has tolled seven times. When it strikes thirteen, the Blighted Wastes consume the Known Lands entirely.

Four Arch-Regents march on the Dark Fortress. Their Fellowships recruit wanderers — Knights, Heralds, Artificers — across the Strongholds between them. Every Stronghold claimed is a vote for your dynasty’s survival.

But the Shadowking’s Death Knights walk, and Blight Wraiths spread where armies fear to go.

-----

## The Central Tension

This is not a game about defeating the Shadowking. It is a game about **who bears the cost of trying.**

Every vote to contain the Shadowking requires spending Fate Cards — your combat currency. Every abstention advances the Doom Toll toward thirteen. The Arch-Regent who is winning has the most territory to lose if the Toll completes. The rivals who are behind can force them to spend, or let the Toll advance and hope to recover ground in the chaos.

The voting mechanic creates a dynamic the design team calls **“check the leader”** — not as a kingmaking mechanism, but as genuine strategic pressure. Cooperation is always expensive. Refusing to cooperate is always dangerous. Someone blinks first every round.

-----

## Design Pillars

### 1. Alliance Over Aggression

The game rewards building political relationships over pure military dominance. A Fellowship of only Knights will win every battle until they run out of ground to stand on. Heralds and Artificers are not support characters — they are the engine of long-term viability.

### 2. The Threat Is Real

The Shadowking is not a speed bump. He draws a Behavior Card every round and acts on it — spawning Blight Wraiths, advancing Death Knights toward the strongest Arch-Regent, claiming Forge Keeps. Ignore him and he wins. Playtesting demonstrated Dark Lord victories in 40% of sessions (target: 15–20% after tuning). This should feel like a real possibility every game.

### 3. No Dead Time

Player elimination is gone. An Arch-Regent reduced to Broken Court state keeps playing — reduced actions, but still voting, still recruiting, still a political factor. Rivals can rescue a Broken Court by donating Fate Cards, restoring their War Banners. The rescue mechanic is not charity — it is alliance-building. Nobody stares at the ceiling.

### 4. Skin-Agnostic Architecture

The full mechanics of Iron Throne of Ashes exist as GLL (Genre Language Library) tokens. Every noun in the game is a swappable wrapper. The same codebase, with a content update, becomes Sea of Knives (Age of Sail), Null Protocol (Cyberpunk), or Verdant Collapse (Eco-Thriller). Design decisions that touch the engine must be made with this in mind.

-----

## The World

### The Four Elemental Courts

Each Court is an Arch-Regent with a distinct visual identity and starting position on the Known Lands map. In the base game, Courts are mechanically symmetric — asymmetric faction powers are an expansion feature.

|Court                   |Element|Aesthetic                                              |
|------------------------|-------|-------------------------------------------------------|
|Court of the Deep Root  |Earth  |Stone fortresses, ancient forests, siege-weight armor  |
|Court of the Gale Throne|Air    |Spire citadels, messenger birds, light cavalry         |
|Court of the Ember Crown|Fire   |Forge cities, volcanic borderlands, heavy industry     |
|Court of the Tide Seal  |Water  |Coastal strongholds, river networks, naval supply lines|

### The Shadowking

The Shadowking does not appear on the board as a player-controlled piece. He is a **system** — a 20-card Behavior Deck that drives autonomous threat behavior each round. He has no agenda beyond the mechanic. He does not negotiate. He does not wait.

His forces:

- **Blight Wraiths** — spread from the Dark Fortress, claiming Strongholds, disrupting production
- **Death Knights** — mobile lieutenants that pursue the strongest Arch-Regent; defeating one reduces the Doom Toll

### The Known Lands

A point-to-point board with 28 Stronghold nodes. Four **Forge Keep Strongholds** occupy the corner positions — high-value production nodes granting +3 War Banners per turn to their controller. These are the primary conflict zones. Control one and you are strong. Control two and everyone is watching you.

-----

## The Fellowship

Your Fellowship is the game. There are no individual hero stats separate from your alliance composition. The characters you recruit determine what you can do.

### The Knight — Power Level 6

Your warband’s fighting core. Knights can take Strongholds, challenge Death Knights, and win open-field battles — but they **cannot recruit**. A Fellowship of only Knights will win every fight until they run out of ground to stand on.

### The Herald — Power Level 0

Only a Herald may reveal Unknown Wanderers — the hidden characters scattered across the Known Lands. Walking a Herald alone through enemy territory grants **Diplomatic Protection**: other Arch-Regents cannot attack a solo Herald. The risk: Blight Wraiths don’t respect this rule. This protection is lost immediately when another Fellowship character joins the Herald’s formation.

### The Artificer — Power Level 3

Generates War Banners — the movement and combat currency of the game. At a Forge Keep Stronghold: 3 Banners per turn to their producing Court. Elsewhere: 1 Banner per turn. Neglect your Artificers and your warband grinds to a halt mid-campaign.

### The Arch-Regent — Power Level 8

Your leader. Always present in your Fellowship. The Arch-Regent’s power drives your card draw in combat — their level determines how many Fate Cards you draw in a War Field engagement.

-----

## Core Mechanics

### War Banners

The single unified resource. War Banners pay for movement, Stronghold claiming (1 Banner per claim), and combat vessel strength. Artificers generate them. Forge Keeps multiply output. Losing Banners in combat makes you weaker across all three dimensions simultaneously.

### The War Field (Combat)

When two Fellowships contest a Stronghold:

1. **Base Strength** = sum of all character Power Levels + War Banner count
1. **Attacker** draws Fate Cards equal to `ceil(Arch-Regent Power ÷ 4)`, plays one face-down
1. **Defender** draws one fewer card, plays one face-up — structural information advantage compensating for not choosing when to fight
1. Reveal. Higher combined total wins. Loser draws Penalty Cards equal to the margin
1. Cumulative Penalty Cards exceeding current War Banner count triggers **Broken Court state**

Ties go to the defender.

### The Doom Toll

A 13-space track visible to all players at all times. It is the shared stakes floor — if it completes, everyone loses.

**Toll Advances (+1):**

- Non-unanimous Voting Phase
- Fate Card deck reshuffle
- Blight Wraith claims a Forge Keep
- Arch-Regent reduced to Broken Court state

**Toll Recedes (−1):**

- Fellowship defeats a Death Knight
- Player reclaims a Forge Keep from Blight Wraith occupation
- Three or more Arch-Regents vote unanimously and spend Fate Cards together

**Final Phase (Toll 10+):**
Two Behavior Cards drawn per round. Wraiths auto-spread every turn regardless of board state. Every vote costs more. Resolution is forced within 4–6 rounds.

### The Voting Phase

Every round, after the Shadowking acts, all Arch-Regents vote to counter the Behavior Card’s effect. Unanimous COUNTER (all active players spend Fate Cards) blocks the card. Any abstention: the card resolves and the Doom Toll advances.

The political engine lives here. The leader has the most to lose from Toll advance. The trailing players have the least — and everyone knows it.

### Broken Court State

Replaces player elimination entirely. When Penalty Cards exceed War Banner count, an Arch-Regent enters Broken Court:

- Reduced to 1 action per turn (down from 2)
- Still participates in every Voting Phase
- Cannot claim new Strongholds
- Cannot initiate War Field engagements

Any active Arch-Regent may rescue a Broken Court by donating 2+ Fate Cards. The rescued player restores War Banners equal to cards donated. The rescuer gains a political chip — and the rescued player’s vote.

-----

## The Traitor Variant — Blood Pact

At game start, one Behavior Card is secretly replaced with a **Blood Pact** card. One Arch-Regent draws it privately via the app — no physical shuffle, no tells.

The Blood Pact Arch-Regent has sworn fealty to the Shadowking. Their hidden win condition: let the Doom Toll reach 13. They cannot win if a player wins first. They cannot win if the Toll never completes.

Their play: subtle abstentions, delayed rescues, Death Knights guided toward rivals — all while maintaining the appearance of a cooperative partner. The Blood Pact cannot be too obvious or the table isolates them. They cannot be too helpful or the Shadowking loses.

If the Shadowking wins, only the Blood Pact Arch-Regent survives the Blighted Wastes.

The reveal triggers at game end — or if they are caught and accused by unanimous vote before then.

-----

## Game Feel — Digital-Exclusive Atmosphere

The digital format enables atmospheric elements that define the experience:

- **Candles dim** on the UI as the Doom Toll advances
- **Blight creep** — a visual spread of darkness across claimed Strongholds in real time as Wraiths occupy them
- **War Field animations** — parchment-and-fire combat resolution with tactile card-flip tension
- **The Shadowking’s silhouette** grows on the horizon as his Doom Track power peaks
- **Blood Pact delivery** — the traitor card is dealt privately through the app, invisible to all other players

The board should feel like it is responding to the game state, not just representing it.

-----

## Three Play Modes

|Mode                    |Description                                                                                                                                                                                       |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Competitive**         |Standard 2–4 player game. One Arch-Regent wins by territory control (most Strongholds when Heartstone is reclaimed + holding the Heartstone) or by being the last Court not in Broken Court state.|
|**Cooperative**         |All Arch-Regents form a temporary alliance against a harder Shadowking Behavior Deck. Win by reclaiming the Heartstone from the Dark Fortress before the Doom Toll completes.                     |
|**Traitor (Blood Pact)**|Standard competitive play with one secret Blood Pact Arch-Regent. Adds a hidden win condition and transforms the voting mechanic into a paranoid read-the-room exercise.                          |

-----

## Tutorial Architecture — Into the Blighted Wastes

The first five turns are a mandatory guided tutorial. Each turn introduces exactly one new mechanic, in the order a real game requires them.

|Turn                     |Objective                                 |Mechanic Introduced                                  |
|-------------------------|------------------------------------------|-----------------------------------------------------|
|1 — March from Your Keep |Move Warband to first unclaimed Stronghold|Movement, War Banner costs, claiming                 |
|2 — Send the Herald Ahead|Deploy a Herald solo to next Stronghold   |Recruitment, Diplomatic Protection                   |
|3 — Your First Battle    |Rival Arch-Regent contests a Stronghold   |War Field resolution, Fate Cards, Penalty Cards      |
|4 — The Toll Strikes     |Shadowking draws first Behavior Card      |Doom Toll, Voting Phase, political cost of abstaining|
|5 — Claim the Forge Keep |Reach a Forge Keep Stronghold             |Production loop, Forge Keep strategic value          |

After Turn 5, optional **Discovered Tutorials** surface contextually — a popup when the player’s first Artificer levels up, when they first rescue a rival, when they first face a Death Knight. Skippable. Never blocking.

-----

## Victory Conditions

**Elimination Victory:** Last Arch-Regent not in Broken Court state wins.

**Territory Victory:** When the Heartstone changes hands (second Fate Card deck reshuffle), the Arch-Regent holding the Heartstone AND controlling the most Strongholds wins.

**Shadowking Victory:** Doom Toll reaches 13. All Arch-Regents lose — except the Blood Pact holder in Traitor mode.

-----

## Where This Sits in the Market

|Competitor          |Gap Iron Throne Fills                                                                                                                                            |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Talisman (Digital)  |No political voting. No shared threat. Pure individual advancement. Iron Throne adds the cooperative dimension Talisman never had.                               |
|Gloomhaven (Digital)|Fully cooperative — no rivalry. Iron Throne keeps the tension of competing goals while maintaining a shared stakes floor.                                        |
|Root (Digital)      |Brilliant but steep. Iron Throne has a 5-turn guided tutorial and symmetric starting positions, removing onboarding friction without sacrificing strategic depth.|

-----

## The Promise

Iron Throne of Ashes is the dark fantasy strategy game that respects its players’ intelligence — complex enough to reward mastery, welcoming enough to teach itself.

Every session tells a different story of dynastic betrayal, last-minute rescue, and one spectacular moment where everyone realizes they waited too long.

One session and you will be planning the next.

-----

*Built on the Alliance Engine — mechanics proven, identity yours.*
*Next titles: Sea of Knives (Age of Sail) · Verdant Collapse (Eco-Thriller)*
