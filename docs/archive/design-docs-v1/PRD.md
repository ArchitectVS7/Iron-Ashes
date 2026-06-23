# Iron Throne of Ashes — Product Requirements Document

## Alliance Engine v1.0

**Status:** Pre-production
**Engine:** Alliance Engine (GLL-tokenized — all nouns are swappable content wrappers)
**Platform target:** PC (Steam) primary · Mobile (iOS/Android) secondary
**Players:** 2–4 (human + AI fill)
**Session length target:** 60–90 minutes
**Build priority notation:** P0 = launch blocker · P1 = launch required · P2 = post-launch v1.1 · P3 = roadmap

-----

## 1. Product Overview

Iron Throne of Ashes is a digital board game of dynastic rivalry and cooperative threat management built on the Alliance Engine. Four Arch-Regents compete for territory control while collectively managing the Doom Toll — a shared loss condition driven by an autonomous AI antagonist (the Shadowking). No player is eliminated. The Broken Court state replaces elimination entirely.

The game ships with three play modes: Competitive, Cooperative, and Blood Pact (Traitor). All three modes use the same board, the same rules, and the same Behavior Card system. Mode selection changes only the win/loss conditions and whether the Blood Pact card is in circulation.

-----

## 2. Technical Constraints

- The Alliance Engine must treat all in-world nouns as GLL tokens. No noun may be hardcoded in game logic. This enables future reskins (Sea of Knives, Verdant Collapse) without engine changes.
- Behavior Card execution must be fully deterministic from a given seed. Simulation reproducibility is required for balance testing.
- The voting phase must resolve before any player’s action phase in a given round. Order cannot be player-configurable.
- Broken Court state must never prevent a player from participating in the Voting Phase. This is a core design commitment, not an edge case.

-----

## 3. Feature Specifications

-----

### F-001 — Board: The Known Lands

**Priority:** P0

**Description:** A point-to-point graph of 28 Stronghold nodes representing the Known Lands. Connections between nodes define legal movement paths. The board is fixed per game session — no procedural generation.

**Node types:**

- Standard Stronghold (22 nodes) — claimable, no production bonus
- Forge Keep Stronghold (4 nodes) — claimable, grants +3 War Banners/turn to controlling Court (vs. +1 elsewhere)
- Dark Fortress (1 node) — Shadowking home position, not claimable by players, target for Herald diplomatic action
- Hall of Neutrality (1 node) — Heartstone starting position, neutral territory

**Constraints:**

- Forge Keep nodes must be positioned so each Court’s starting position has equal path distance to the nearest Forge Keep (±1 node)
- Dark Fortress must not be adjacent to any Court’s starting Keep
- Each Court’s starting Keep is pre-claimed at game start (not available to other Courts in round 1)

**Acceptance criteria:**

- Board renders correctly at 1080p and 2560×1440
- All 28 nodes are individually selectable with hit area ≥ 44×44px
- Connection paths render as distinct lines, not overlapping
- Forge Keep nodes are visually distinct from Standard Strongholds at a glance (no label required)

-----

### F-002 — Resource: War Banners

**Priority:** P0

**Description:** The single unified resource. War Banners pay for all player actions: movement between nodes (1 Banner per node traversed), Stronghold claiming (1 Banner), combat vessel strength (additive to character power in War Field), and Fate Card draws (via Arch-Regent level, not direct spend).

**Generation:**

- Each Artificer in a Fellowship generates 1 War Banner per turn
- An Artificer at a Forge Keep Stronghold generates 3 War Banners per turn instead
- War Banners do not persist between rounds — unspent Banners are discarded at round end

**Constraints:**

- War Banner count is always visible to all players (open information)
- A player with 0 War Banners may still participate in the Voting Phase (costs Fate Cards, not Banners)
- War Banner count contributes additively to combat strength in the War Field

**Acceptance criteria:**

- War Banner count updates immediately on production, spend, or discard
- The UI clearly distinguishes between current Banners and Banners generated this turn before spend
- Zero-Banner state is visually distinct (cannot be confused with a full hand)

-----

### F-003 — Characters: Fellowship Composition

**Priority:** P0

**Description:** Each player controls a Fellowship — a set of character pieces with distinct mechanical roles. Fellows are recruited during the game; the starting Fellowship is fixed.

**Starting Fellowship (all Courts):**

- 1× Arch-Regent (Power Level 8, always present, cannot be lost)
- 1× Knight (Power Level 6)
- 1× Herald (Power Level 0)
- 1× Artificer (Power Level 3)

**Character roles:**

|Character  |Power Level|Special Rule                                                                                                                                                                |
|-----------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Arch-Regent|8          |Leader. Drives Fate Card draw count. Cannot be removed from Fellowship.                                                                                                     |
|Knight     |6          |Combat specialist. Can claim Strongholds, challenge Death Knights, initiate War Field. Cannot perform Recruit action.                                                       |
|Herald     |0          |Only character that can perform the Recruit action (reveal Unknown Wanderers). Grants Diplomatic Protection when walking alone. Blight Wraiths ignore Diplomatic Protection.|
|Artificer  |3          |Production. Generates War Banners. Multiplied output at Forge Keep Strongholds.                                                                                             |

**Unknown Wanderers:**

- 20 character tokens are distributed face-down across Standard Stronghold nodes at game start
- A Herald adjacent to a face-down token may spend 1 action to reveal it
- Revealed characters join the Herald’s Fellowship immediately
- Wanderer pool composition: 40% Knights, 30% Heralds, 30% Artificers (random distribution across nodes)

**Diplomatic Protection:**

- Active when a Herald occupies a node alone (no other Fellowship characters present on the same node)
- Other Arch-Regents cannot initiate a War Field against a solo Herald
- Blight Wraiths can occupy a node containing a solo Herald (Protection does not apply to Shadowking forces)
- Protection drops immediately when any other Fellowship character enters the Herald’s node

**Constraints:**

- Maximum Fellowship size: 8 characters (including Arch-Regent)
- A Fellowship reduced to only the Arch-Regent can still perform all actions except Recruit
- Character Power Levels are fixed — they do not improve through play in v1.0

**Acceptance criteria:**

- Fellowship composition is visible to all players at all times
- Unknown Wanderer tokens are visually indistinguishable from each other when face-down
- Diplomatic Protection state is clearly indicated on the board (Herald icon change or highlight)
- Recruit action is greyed out (not hidden) when no Herald is in the Fellowship

-----

### F-004 — Combat: The War Field

**Priority:** P0

**Description:** Triggered when two Fellowships are on the same node at the end of a movement action, or when a Fellowship moves into a node occupied by a Shadowking force. The War Field is not optional — if two Fellowships share a node, combat resolves.

**Resolution sequence:**

1. Calculate Base Strength for each side: sum of all character Power Levels + current War Banner count
1. Attacker draws `ceil(Arch-Regent Power Level ÷ 4)` Fate Cards, selects one, plays it face-down
1. Defender draws one fewer Fate Card (minimum 1), selects one, plays it face-up
1. Both cards revealed simultaneously
1. Each side adds their card value to their Base Strength (negative card values reduce strength, floor at 0)
1. Higher total wins. Ties go to Defender.
1. Loser draws Penalty Cards equal to the margin (absolute difference in totals)

**Fate Card values:** Weighted distribution — 0 (8%), 1 (12%), 2 (14%), 3 (10%), 4 (4%), −1 (2%). Remaining 50% of deck is blank (0 value). Deck reshuffles when exhausted; reshuffle advances the Doom Toll by 1.

**Penalty Cards:**

- Accumulated separately from Fate Cards
- When total Penalty Cards ≥ current War Banner count, the Arch-Regent enters Broken Court state
- Penalty Cards are not discarded between rounds — they persist until rescued or the game ends

**Shadowking forces combat:**

- Death Knight base strength: 10 (fixed)
- Blight Wraith base strength: 6 (fixed)
- Shadowking forces do not draw Fate Cards — their strength is fixed
- Defeating a Death Knight reduces the Doom Toll by 1

**Constraints:**

- A player in Broken Court state cannot initiate War Field combat
- A player in Broken Court state can still defend if a War Field is initiated against their node
- War Banner count at the moment of combat resolution is used (not end-of-turn count)

**Acceptance criteria:**

- Both card values are revealed simultaneously (no sequential reveal)
- Margin is displayed clearly before Penalty Cards are assigned
- The face-down/face-up asymmetry is communicated in the tutorial and in a tooltip on the combat screen
- Fate Card deck reshuffle triggers visible notification and Doom Toll advance animation before combat continues

-----

### F-005 — The Doom Toll

**Priority:** P0

**Description:** A 13-space shared track visible to all players at all times. The primary loss condition. If it reaches 13, all players lose (except the Blood Pact holder in Traitor mode).

**Advance triggers (+1 each unless noted):**

- Non-unanimous Voting Phase result
- Fate Card deck reshuffle
- Blight Wraith successfully claims a Forge Keep Stronghold
- Any Arch-Regent enters Broken Court state

**Recede triggers (−1 each):**

- A Fellowship defeats a Death Knight in War Field combat
- A player reclaims a Forge Keep from Blight Wraith occupation
- Three or more active Arch-Regents vote unanimously in a single Voting Phase AND all spend the required Fate Cards

**Final Phase (Toll position 10+):**

- Two Behavior Cards are drawn and resolved per round (instead of one)
- Blight Wraiths auto-spread to one adjacent unoccupied Standard Stronghold per round regardless of Behavior Card
- Voting cost increases by 1 Fate Card (all players spend one additional card for a unanimous vote to count)

**Visual treatment:**

- Toll position is displayed as a large persistent UI element — not a sidebar, not a tooltip
- Positions 1–6: neutral ambient state
- Positions 7–9: candles on UI begin dimming; Shadowking silhouette appears at board edge
- Positions 10–12 (Final Phase): board lighting shifts; ambient audio shifts; Shadowking silhouette grows; Blight Wraith spread animations are more prominent
- Position 13: game-over sequence triggers

**Constraints:**

- Doom Toll cannot advance past 13
- Doom Toll cannot recede below 0
- Multiple advance/recede events in a single round are cumulative and resolved sequentially (order: Shadowking phase first, then player phase events)

**Acceptance criteria:**

- Doom Toll position is readable from any screen position without scrolling
- Final Phase visual state change is immediately noticeable without reading any tooltip
- Toll advance animation plays before the next game action in the sequence (not async)

-----

### F-006 — The Voting Phase

**Priority:** P0

**Description:** Every round, after the Shadowking draws and reveals a Behavior Card, all active Arch-Regents vote to COUNTER or ABSTAIN. Resolves before player action phases.

**Vote resolution:**

- If all active Arch-Regents vote COUNTER and each spends the required Fate Cards: the Behavior Card effect is blocked (or reduced, depending on card type)
- If any Arch-Regent abstains, or any player cannot afford the Fate Card cost: the Behavior Card resolves at full effect and the Doom Toll advances by 1
- Broken Court Arch-Regents vote at full standing (reduced action count does not affect voting rights)

**Fate Card cost per vote:**

- Standard: 1 Fate Card per player
- Final Phase (Toll 10+): 2 Fate Cards per player

**Behavior Card types and vote effects:**

|Card    |Base Effect (if vote fails)                                        |Effect if blocked (unanimous COUNTER)    |
|--------|-------------------------------------------------------------------|-----------------------------------------|
|SPAWN   |+2 Blight Wraiths placed near Dark Fortress                        |Wraiths placed but cannot move this round|
|MOVE    |Lead Death Knight moves toward strongest Arch-Regent               |Death Knight stays in current position   |
|CLAIM   |Lead Death Knight claims nearest unoccupied Standard Stronghold    |Claim cancelled                          |
|ASSAULT |Death Knight initiates War Field against weakest active Arch-Regent|Assault cancelled                        |
|ESCALATE|Doom Toll +2                                                       |Doom Toll +1 (cannot be fully blocked)   |

**Behavior Deck composition (20 cards):** 6× SPAWN · 5× MOVE · 4× CLAIM · 3× ASSAULT · 2× ESCALATE

> **Balance note (from simulation):** Reduce ESCALATE cards from 2 to 1 and add 1 MOVE card. This targets Dark Lord win rate at 18–22% vs. the observed 40%. This change is required before launch.

**Constraints:**

- Vote must be resolved by all players before any action phase begins — no player may skip or defer the vote
- A player with 0 Fate Cards automatically abstains (they cannot COUNTER without cards to spend)
- Vote choices are revealed simultaneously — no player sees another’s vote before committing

**Acceptance criteria:**

- All players’ vote choices are hidden until all have committed (simultaneous reveal)
- A player with insufficient Fate Cards sees a clear indication they will auto-abstain before the vote timer expires
- The Doom Toll advance animation plays immediately after a failed vote, before any player action
- In async/online play, a vote timer of 60 seconds triggers auto-abstain on expiry

-----

### F-007 — Broken Court State

**Priority:** P0

**Description:** Replaces player elimination. When an Arch-Regent’s total Penalty Cards meets or exceeds their current War Banner count, they enter Broken Court state.

**Broken Court effects:**

- Reduced to 1 action per turn (down from 2)
- Cannot initiate War Field combat
- Cannot claim Strongholds
- Cannot perform the Recruit action
- Retains full Voting Phase participation (this is non-negotiable)
- Retains all existing Stronghold claims (does not lose territory on entry)
- Can still defend if War Field is initiated against their node

**Recovery — Rescue:**

- Any active Arch-Regent may perform a Rescue action (costs 1 of their 2 actions for the turn)
- Rescuer donates 2–5 Fate Cards to the Broken Court player
- Rescued player: restores War Banners equal to cards donated, clears all Penalty Cards, returns to full active state immediately
- Rescuer strategic benefit: the rescued player’s next Voting Phase participation is politically implied — they owe a vote

**Constraints:**

- A player cannot rescue themselves
- A player in Broken Court state can receive multiple rescue attempts in one round (but only the first successful one takes effect)
- If all active Arch-Regents simultaneously enter Broken Court state, the game ends as a Draw — all players lose, Doom Toll does not complete

**Acceptance criteria:**

- Broken Court state is visually distinct on the board (Court icon changes, reduced action indicators)
- The Voting Phase UI does not visually demote a Broken Court player’s vote (same size, same position)
- Rescue action is clearly accessible from the action menu — not buried
- Recovery animation (Broken Court → active) is visible to all players

-----

### F-008 — The Shadowking Behavior System

**Priority:** P0

**Description:** The Shadowking is an autonomous system, not a player. Each round he draws one Behavior Card (two in Final Phase) and executes it deterministically. He has no agenda — he follows the card.

**Shadowking forces:**

- Death Knights (2 at game start, max 4): mobile lieutenants that traverse the board and initiate War Fields. Power Level 10.
- Blight Wraiths (0 at game start, max 9): static occupation units that spread from the Dark Fortress. Power Level 6. They claim Strongholds but do not move after placement unless a SPAWN card triggers new placement.

**Card resolution rules:**

- SPAWN: Place up to 2 new Blight Wraiths adjacent to the Dark Fortress. If Dark Fortress is surrounded, place at the farthest reachable node from the leading Arch-Regent’s starting Keep.
- MOVE: The Death Knight closest to the leading Arch-Regent (by node distance) moves 2 nodes toward them.
- CLAIM: The Death Knight farthest from any player Fellowship claims the nearest unoccupied Standard Stronghold.
- ASSAULT: The Death Knight adjacent to the Arch-Regent with the lowest current War Banner count initiates War Field combat.
- ESCALATE: Doom Toll +2 (reduced to +1 if vote is unanimous).

**“Leading Arch-Regent” definition:** The player with the most claimed Strongholds. Ties broken by highest War Banner count at the moment of resolution.

**Constraints:**

- Shadowking forces never target the Dark Fortress or Hall of Neutrality
- Death Knights cannot occupy the same node as a solo Herald (Diplomatic Protection applies to Shadowking MOVE only — not ASSAULT)
- Behavior Card deck reshuffles when exhausted; reshuffle advances Doom Toll by 1 before next card is drawn

**Acceptance criteria:**

- Shadowking action is fully animated and clearly communicated before player actions each round
- The active Behavior Card is displayed on screen during its resolution
- Shadowking forces are visually distinct from all player Fellowship pieces at a glance (no color overlap with Court palette)

-----

### F-009 — Herald Diplomatic Action (Doom Relief Valve)

**Priority:** P1

**Description:** A Herald that reaches the Dark Fortress node via uncontested movement (no War Field on entry) may perform a Diplomatic Action — a solo negotiation that reduces the Doom Toll by 1 without triggering combat.

**Conditions:**

- Herald must be traveling alone (no other Fellowship characters in the same movement group)
- No Death Knight or Blight Wraith may occupy the Dark Fortress at the time of entry (if they do, standard War Field resolution applies)
- Diplomatic Action costs 1 of the Herald’s player’s actions for the turn
- Can only be performed once per game per Herald character (a Herald that completes the action is “marked” and cannot perform it again)

**Design rationale:** Provides a non-combat Doom reduction path that rewards strategic Herald deployment. Narratively coherent (a Herald walking alone into the enemy fortress to negotiate) and mechanically distinct from combat-based relief. Prevents games from locking into a combat-only doom reduction loop.

**Constraints:**

- The Diplomatic Action does not prevent the Shadowking from drawing a Behavior Card that round — it only reduces the Toll after resolution
- A Herald performing this action does not trigger Diplomatic Protection on entry (Protection applies only to player-vs-player combat, not Shadowking forces)

**Acceptance criteria:**

- Dark Fortress node displays a Herald interaction indicator when a solo Herald is adjacent
- Diplomatic Action is available from the action menu when conditions are met
- Doom Toll reduction animation plays immediately after action confirmation
- Action log records “Herald diplomatic action — Doom Toll reduced” for all players

-----

### F-010 — Victory Conditions

**Priority:** P0

**Description:** Three possible game end states.

**Player Victory — Territory Control:**
Triggered when the Heartstone is reclaimed from the Shadowking (second Fate Card deck reshuffle after the Heartstone changes hands OR explicit reclaim action at the Dark Fortress — spec TBD). The Arch-Regent holding the Heartstone AND controlling the most Strongholds at that moment wins.

Tiebreaker: highest current War Banner count. Second tiebreaker: coin flip (disclosed to players).

**Shadowking Victory — Doom Toll Completion:**
Doom Toll reaches position 13. All players lose. In Blood Pact mode: the Blood Pact Arch-Regent wins; all others lose.

**Draw — All Courts Broken:**
All active Arch-Regents simultaneously enter Broken Court state. Game ends immediately. All players lose. Doom Toll position is irrelevant.

**Constraints:**

- Victory condition status must be visible at all times (not only at game end)
- “Who is winning” must be legible from the main board view without opening a score panel
- End-of-game screen must show final Stronghold map, Doom Toll position, and all player stats

**Acceptance criteria:**

- A persistent “standings” indicator shows current Stronghold counts for all players
- Victory condition triggers immediately when conditions are met — no end-of-round delay
- Post-game screen is skippable but must default to visible for minimum 5 seconds

-----

### F-011 — Game Modes

**Priority:** P0 (Competitive and Blood Pact) · P1 (Cooperative)

**F-011a — Competitive Mode**
Standard 2–4 player game. Territory victory or Shadowking victory. No hidden information except Unknown Wanderer tokens.

**F-011b — Blood Pact Mode (Traitor)**
At game start, one Arch-Regent is secretly dealt a Blood Pact card via the app. No physical component, no shuffle tell. The Blood Pact Arch-Regent wins if and only if the Doom Toll reaches 13. All other Arch-Regents lose regardless of territory.

Blood Pact Arch-Regent constraints:

- Cannot be too obviously obstructive (the game will be short if isolated immediately)
- Has all normal player actions available — there is no mechanical restriction, only strategic incentive
- Blood Pact status is revealed at game end, or if accused by unanimous vote of all other active Arch-Regents before the game ends (accusation costs each accusing player 2 Fate Cards — failed accusations are costly)

**F-011c — Cooperative Mode**
All Arch-Regents win collectively by reclaiming the Heartstone before the Doom Toll completes. The Shadowking Behavior Deck is replaced with a harder deck (2× ESCALATE, 2× ASSAULT, 4× SPAWN, 4× MOVE, 4× CLAIM, 4× additional escalating cards — exact composition TBD in balance testing). No PvP War Field is possible in this mode (Fellowships may share nodes without combat).

**Acceptance criteria:**

- Mode selection screen is the first post-lobby screen — no buried settings
- Blood Pact card delivery is server-side (never sent to non-recipient clients)
- Cooperative mode disables War Field initiation UI between player Fellowships

-----

### F-012 — Tutorial: Into the Blighted Wastes

**Priority:** P0

**Description:** A mandatory 5-turn guided tutorial that introduces one mechanic per turn in the order a real game requires them. Non-skippable for first-time players (first session only). Skippable on subsequent sessions via settings toggle.

|Turn                     |Player objective                          |Mechanic introduced                            |
|-------------------------|------------------------------------------|-----------------------------------------------|
|1 — March from Your Keep |Move Warband to first unclaimed Stronghold|Movement, War Banner costs, claiming           |
|2 — Send the Herald Ahead|Deploy Herald solo to next Stronghold     |Recruitment, Diplomatic Protection             |
|3 — Your First Battle    |Rival Arch-Regent contests a Stronghold   |War Field resolution, Fate Cards, Penalty Cards|
|4 — The Toll Strikes     |Shadowking draws first Behavior Card      |Doom Toll, Voting Phase, cost of abstaining    |
|5 — Claim the Forge Keep |Reach a Forge Keep Stronghold             |Production loop, Forge Keep strategic value    |

**Discovered Tutorials (post-mandatory):**
Contextual tooltips surface when a player encounters a mechanic for the first time after the tutorial. Appear as dismissable overlays, not blocking dialogs. Trigger conditions:

- First Artificer recruited
- First rescue performed (either direction)
- First Death Knight combat
- First time Doom Toll reaches Final Phase
- First Blood Pact accusation (Blood Pact mode only)

**Constraints:**

- Tutorial Arch-Regent opposition is scripted (not AI) — behaviors are deterministic to ensure tutorial reproducibility
- Tutorial does not track win/loss — it ends after Turn 5 regardless of board state
- All tutorial dialogue is skippable with a single button press (not requiring a confirmation)

**Acceptance criteria:**

- First-session detection is reliable (does not re-trigger on returning players)
- Each tutorial turn introduces exactly one mechanic — no turn introduces two
- Discovered Tutorial overlays do not appear during the mandatory tutorial
- Tutorial completion persists across reinstalls (server-side flag)

-----

### F-013 — AI Opponents

**Priority:** P1

**Description:** AI opponents fill empty player slots in solo play and complete sessions when a human player disconnects. AI difficulty scales across three levels.

**AI difficulty levels:**

|Level           |Behavior                                                                                                                                               |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
|Apprentice      |Prioritizes expansion and Banner generation. Rarely abstains. Does not pursue the leading player. Suitable for Devon and Sam.                          |
|Knight-Commander|Balanced play across all action types. Applies leader-targeting logic. Abstains approximately 12% of votes. Target for average player.                 |
|Arch-Regent     |Full heuristic play. Applies check-the-leader voting logic (abstains more when leading). Targets Forge Keeps aggressively. Knows optimal rescue timing.|

**Constraints:**

- AI players in Blood Pact mode never receive the Blood Pact card (only human players)
- AI behavior must be deterministic from a given seed (required for balance testing reproducibility)
- AI processing time must not add perceivable delay to round resolution on target hardware

**Acceptance criteria:**

- AI opponents are distinguishable from human players via persistent UI label
- All three difficulty levels are available from lobby setup
- Default difficulty for solo play is Knight-Commander

-----

### F-014 — Multiplayer and Async Play

**Priority:** P1 (online synchronous) · P2 (async)

**F-014a — Online Synchronous:**
2–4 human players in real time. Standard session length (60–90 min). Voting Phase timer: 60 seconds per round. Disconnected player: AI fills their slot at Knight-Commander difficulty after 90-second reconnect window.

**F-014b — Async (Pass-and-Play Digital):**
Each player takes their turn when available. Voting Phase is resolved when all players have submitted votes (no timer). Session may span multiple days. Blood Pact mode is disabled for async (secret information management is impractical across sessions).

**Constraints:**

- Session state must be fully server-side — no local session files
- Rejoin must restore complete game state including all Penalty Cards, Broken Court flags, and Doom Toll position
- Async mode must surface a clear “it’s your turn” notification

-----

### F-015 — Atmosphere and Audio

**Priority:** P1

**Description:** Digital-exclusive atmospheric features that respond to game state. These are not cosmetic — they are the pressure system.

**Visual state layers:**

|Doom Toll Position|Visual Changes                                                                                                                                        |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
|1–6               |Default board state                                                                                                                                   |
|7–9               |Candles on UI border begin dimming (10% opacity reduction per position). Shadowking silhouette appears at far board edge (low opacity).               |
|10–12             |Board ambient lighting shifts warm-to-cold. Shadowking silhouette at 80% opacity, clearly visible. Blight Wraith occupation animations more prominent.|
|13                |Game-over cutscene.                                                                                                                                   |

**Event animations (required):**

- Doom Toll advance: bell-strike animation, brief audio cue, counter increment
- Rescue confirmation: distinct visual and audio beat — this is the emotional peak of the average session
- Blood Pact reveal: full-screen moment, not a sidebar notification
- Death Knight defeated: brief particle effect at node, Doom Toll recede animation

**Audio:**

- Ambient soundtrack shifts between three states: Default, Pressure (Toll 7+), Final Phase (Toll 10+)
- All Doom Toll advance events have a distinct audio cue (not the same as other notifications)
- Rescue action has a unique audio signature

**Constraints:**

- All atmosphere changes must be driven by game state variables — not timers
- Atmosphere must not obscure game board readability at any Doom Toll position
- All audio is optional (mutable via settings)

**Acceptance criteria:**

- Visual state change at Toll position 7 is immediately noticeable without instructions
- Rescue event audio and visual are distinguishable from all other in-game events
- Blood Pact reveal cannot be dismissed with a misclick — requires intentional confirmation

-----

### F-016 — Persistent UI: Standings and Status

**Priority:** P0

**Description:** The following information must be visible on the main board view at all times without opening a separate panel:

- Doom Toll position and current phase
- Each player’s Stronghold count
- Each player’s War Banner count
- Each player’s Broken Court status (if applicable)
- Current round number
- Whose turn it is (action phase) or that Voting Phase is active

**Constraints:**

- Standings panel must not obscure more than 15% of the board area
- Must be readable at 1080p without zooming
- Broken Court status must use a distinct visual indicator — not just a color change

**Acceptance criteria:**

- A new player can determine who is winning at a glance without clicking anything
- Broken Court indicator is visible on the standings panel AND on the Court’s board piece
- Voting Phase active state is clearly distinguishable from action phase

-----

### F-017 — Post-Game Summary

**Priority:** P1

**Description:** After each session, a summary screen displays:

- Final board state (Stronghold map at game end)
- Doom Toll final position
- Per-player stats: Strongholds claimed, Fellowships recruited, War Banners spent, combats won/lost, times in Broken Court, rescues given, rescues received, votes cast vs. abstained
- Win condition that triggered
- In Blood Pact mode: Blood Pact identity revealed with their action log

**Constraints:**

- Summary screen is displayed to all players simultaneously (in online play, server-side rendering)
- Blood Pact reveal in summary is the definitive reveal — if the Blood Pact player was not caught during the game, this is the first time other players learn their identity
- Summary is skippable after 5 seconds

**Acceptance criteria:**

- Per-player stats are accurate to within 1 action (rounding acceptable for Banner counts)
- Blood Pact reveal in summary is visually distinct from the rest of the summary (full-screen moment before stats)
- “Play again” and “Return to lobby” are the primary CTAs on the summary screen

-----

## 4. Balance Parameters

These are the target ranges derived from simulation. Acceptance testing must verify each.

|Metric                    |Target|Observed (pre-fix)|Fix Required                              |
|--------------------------|------|------------------|------------------------------------------|
|Dark Lord win rate        |10–20%|40%               |Reduce ESCALATE cards 2→1, add 1 MOVE card|
|Average rounds per session|8–16  |13.2              |None — within target                      |
|Doom Track peak           |5–8   |6.4               |None — within target                      |
|Vassal events/game        |3–6   |5.2               |None — within target                      |
|Rescue events/game        |1–3   |2.8               |None — within target                      |
|PvP combats/game          |6–12  |13.6              |Monitor post-fix — slightly high          |
|Power Stone claimed       |50–80%|80%               |Monitor — acceptable                      |
|Territory spread (max−min)|3–6   |4.8               |None — within target                      |

-----

## 5. Out of Scope for v1.0

The following are explicitly deferred. They are on the roadmap and should be designed for now, but not built.

|Feature                       |Version Target       |Rationale                                                                                                 |
|------------------------------|---------------------|----------------------------------------------------------------------------------------------------------|
|Asymmetric faction powers     |v1.1                 |Requires balance testing independent of base game. Symmetric start is correct for tutorial and onboarding.|
|Biome Affinity system         |Verdant Collapse (v2)|Ecological reskin feature — not applicable to Iron Throne.                                                |
|Steam Workshop (custom skins) |v1.2                 |GLL architecture enables this; engineering cost deferred.                                                 |
|Spectator mode                |v1.1                 |Required for streaming segment; not a launch blocker.                                                     |
|Cross-platform async save     |v1.1                 |Mobile launch is secondary; async is P2.                                                                  |
|Tournament / rated matchmaking|v2.0                 |Requires playerbase to exist first.                                                                       |

-----

## 6. Launch Checklist

The following must be true before the game ships:

- [ ] ESCALATE cards reduced from 2 to 1; MOVE cards increased from 5 to 6 in Behavior Deck
- [ ] Simulation re-run confirms Dark Lord win rate 18–22% with updated deck
- [ ] Herald Diplomatic Action (F-009) implemented and tested
- [ ] Blood Pact mode ships at launch (not post-launch)
- [ ] Persistent standings UI (F-016) passes readability test at 1080p
- [ ] Rescue event has distinct audio + visual signature (F-015)
- [ ] Tutorial Turn 3 (War Field) tested with Devon and Sam personas — no silent failure on first attempt
- [ ] Post-game Blood Pact reveal implemented (F-017)
- [ ] All GLL tokens confirmed swappable without engine changes (Sea of Knives reskin test)
- [ ] Broken Court state never prevents Voting Phase participation (F-007) — automated test coverage required

-----

*Iron Throne of Ashes · Alliance Engine v1.0 · Built for Claude Code*
