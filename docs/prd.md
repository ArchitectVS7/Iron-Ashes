# Iron Throne of Ashes — Product Requirements Document

> **Status:** Pre-production
> **Version:** 1.1
> **Last Updated:** 2026-03-06

---

## Executive Summary

Iron Throne of Ashes is a digital board game of dynastic rivalry and cooperative threat management built on the Alliance Engine. Four Arch-Regents compete for territory control while collectively managing the Doom Toll — a shared loss condition driven by an autonomous AI antagonist (the Shadowking). The game ships for PC (Steam) primary and Mobile (iOS/Android) secondary, targeting 2–4 players (human + AI fill) with 60–90 minute sessions. The Alliance Engine uses GLL tokenization, meaning all in-world nouns are swappable content wrappers, enabling future reskins without engine changes.

---

## Overview

Iron Throne of Ashes is built on the Alliance Engine — a system designed so that no in-world noun is hardcoded in game logic. All nouns function as GLL tokens (swappable content wrappers), enabling future reskins such as Sea of Knives and Verdant Collapse without requiring engine changes.

The game features three play modes — Competitive, Cooperative, and Blood Pact (Traitor) — all of which use the same board, the same rules, and the same Behavior Card system. Mode selection changes only the win/loss conditions and whether the Blood Pact card is in circulation.

No player is eliminated during play. The Broken Court state replaces elimination entirely, and players in Broken Court must always be able to participate in the Voting Phase. This is a core design commitment, not an edge case.

---

## Goals

1. **Ship a political strategy board game where cooperation is expensive but refusal is dangerous.** The Doom Toll creates a shared loss condition that forces negotiation every round. The leading player has the most to lose; trailing players can exploit that. Every session produces genuine "someone blinks first" moments.

2. **Eliminate player elimination.** No player watches from the sidelines. Broken Court state replaces elimination entirely — reduced actions, but full Voting Phase participation and the ability to be rescued. This is the primary accessibility signal for the 35–55 demographic segment.

3. **Ship all three play modes at launch.** Competitive, Cooperative, and Blood Pact (Traitor) modes use the same board, rules, and Behavior Card system. Blood Pact is an acquisition driver — three focus group personas named it as a purchase motivator before playing.

4. **Achieve balanced Shadowking threat at 18–22% Dark Lord win rate.** The autonomous antagonist must feel like a real threat every session without being insurmountable. The Behavior Deck composition (6 SPAWN, 6 MOVE, 4 CLAIM, 3 ASSAULT, 1 ESCALATE) is tuned to this target.

5. **Onboard new players through gameplay, not documentation.** The 5-turn guided tutorial introduces one mechanic per turn in the order a real game requires them. Tutorial Turn 3 (War Field) is the make-or-break moment for casual players — it must not silently fail.

6. **Build on the Alliance Engine with full GLL tokenization.** All in-world nouns are swappable content wrappers. The same codebase supports future reskins (Sea of Knives, Verdant Collapse) without engine changes. Design decisions that touch the engine must preserve this.

7. **Make the rescue mechanic the emotional peak of every session.** Focus group playtesting showed 2.8 rescue activations per game — the highest of any Alliance Engine variant. Five of eight personas independently named it as their most anticipated moment. Every UI, audio, and animation decision touching the rescue moment should prioritize it.

8. **Target PC (Steam) as primary platform, Mobile (iOS/Android) as secondary.** 60–90 minute sessions with 2–4 players (human + AI fill).

---

## Non-Goals

1. **Asymmetric faction powers.** The four Elemental Courts are mechanically symmetric in v1.0. Asymmetric abilities are designed for but deferred to v1.1. Symmetric starting positions simplify the tutorial, balance testing, and onboarding for casual players.

2. **Procedural board generation.** The Known Lands board is a fixed 28-node point-to-point graph. Board layout is hand-designed to ensure balanced Forge Keep distances and consistent strategic topology.

3. **Real-time or twitch-based combat.** The War Field is a card-based resolution system with simultaneous reveal. There are no reflexes, no timing windows, no action-per-minute advantage.

4. **Physical board game production or tabletop parity.** This is a digital-first product. Mechanics like the Blood Pact card delivery, atmospheric visual state changes, and server-side session state are designed for digital — no physical fallback is required.

5. **Spectator mode at launch.** Required for the streaming acquisition channel (Zoe persona) but deferred to v1.1. Not a launch blocker.

6. **Cross-platform save synchronization at launch.** Mobile is a secondary platform. Async play is P2. Cross-platform save is deferred to v1.1.

7. **Steam Workshop or custom skin support at launch.** The GLL architecture enables user-created content packs, but Workshop integration is deferred to v1.2.

8. **Tournament or ranked matchmaking.** Requires a playerbase to exist first. Deferred to v2.0.

---

## User Stories

### Competitive Strategist (Marcus, 34)

- **As a** competitive strategy player, **I want** the Doom Toll to create genuine urgency and leader-checking pressure, **so that** I can exploit timing and positioning against rivals rather than grinding through a pure territory race.
- **As a** competitive player, **I want** the Blood Pact traitor variant available at launch, **so that** the game has a hidden-information layer that rewards reading the table.
- **As a** returning player, **I want** asymmetric faction powers on an explicit roadmap, **so that** I know the game has strategic depth beyond the base symmetric start.

### Social Gamer (Priya, 29)

- **As a** social gamer, **I want** the rescue mechanic to create genuine table moments where I save a rival because I need their vote, **so that** the game generates stories worth retelling.
- **As a** social gamer, **I want** rules that pass the "30-second explanation" test (e.g., Herald Diplomatic Protection), **so that** I can teach the game to my group without losing momentum.

### Casual / Dad-Gamer (Devon, 41)

- **As a** casual player, **I want** to know whether I'm winning at a glance from the main board view, **so that** I don't feel lost during a 60–90 minute session.
- **As a** casual player, **I want** a tutorial that teaches me one mechanic per turn in gameplay order, **so that** I absorb complexity during play rather than before it.
- **As a** parent, **I want** sessions to end in 60–90 minutes, **so that** the game fits an evening schedule.

### Streamer / Digital Gamer (Zoe, 26)

- **As a** streamer, **I want** at least three "clipable" moments per session (rescue events, Blood Pact reveals, Doom Toll advances), **so that** the game generates streaming content naturally.
- **As a** digital gamer, **I want** atmospheric visual changes (candle dimming, Shadowking silhouette growth) that respond to game state, **so that** the board feels alive rather than static.

### Tabletop Historian (Raj, 38)

- **As a** tabletop strategist, **I want** the Herald Diplomatic Action to provide a non-combat Doom reduction path, **so that** games don't lock into a combat-only doom reduction loop.
- **As a** long-form content creator, **I want** 8–16 round sessions with enough variance for different board states and comeback arcs, **so that** each session produces a distinct strategic narrative.

### Narrative Gamer (Aaliyah, 31)

- **As a** narrative gamer, **I want** each Court to have distinct visual identity and lore, **so that** the game world feels inhabited and the Herald walking alone through enemy territory tells a story.
- **As a** narrative gamer, **I want** rescue events, territory spread, and Doom Toll pressure to combine into emergent stories, **so that** no two sessions feel the same.

### Mobile / Newcomer (Sam, 23)

- **As a** first-time board gamer, **I want** to never be eliminated from the game, **so that** I stay engaged even when I'm losing.
- **As a** newcomer, **I want** Tutorial Turn 3 (War Field — my first combat) to be exceptionally clear, **so that** I don't silently fail and quit.
- **As a** mobile player, **I want** the game playable on my phone as a secondary platform, **so that** I can play when a PC isn't available.

### Casual-Competitive (Elena, 47)

- **As a** Pandemic-level strategy player, **I want** a game that feels like a step up in complexity without being intimidating, **so that** my group has room to grow.
- **As a** group organizer, **I want** the "nobody gets eliminated" rule, **so that** no one in my game night spends the evening watching from the sidelines.

---

## Technical Constraints

- The Alliance Engine must treat all in-world nouns as GLL tokens. No noun may be hardcoded in game logic. This enables future reskins (Sea of Knives, Verdant Collapse) without engine changes.
- Behavior Card execution must be fully deterministic from a given seed. Simulation reproducibility is required for balance testing.
- The voting phase must resolve before any player's action phase in a given round. Order cannot be player-configurable.
- Broken Court state must never prevent a player from participating in the Voting Phase. This is a core design commitment, not an edge case.

---

## Feature Specifications

**Build priority notation:** P0 = launch blocker · P1 = launch required · P2 = post-launch v1.1 · P3 = roadmap

---

### F-001 — Board: The Known Lands

**Priority:** P0

**Description:** A point-to-point graph of 28 Stronghold nodes representing the Known Lands. Connections between nodes define legal movement paths. The board is fixed per game session — no procedural generation.

**Node types:**

- Standard Stronghold (22 nodes) — claimable, no production bonus
- Forge Keep Stronghold (4 nodes) — claimable, grants +3 War Banners/turn to controlling Court (vs. +1 elsewhere)
- Dark Fortress (1 node) — Shadowking home position, not claimable by players, target for Herald diplomatic action
- Hall of Neutrality (1 node) — neutral territory (historical resting place of the Heartstone; no in-game special rules)

**Constraints:**

- Forge Keep nodes must be positioned so each Court's starting position has equal path distance to the nearest Forge Keep (±1 node)
- Dark Fortress must not be adjacent to any Court's starting Keep
- Each Court's starting Keep is pre-claimed at game start (not available to other Courts in round 1)

**Acceptance criteria:**

- Board renders correctly at 1080p and 2560×1440
- All 28 nodes are individually selectable with hit area ≥ 44×44px
- Connection paths render as distinct lines, not overlapping
- Forge Keep nodes are visually distinct from Standard Strongholds at a glance (no label required)

---

### F-001b — 3-Player Game Configuration

**Priority:** P1

**Description:** When a session is created with exactly 3 players, certain starting parameters differ from the standard 4-player configuration to reflect the structurally thinner voting coalition (one abstention = 33% defection vs. 25% in 4-player).

**Starting conditions for 3-player:**

- Doom Toll starts at position 2 (not 0)
- All other mechanics remain identical to 4-player

**Setup screen behavior:**

- Display the Doom Toll starting position as part of the pre-game setup summary
- Context-sensitive: shows "Doom Toll starts at: 0" for 2- and 4-player sessions, "Doom Toll starts at: 2" for 3-player sessions
- Include a one-line callout: *"Three Courts creates a thinner voting margin. The Toll begins higher to reflect it."*

**Acceptance criteria:**

- `createGameState(3, mode, seed)` initializes `doomToll = 2` and `isFinalPhase = false`
- `createGameState(2, mode, seed)` and `createGameState(4, mode, seed)` initialize `doomToll = 0`
- Setup screen displays correct starting Doom Toll based on player count
- 3-player configuration note is shown before round 1 begins

---

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

---

### F-002.5 — Fate Card Hand Management

**Priority:** P0

**Description:** Each player maintains a personal Fate Card hand drawn from the shared deck. Personal hands are used for Voting Phase COUNTERs and Rescue donations. Combat draws are separate and temporary.

**Starting hand:** Each player draws 3 Fate Cards from the shared deck at game start.

**Hand limit formula:** `min(3 + max(0, herald_count − 1), 6)`

| Heralds in Fellowship | Hand Limit |
|----------------------|------------|
| 0–1 | 3 |
| 2 | 4 |
| 3 | 5 |
| 4+ | 6 |

**Replenishment:** At the end of each Cleanup Phase (Production), each player draws Fate Cards from the shared deck up to their hand limit.

**Surplus rule:** No forced discard. If a Herald is lost in combat and the player's hand exceeds the new limit, surplus cards are held until spent naturally.

**Constraints:**

- Personal hand is distinct from combat draws — Fate Cards drawn for combat come temporarily from the shared deck and are discarded after combat; they never enter or leave the personal hand
- Hand limit is re-evaluated at replenishment time using current Herald count
- If the shared deck is exhausted during replenishment, it reshuffles (advancing the Doom Toll as normal)

**Acceptance criteria:**

- Each player starts with exactly 3 Fate Cards
- Hand size updates immediately after replenishment
- Herald count change (gain or loss) affects limit at next replenishment
- Surplus cards after limit reduction are visible but not discarded

---

### F-003 — Characters: Fellowship Composition

**Priority:** P0

**Description:** Each player controls a Fellowship — a set of character pieces with distinct mechanical roles. Fellows are recruited during the game; the starting Fellowship is fixed.

**Starting Fellowship (all Courts):**

- 1× Arch-Regent (Power Level 8, always present, cannot be lost)
- 1× Knight (Power Level 6)
- 1× Herald (Power Level 0)
- 1× Artificer (Power Level 3)

**Character roles:**

| Character | Power Level | Special Rule |
|-----------|-------------|--------------|
| Arch-Regent | 8 | Leader. Drives Fate Card draw count. Cannot be removed from Fellowship. |
| Knight | 6 | Combat specialist. Can claim Strongholds, challenge Death Knights, initiate War Field. Cannot perform Recruit action. |
| Herald | 0 | Only character that can perform the Recruit action (reveal Unknown Wanderers). Grants Diplomatic Protection when walking alone. Blight Wraiths ignore Diplomatic Protection. Each Herald beyond the first increases your personal Fate Card hand limit by 1 (max 6). |
| Artificer | 3 | Production. Generates War Banners. Multiplied output at Forge Keep Strongholds. |

**Unknown Wanderers:**

- 20 character tokens are distributed face-down across Standard Stronghold nodes at game start
- A Herald adjacent to a face-down token may spend 1 action to reveal it
- Revealed characters join the Herald's Fellowship immediately
- Wanderer pool composition: 40% Knights, 30% Heralds, 30% Artificers (random distribution across nodes)

**Diplomatic Protection:**

- Active when a Herald occupies a node alone (no other Fellowship characters present on the same node)
- Other Arch-Regents cannot initiate a War Field against a solo Herald
- Blight Wraiths can occupy a node containing a solo Herald (Protection does not apply to Shadowking forces)
- Protection drops immediately when any other Fellowship character enters the Herald's node

**Constraints:**

- Maximum Fellowship size: 8 characters (including Arch-Regent)
- A Fellowship reduced to only the Arch-Regent can still perform all actions except Recruit
- Character Power Levels are fixed — they do not improve through play in v1.0

**Acceptance criteria:**

- Fellowship composition is visible to all players at all times
- Unknown Wanderer tokens are visually indistinguishable from each other when face-down
- Diplomatic Protection state is clearly indicated on the board (Herald icon change or highlight)
- Recruit action is greyed out (not hidden) when no Herald is in the Fellowship

---

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
- Fate Cards drawn for combat are temporary draws from the shared deck, not from personal hands. They are discarded after combat resolves and do not affect hand size.

**Acceptance criteria:**

- Both card values are revealed simultaneously (no sequential reveal)
- Margin is displayed clearly before Penalty Cards are assigned
- The face-down/face-up asymmetry is communicated in the tutorial and in a tooltip on the combat screen
- Fate Card deck reshuffle triggers visible notification and Doom Toll advance animation before combat continues

**Pre-Combat Summary Screen:**
Before Fate Cards are drawn, both sides see their Base Strength totals side-by-side with a margin label:
- *"Your side: [N] ([Power] Power + [Banners] Banners). Their side: [N] ([Power] Power + [Banners] Banners). Maximum Fate Card swing: ±5."*
- Outcome labels computed from `getCombatOutcomeLabel(baseMargin)`:
  - **DECIDED** (margin ≥ 6): *"Fate Cards cannot reverse this."*
  - **CLOSE** (margin 1–5): *"Fate Cards will decide this."*
  - **LOCKED** (margin = 0): *"Fate Cards are everything."*
- Constants: `COMBAT_MAX_CARD_SWING = 5`, `COMBAT_DECIDED_THRESHOLD = 6`.

---

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

**Final Phase named transition (production requirement — not optional flavor):**

When the Doom Toll crosses position 10, the board transitions with a full visual state change:
- Ambient light shifts cold across the entire board
- Shadowking silhouette fills the horizon UI layer
- UI frame color changes to the Final Phase palette
- Named overlay fires: **FINAL PHASE** — full-screen moment, same weight class as a Blood Pact reveal
- One-time tooltip fires for all players on first entry: surfaces the strategic framing (consolidate / push for Heartstone / contain the leader); dismissable but not skippable on first view

**Estimated Rounds Remaining HUD element:**

During Final Phase, each player's HUD shows a non-binding countdown:
- Formula: `ceil((DOOM_TOLL_MAX − doomToll) / FINAL_PHASE_MIN_DOOM_ADVANCE)` where `FINAL_PHASE_MIN_DOOM_ADVANCE = 2`
- Displayed as "~N rounds remaining" — the tilde signals that this is an estimate, not a guarantee
- Updates each round after Doom Toll changes resolve
- Examples: Toll 10 → "~2 rounds remaining"; Toll 11 → "~1 round remaining"; Toll 12 → "~1 round remaining"
- Not displayed outside Final Phase

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
- Final Phase named transition fires exactly once, on first entry; does not re-fire if Toll briefly drops below 10 and returns
- Final Phase visual state change is immediately noticeable without reading any tooltip
- Toll advance animation plays before the next game action in the sequence (not async)
- Estimated Rounds Remaining HUD element visible during Final Phase; updates each round

---

### F-006 — The Voting Phase

**Priority:** P0

**Description:** Every round, after the Shadowking draws and reveals a Behavior Card, all active Arch-Regents vote to COUNTER or ABSTAIN. Resolves before player action phases.

**Vote resolution:**

- If all active Arch-Regents vote COUNTER and each spends the required Fate Cards: the Behavior Card effect is blocked (or reduced, depending on card type)
- If any Arch-Regent abstains, or any player cannot afford the Fate Card cost: the Behavior Card resolves at full effect and the Doom Toll advances by 1
- Broken Court Arch-Regents vote at full standing (reduced action count does not affect voting rights)

**Fate Card cost per vote:**

- Standard: 1 Fate Card per player (spent from personal hand)
- Final Phase (Toll 10+): 2 Fate Cards per player (spent from personal hand)

**Behavior Card types and vote effects:**

| Card | Base Effect (if vote fails) | Effect if blocked (unanimous COUNTER) |
|---------|-------------------------------------------------------------------|------------------------------------------|
| SPAWN | +2 Blight Wraiths placed near Dark Fortress | Wraiths placed but cannot move this round |
| MOVE | Lead Death Knight moves toward strongest Arch-Regent | Death Knight stays in current position |
| CLAIM | Lead Death Knight claims nearest unoccupied Standard Stronghold | Claim cancelled |
| ASSAULT | Death Knight initiates War Field against weakest active Arch-Regent | Assault cancelled |
| ESCALATE | Doom Toll +2 | Doom Toll +1 (cannot be fully blocked) |

**Behavior Deck composition (20 cards):** 6× SPAWN · 6× MOVE · 4× CLAIM · 3× ASSAULT · 1× ESCALATE

> **Balance note (post-fix):** ESCALATE reduced from 2 to 1, MOVE increased from 5 to 6. Dark Lord win rate target: 18–22%.

**Constraints:**

- Vote must be resolved by all players before any action phase begins — no player may skip or defer the vote
- A player with 0 Fate Cards automatically abstains (they cannot COUNTER without cards to spend)
- Vote choices are revealed simultaneously — no player sees another's vote before committing

**Acceptance criteria:**

- All players' vote choices are hidden until all have committed (simultaneous reveal)
- A player with insufficient Fate Cards sees a clear indication they will auto-abstain before the vote timer expires
- The Doom Toll advance animation plays immediately after a failed vote, before any player action
- In async/online play, a vote timer of 60 seconds triggers auto-abstain on expiry

---

### F-006b — Social Pressure Onboarding Screen

**Priority:** P1

**Description:** Before the first session begins (and available from the Settings menu in subsequent sessions), display an "About this mode" onboarding screen that frames the game's social engine for new players.

**Content (verbatim):**

> *This game is a negotiation about who pays for collective survival. The player leading in Strongholds has the most to lose if the Doom Toll advances. The players trailing have the least. Abstaining in the Voting Phase is a legal form of political taxation on the frontrunner — and the designed check on Forge Keep dominance. If you are winning and the table is not cooperating, that is not betrayal. It is the game working as designed.*

**Behavior:**

- Displayed once per user account before the first session
- Dismissable after reading (requires scroll to bottom or explicit "I understand" button)
- Re-accessible from Settings → "About the Voting Phase"
- Not displayed in Tutorial Mode (tutorial introduces this concept in-context at Turn 4)

**Constraints:**

- No effect on game state or mechanics
- Screen must not be skippable without reading (scroll required on mobile)

**Acceptance criteria:**

- Onboarding screen fires exactly once per account on first session start
- "About the Voting Phase" entry is present in Settings and opens the same screen
- Screen is not shown during Tutorial Mode

---

### F-007 — Broken Court State

**Priority:** P0

**Description:** Replaces player elimination. When an Arch-Regent's total Penalty Cards meets or exceeds their current War Banner count, they enter Broken Court state.

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
- Rescuer donates 2–5 Fate Cards from their personal hand to the Broken Court player
- Rescued player: restores War Banners equal to cards donated, clears all Penalty Cards, returns to full active state immediately
- Rescuer strategic benefit: the rescued player's next Voting Phase participation is politically implied — they owe a vote

**Constraints:**

- A player cannot rescue themselves
- A player in Broken Court state can receive multiple rescue attempts in one round (but only the first successful one takes effect)
- If all active Arch-Regents simultaneously enter Broken Court state, the game ends as a Draw — all players lose, Doom Toll does not complete

**VULNERABLE status indicator:**

- When a player's Penalty Cards reach 50% of their current War Banner count: their HUD slot shows a yellow VULNERABLE indicator (`getVulnerableStatus()` returns `'yellow'`).
- When Penalty Cards reach 75% of War Banner count: indicator turns red (`getVulnerableStatus()` returns `'red'`).
- At 75% threshold, a one-time tooltip fires for the at-risk player: *"Your Penalty Cards are mounting. If they meet or exceed your War Banners, you enter Broken Court. Fight, spend, or find an ally."*
- VULNERABLE indicator is visible to all players (same visibility as Broken Court status).
- No mechanical effect — UI display only. Constants: `VULNERABLE_YELLOW_THRESHOLD = 0.5`, `VULNERABLE_RED_THRESHOLD = 0.75`.

**Acceptance criteria:**

- Broken Court state is visually distinct on the board (Court icon changes, reduced action indicators)
- The Voting Phase UI does not visually demote a Broken Court player's vote (same size, same position)
- Rescue action is clearly accessible from the action menu — not buried
- Recovery animation (Broken Court → active) is visible to all players
- VULNERABLE indicator (yellow/red) is shown in each player's HUD slot before Broken Court entry

---

### F-008 — The Shadowking Behavior System

**Priority:** P0

**Description:** The Shadowking is an autonomous system, not a player. Each round he draws one Behavior Card (two in Final Phase) and executes it deterministically. He has no agenda — he follows the card.

**Shadowking forces:**

- Death Knights (2 at game start, max 4): mobile lieutenants that traverse the board and initiate War Fields. Power Level 10.
- Blight Wraiths (0 at game start, max 9): static occupation units that spread from the Dark Fortress. Power Level 6. They claim Strongholds but do not move after placement unless a SPAWN card triggers new placement.

**Card resolution rules:**

- SPAWN: Place up to 2 new Blight Wraiths adjacent to the Dark Fortress. If Dark Fortress is surrounded, place at the farthest reachable node from the leading Arch-Regent's starting Keep.
- MOVE: The Death Knight closest to the leading Arch-Regent (by node distance) moves 2 nodes toward them.
- CLAIM: The Death Knight farthest from any player Fellowship claims the nearest unoccupied Standard Stronghold.
- ASSAULT: The Death Knight adjacent to the Arch-Regent with the lowest current War Banner count initiates War Field combat.
- ESCALATE: Doom Toll +2 (reduced to +1 if vote is unanimous).

**"Leading Arch-Regent" definition:** The player with the most claimed Strongholds. Ties broken by highest War Banner count at the moment of resolution.

**Constraints:**

- Shadowking forces never target the Dark Fortress or Hall of Neutrality
- Death Knights cannot occupy the same node as a solo Herald (Diplomatic Protection applies to Shadowking MOVE only — not ASSAULT)
- Behavior Card deck reshuffles when exhausted; reshuffle advances Doom Toll by 1 before next card is drawn
- Death Knights occupying the Dark Fortress are the primary obstacle to Heartstone access — they must be cleared in War Field combat before the Reclaim action becomes available

**Acceptance criteria:**

- Shadowking action is fully animated and clearly communicated before player actions each round
- The active Behavior Card is displayed on screen during its resolution
- Shadowking forces are visually distinct from all player Fellowship pieces at a glance (no color overlap with Court palette)

---

### F-009 — Herald Diplomatic Action (Doom Relief Valve)

**Priority:** P1

**Description:** A Herald that reaches the Dark Fortress node via uncontested movement (no War Field on entry) may perform a Diplomatic Action — a solo negotiation that reduces the Doom Toll by 2 without triggering combat.

**Conditions:**

- Herald must be traveling alone (no other Fellowship characters in the same movement group)
- No Death Knight or Blight Wraith may occupy the Dark Fortress at the time of entry (if they do, standard War Field resolution applies)
- Diplomatic Action costs 1 of the Herald's player's actions for the turn
- Can only be performed once per game per Herald character (a Herald that completes the action is "marked" and cannot perform it again)

**Design rationale:** Provides a non-combat Doom reduction path that rewards strategic Herald deployment. Narratively coherent (a Herald walking alone into the enemy fortress to negotiate) and mechanically distinct from combat-based relief. Prevents games from locking into a combat-only doom reduction loop.

**Constraints:**

- The Diplomatic Action does not prevent the Shadowking from drawing a Behavior Card that round — it only reduces the Toll after resolution
- A Herald performing this action does not trigger Diplomatic Protection on entry (Protection applies only to player-vs-player combat, not Shadowking forces)

**Acceptance criteria:**

- Dark Fortress node displays a Herald interaction indicator when a solo Herald is adjacent
- Diplomatic Action is available from the action menu when conditions are met
- Doom Toll reduction of 2 positions plays as a single animation immediately after action confirmation
- Action log records "Herald diplomatic action — Doom Toll reduced" for all players
- Tooltip fires once per session when the action first becomes available: surfaces the cost/benefit framing, including "Toll 9+" guidance and the once-per-game sacrifice nature of the action

---

### F-010 — Victory Conditions

**Priority:** P0

**Description:** Three possible game end states.

**Player Victory — Territory Control:**
Triggered at the end of every round's Production Phase (Cleanup Phase): if a player holds the Heartstone AND controls more Strongholds than any other player, Territory Victory triggers immediately.

Tiebreaker (if the Heartstone-holder is tied for most Strongholds): (1) highest current War Banner count, (2) disclosed coin flip. Tiebreaker result is shown before win sequence.

**Heartstone movement rules:**
- **Reclaim action:** If a player's Fellowship occupies the Dark Fortress and no Death Knights or antagonist forces are present there, the player may spend 1 action to Reclaim the Heartstone. The Heartstone token moves to the player's Court (visible to all). No War Banner cost. The Reclaim option is greyed out (not hidden) when the Fortress is guarded.
- **Drop on combat loss:** If a Heartstone holder loses War Field combat, the Heartstone drops to the holder's current node as a free token. Any Fellowship occupying that node may claim it with 1 action.

**Shadowking Victory — Doom Toll Completion:**
Doom Toll reaches position 13. All players lose. In Blood Pact mode: the Blood Pact Arch-Regent wins; all others lose.

**Draw — All Courts Broken:**
All active Arch-Regents simultaneously enter Broken Court state. Game ends immediately. All players lose. Doom Toll position is irrelevant.

**Constraints:**

- Victory condition status must be visible at all times (not only at game end)
- "Who is winning" must be legible from the main board view without opening a score panel
- End-of-game screen must show final Stronghold map, Doom Toll position, and all player stats
- Territory Victory is checked only at end of round (Cleanup Phase); Doom Complete and All Broken trigger immediately at any phase

**Acceptance criteria:**

- A persistent "standings" indicator shows current Stronghold counts for all players
- Doom Complete and All Broken trigger immediately when conditions are met; Territory Victory triggers at end of round
- Post-game screen is skippable but must default to visible for minimum 5 seconds

---

### F-011 — Game Modes

**Priority:** P0 (Competitive and Blood Pact) · P1 (Cooperative)

**F-011a — Competitive Mode**
Standard 2–4 player game. Territory victory or Shadowking victory. No hidden information except Unknown Wanderer tokens.

**F-011b — Blood Pact Mode (Traitor)**
At game start, one Arch-Regent is secretly dealt a Blood Pact card via the app. No physical component, no shuffle tell. The Blood Pact Arch-Regent wins if and only if the Doom Toll reaches 13 without being accused mid-game. All other Arch-Regents lose regardless of territory.

Blood Pact Arch-Regent constraints:

- Cannot be too obviously obstructive (the game will be short if isolated immediately)
- Has all normal player actions available — there is no mechanical restriction, only strategic incentive
- Blood Pact status is revealed at game end, or via mid-game accusation (see below)

**Accusation Conditions:** All other active Arch-Regents must unanimously initiate the accusation. Each accusing player spends 2 Fate Cards. Accusation is not available in 2-player games (only 1 other player — not a meaningful group decision).

**Successful Accusation (target is the traitor):**
1. Full-screen reveal moment — same treatment as end-of-game Blood Pact reveal
2. Traitor's win condition converts to Territory Victory (same as all other players)
3. Traitor loses 3 Fate Cards (minimum 0; cannot go negative)
4. Doom Toll recedes by 1
5. Each accusing player receives 1 Fate Card refund (net cost: 1 card per accuser)
6. Action log records the round of accusation

**Failed Accusation (target is not the traitor):**
1. Accusation is visually rejected — clear failure state, no ambiguity
2. Each accusing player receives 1 Fate Card refund (net cost: 1 per accuser — symmetric with correct accusation)
3. The wrongly accused player gains 1 Fate Card (political vindication)
4. Doom Toll does not change
5. The wrongly accused player cannot be accused again for 1 round (lockout)

**Accusation Cooldown:** After any accusation attempt (success or failure), no new accusation can be initiated for 2 rounds. This prevents accusation spam and gives the traitor breathing room after a failed attempt against them.

**Suspicion Log:**
- Accessible only from the Accusation initiation screen; not available otherwise
- Shows each player's Voting Phase record for the last 5 rounds: vote type (COUNTER / ABSTAIN) and whether they were the sole abstainer in that round
- The accused player has no access to their own Log's presentation
- No card count, hand size, or other private information is displayed
- Information display only — no effect on AI behavior or game state
- Constant: `SUSPICION_LOG_ROUNDS = 5`

**3-Player Note:** Accusation requires both remaining players to agree unanimously. With only one other player to convince, the decision is more personal and the stakes are higher. The Suspicion Log becomes more important here — with three voters, patterns in the vote record emerge faster.

**Async/Online:** Accusation initiation requires simultaneous submission from all non-target players within the voting timer. If any player does not submit within the timer window, the accusation does not proceed.

**F-011c — Cooperative Mode**
All Arch-Regents win collectively by reclaiming the Heartstone before the Doom Toll completes. The Shadowking Behavior Deck is replaced with a harder deck (2× ESCALATE, 2× ASSAULT, 4× SPAWN, 4× MOVE, 4× CLAIM, 4× additional escalating cards — exact composition TBD in balance testing). No PvP War Field is possible in this mode (Fellowships may share nodes without combat).

**Acceptance criteria:**

- Mode selection screen is the first post-lobby screen — no buried settings
- Blood Pact card delivery is server-side (never sent to non-recipient clients)
- Cooperative mode disables War Field initiation UI between player Fellowships

---

### F-012 — Tutorial: Into the Blighted Wastes

**Priority:** P0

**Description:** A mandatory 5-turn guided tutorial that introduces one mechanic per turn in the order a real game requires them. Non-skippable for first-time players (first session only). Skippable on subsequent sessions via settings toggle.

| Turn | Player objective | Mechanic introduced |
|-------------------------|------------------------------------------|-----------------------------------------------|
| 1 — March from Your Keep | Move Warband to first unclaimed Stronghold | Movement, War Banner costs, claiming |
| 2 — Send the Herald Ahead | Deploy Herald solo to next Stronghold | Recruitment, Diplomatic Protection |
| 3 — Your First Battle | Rival Arch-Regent contests a Stronghold | War Field resolution, Fate Cards, Penalty Cards |
| 4 — The Toll Strikes | Shadowking draws first Behavior Card | Doom Toll, Voting Phase, cost of abstaining |
| 5 — Claim the Forge Keep | Reach a Forge Keep Stronghold | Production loop, Forge Keep strategic value |

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

---

### F-013 — AI Opponents

**Priority:** P1

**Description:** AI opponents fill empty player slots in solo play and complete sessions when a human player disconnects. AI difficulty scales across three levels.

**AI difficulty levels:**

| Level | Behavior |
|-----------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Apprentice | Prioritizes expansion and Banner generation. Rarely abstains. Does not pursue the leading player. Suitable for Devon and Sam. |
| Knight-Commander | Balanced play across all action types. Applies leader-targeting logic. Abstains approximately 12% of votes. Target for average player. |
| Arch-Regent | Full heuristic play. Applies check-the-leader voting logic (abstains more when leading). Targets Forge Keeps aggressively. Knows optimal rescue timing. |

**Constraints:**

- AI players in Blood Pact mode never receive the Blood Pact card (only human players)
- AI behavior must be deterministic from a given seed (required for balance testing reproducibility)
- AI processing time must not add perceivable delay to round resolution on target hardware

**Acceptance criteria:**

- AI opponents are distinguishable from human players via persistent UI label
- All three difficulty levels are available from lobby setup
- Default difficulty for solo play is Knight-Commander

---

### F-014 — Multiplayer and Async Play

**Priority:** P1 (online synchronous) · P2 (async)

**F-014a — Online Synchronous:**
2–4 human players in real time. Standard session length (60–90 min). Voting Phase timer: 60 seconds per round. Disconnected player: AI fills their slot at Knight-Commander difficulty after 90-second reconnect window.

**F-014b — Async (Pass-and-Play Digital):**
Each player takes their turn when available. Voting Phase is resolved when all players have submitted votes (no timer). Session may span multiple days. Blood Pact mode is disabled for async (secret information management is impractical across sessions).

**Constraints:**

- Session state must be fully server-side — no local session files
- Rejoin must restore complete game state including all Penalty Cards, Broken Court flags, and Doom Toll position
- Async mode must surface a clear "it's your turn" notification

---

### F-015 — Atmosphere and Audio

**Priority:** P1

**Description:** Digital-exclusive atmospheric features that respond to game state. These are not cosmetic — they are the pressure system.

**Visual state layers:**

| Doom Toll Position | Visual Changes |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1–6 | Default board state |
| 7–9 | Candles on UI border begin dimming (10% opacity reduction per position). Shadowking silhouette appears at far board edge (low opacity). |
| 10–12 | Board ambient lighting shifts warm-to-cold. Shadowking silhouette at 80% opacity, clearly visible. Blight Wraith occupation animations more prominent. |
| 13 | Game-over cutscene. |

**Event animations (required):**

- Doom Toll advance: bell-strike animation, brief audio cue, counter increment
- Rescue confirmation: distinct visual and audio beat — this is the emotional peak of the average session
- Blood Pact reveal: full-screen moment, not a sidebar notification — applies to both mid-game accusation reveals and end-of-game reveals
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

---

### F-018 — Round Structure: Fixed Turn Order

**Priority:** P0

**Description:** Player turn order in the Action Phase is fixed for the entire game session. It is determined by a disclosed random draw at lobby setup and does not rotate between rounds.

**Turn order assignment:**

- After mode selection, the game performs a seeded random shuffle of the active player slots
- The resulting order is displayed to all players immediately: e.g., "Court of the Deep Root → Court of the Ember Crown → Court of the Gale Throne → Court of the Tide Seal"
- This order is fixed for the session and stored in game state

**Rationale:**

1. The Voting Phase is simultaneous — first-player advantage is already neutralized in the game's highest-stakes decision each round
2. A fixed order is easier to track across rounds ("I always go second") than a rotating first-player marker
3. The Shadowking acts first every round, re-anchoring the round structure before any player advantage can compound

**Constraints:**

- Turn order applies only to Action Phases — the Voting Phase is always simultaneous regardless of turn order
- In online synchronous play, the action phase time limit applies per player per turn in the fixed order
- In async play, the "it's your turn" notification fires when the previous player's action phase completes

**Acceptance criteria:**

- Turn order is displayed to all players at setup before the first round begins
- The turn order tracker in the persistent UI is visible throughout the round (not only during Action Phases)
- Order is reproducible from the session seed (required for determinism and rejoin)

---

### F-016 — Persistent UI: Standings and Status

**Priority:** P0

**Description:** The following information must be visible on the main board view at all times without opening a separate panel:

- Doom Toll position and current phase
- Each player's Stronghold count
- Each player's War Banner count
- Each player's Broken Court status (if applicable)
- Current round number
- Whose turn it is (action phase) or that Voting Phase is active
- Heartstone location: current holder's name, or node name if uncontrolled (e.g., "Dark Fortress" or "s17")
- Turn order tracker: the fixed session order of player Action Phases, with the currently active player highlighted
- Fate Deck remaining card count, displayed adjacent to the Doom Toll tracker
  - Amber visual state when ≤ 10 cards remain (`FATE_DECK_AMBER_THRESHOLD`)
  - Red visual state when ≤ 5 cards remain (`FATE_DECK_RED_THRESHOLD`)
  - A one-time tooltip fires at the red threshold: "The Fate Deck is running low. When it reshuffles, the Doom Toll advances by 1."

**Constraints:**

- Standings panel must not obscure more than 15% of the board area
- Must be readable at 1080p without zooming
- Broken Court status must use a distinct visual indicator — not just a color change

**Named animation events:**

- `doom_advance_deck_reshuffle` — distinct visual/audio weight matching `doom_advance_vote_fail`

**Acceptance criteria:**

- A new player can determine who is winning at a glance without clicking anything
- Broken Court indicator is visible on the standings panel AND on the Court's board piece
- Voting Phase active state is clearly distinguishable from action phase
- A player can determine Fate Deck depth at a glance from the main board view

---

### F-017 — Post-Game Summary

**Priority:** P1

**Description:** After each session, a summary screen displays:

- Final board state (Stronghold map at game end)
- Doom Toll final position
- Per-player stats: Strongholds claimed, Fellowships recruited, War Banners spent, combats won/lost, times in Broken Court, rescues given, rescues received, votes cast vs. abstained
- Win condition that triggered
- In Blood Pact mode: Blood Pact identity revealed with their action log
- If a mid-game accusation succeeded, the post-game summary notes the round it occurred; the traitor's action log is split at that round to show behavior before and after their win condition converted

**Constraints:**

- Summary screen is displayed to all players simultaneously (in online play, server-side rendering)
- Blood Pact reveal in summary is the definitive reveal — if the Blood Pact player was not caught during the game, this is the first time other players learn their identity
- Summary is skippable after 5 seconds

**Acceptance criteria:**

- Per-player stats are accurate to within 1 action (rounding acceptable for Banner counts)
- Blood Pact reveal in summary is visually distinct from the rest of the summary (full-screen moment before stats)
- "Play again" and "Return to lobby" are the primary CTAs on the summary screen

---

## Balance Parameters

These are the target ranges derived from simulation. Acceptance testing must verify each.

| Metric | Target | Observed (pre-fix) | Fix Required |
|--------------------------|--------|---------------------|------------------------------------------|
| Dark Lord win rate | 18–22% | 40% | RESOLVED in code — simulation re-run with Fate Card system required before ship |
| Average rounds per session | 8–16 | 13.2 | None — within target |
| Doom Track peak | 5–8 | 6.4 | None — within target |
| Rescue events/game | 1–3 | 2.8 | None — within target |
| PvP combats/game | 6–12 | 13.6 | Monitor post-fix — slightly high |
| Heartstone claimed | 50–80% | 80% | Monitor — acceptable |
| Territory spread (max−min) | 3–6 | 4.8 | None — within target |

> **Balance note (Fix 5):** ESCALATE 2→1 and MOVE 5→6 fixes are implemented and anchored by
> automated tests. A simulation re-run confirming 18–22% Dark Lord win rate is required before
> ship, using the updated deck **and** the Herald-driven Fate Card hand system (Fix 4). If the
> hand system materially raises COUNTER success rates, re-evaluate ESCALATE count.

---

## Out of Scope for v1.0

The following are explicitly deferred. They are on the roadmap and should be designed for now, but not built.

| Feature | Version Target | Rationale |
|------------------------------|----------------------|----------------------------------------------------------------------------------------------------------|
| Asymmetric faction powers | v1.1 | Requires balance testing independent of base game. Symmetric start is correct for tutorial and onboarding. |
| Biome Affinity system | Verdant Collapse (v2) | Ecological reskin feature — not applicable to Iron Throne. |
| Steam Workshop (custom skins) | v1.2 | GLL architecture enables this; engineering cost deferred. |
| Spectator mode | v1.1 | Required for streaming segment; not a launch blocker. |
| Cross-platform async save | v1.1 | Mobile launch is secondary; async is P2. |
| Tournament / rated matchmaking | v2.0 | Requires playerbase to exist first. |

---

## Launch Checklist

The following must be true before the game ships:

- [x] ESCALATE cards reduced from 2 to 1; MOVE cards increased from 5 to 6 in Behavior Deck (implemented; anchored by tests/models/game-state.test.ts)
- [ ] Simulation re-run confirms Dark Lord win rate 18–22% with updated Behavior Deck AND Herald-driven Fate Card hand system (Fix 4) enabled
- [ ] Herald Diplomatic Action (F-009) implemented and tested
- [ ] Blood Pact mode ships at launch (not post-launch)
- [ ] Persistent standings UI (F-016) passes readability test at 1080p
- [ ] Rescue event has distinct audio + visual signature (F-015)
- [ ] Tutorial Turn 3 (War Field) tested with Devon and Sam personas — no silent failure on first attempt
- [ ] Post-game Blood Pact reveal implemented (F-017)
- [ ] All GLL tokens confirmed swappable without engine changes (Sea of Knives reskin test)
- [ ] Broken Court state never prevents Voting Phase participation (F-007) — automated test coverage required

---

---

## Competitive Landscape

### Comparable Titles

| Title | Category | Player Count | Session Length | Key Mechanic Overlap | Differentiation |
|-------|----------|-------------|----------------|----------------------|-----------------|
| Pandemic / Pandemic Legacy | Cooperative board game (digital) | 2–4 | 45–90 min | Shared doom track, collective loss | No PvP layer; no traitor variant |
| Root (digital) | Asymmetric faction strategy | 2–4 | 60–90 min | Territory control, faction rivalry | No shared loss condition; asymmetric powers only |
| Blood on the Clocktower | Social deduction / traitor | 5–20 | 60–120 min | Hidden traitor, accusation mechanics | Party-scale; not a board strategy game |
| Armello | Digital board game | 2–4 | 45–75 min | Doom-equivalent (Rot), territory, card combat | Single-player dominant; less voting emphasis |
| Vast: The Crystal Caverns | Asymmetric board game | 1–5 | 75–120 min | Asymmetric roles, non-elimination | Physical-first; poor digital accessibility |
| Betrayal at House on the Hill | Traitor cooperative | 3–6 | 60–120 min | Traitor reveal, scenario variety | Randomized scenarios; no territory engine |
| Slay the Spire | Roguelite deck-builder | 1 | 45–90 min | Card draw, deck management | Single-player only; no social layer |

### Positioning Statement

Iron Throne of Ashes occupies a gap between **social deduction games** (which have no territory strategy) and **asymmetric strategy games** (which have no shared loss condition). The Doom Toll creates mandatory cooperation pressure in a competitive territory game — a combination that does not exist as a shipped digital product at 2–4 player scale.

**The 35–55 player demographic** (Pandemic graduates who want more strategic depth) is underserved by the current digital board game market. Root skews younger and competitive. Armello skews younger and narrative. Iron Throne targets the Pandemic-experienced player who has outgrown pure cooperation but finds Root's asymmetric learning curve prohibitive.

### Competitive Moat

1. **GLL tokenization**: The Alliance Engine supports reskins without engine changes. Each reskin (Sea of Knives, Verdant Collapse) is a new SKU built on the same engine investment — competitors cannot replicate this without equivalent architectural investment.
2. **Rescue mechanic as emotional driver**: 2.8 rescue activations per session (observed in simulation) is higher than any tabletop game in this category. The mechanic creates session stories that drive word-of-mouth at a rate not achievable through pure competition.
3. **No-elimination design**: The Broken Court system makes the game accessible to group organizers (Elena, Devon) who reject games where players watch from the sidelines. This is a purchase-decision differentiator before a single mechanic is explained.

### Pricing Benchmarks

| Title | Steam Launch Price |
|-------|--------------------|
| Root (digital) | $14.99 + DLC |
| Armello | $19.99 |
| Wingspan (digital) | $19.99 |
| Gloomhaven (digital) | $29.99 |
| **Iron Throne of Ashes (target)** | **$19.99 base + reskin DLC** |

---

## Monetization Model

### Base Game: $19.99

All three play modes (Competitive, Blood Pact, Cooperative) ship in the base purchase. No paywalled modes. The base game includes the Iron Throne content pack and full AI opponent suite.

### DLC: GLL Reskin Packs ($4.99–$7.99 each)

The GLL tokenization architecture makes reskin packs the natural DLC strategy. Each pack requires no engine changes — only new content tokens, board art, and audio theme:

| Pack | Theme | Target Audience |
|------|-------|-----------------|
| Sea of Knives | Age of Sail pirates | Existing base owners seeking variety |
| Verdant Collapse | Ecological collapse biome variant | Environmentally-themed strategy fans |
| *[Future packs TBD]* | — | — |

Reskin packs are fully cosmetic from the engine's perspective — same balance, same mechanics, different nouns and visuals. This minimizes QA cost per pack.

### No Live Service / No Microtransactions

No pay-to-win mechanics. No randomized cosmetic packs. The game's reputation with the 35–55 demographic depends on clean, one-time purchase pricing. This is non-negotiable.

### Revenue Model Notes

- Primary revenue: Steam launch, one-time purchase
- Secondary revenue: DLC reskin packs (Sea of Knives target: 6 months post-launch)
- Mobile (iOS/Android): Flat purchase price, same as PC. No mobile-specific monetization.
- No subscription model.

---

## Success Metrics

### Launch Window (First 30 Days)

| Metric | Target |
|--------|--------|
| Steam unit sales (launch month) | 5,000+ |
| Steam review rating | ≥ 80% positive |
| Tutorial completion rate | ≥ 70% of players who start Tutorial complete all 5 turns |
| Session completion rate | ≥ 60% of started sessions reach end-game state |
| Average sessions per player (30 days) | ≥ 3 |
| Blood Pact mode adoption | ≥ 40% of multi-session players play at least one Blood Pact session |

### Balance Health (Ongoing)

| Metric | Target |
|--------|--------|
| Dark Lord win rate | 18–22% (per simulation; validated pre-ship) |
| Average rounds per session | 8–16 |
| Rescue events per game | 1–3 |
| PvP combats per game | 6–12 |
| Player Broken Court rate | 1–2 times per player per game average |

### Engagement Quality

| Metric | Target |
|--------|--------|
| Session abandonment before Round 4 | < 15% |
| Tutorial Turn 3 failure rate (War Field silent fail) | 0% — must not silently fail |
| Voting Phase participation rate (non-auto-abstain) | ≥ 85% |
| Online sync multiplayer sessions (vs. AI-fill solo) | ≥ 30% of all sessions |

### Post-Launch Roadmap Trigger

- If Sea of Knives DLC exceeds 20% attach rate among base owners at 3 months → greenlight Verdant Collapse pack.
- If Spectator mode is mentioned in ≥ 10% of Steam reviews → prioritize v1.1 spectator mode.

---

## Platform Requirements

### PC (Primary)

**Minimum:**
- OS: Windows 10 64-bit / macOS 12 Monterey
- CPU: Intel Core i5-8400 / AMD Ryzen 5 2600
- RAM: 8 GB
- GPU: NVIDIA GTX 1050 / AMD RX 570 (2 GB VRAM)
- Storage: 2 GB
- Network: Broadband for online multiplayer

**Recommended:**
- OS: Windows 11 / macOS 14 Sonoma
- CPU: Intel Core i7-10700 / AMD Ryzen 7 3700X
- RAM: 16 GB
- GPU: NVIDIA RTX 3060 / AMD RX 6600 (4 GB VRAM)
- Storage: 2 GB (SSD preferred for load times)

**Render targets:** 1080p primary, 2560×1440 secondary. Board and UI must be readable at both resolutions without scaling adjustments.

### Mobile (Secondary)

- iOS: iPhone 12 or later (iOS 16+)
- Android: Snapdragon 765G or equivalent (Android 11+)
- Minimum VRAM: 2 GB
- Target frame rate: 60 fps on recommended hardware

**Mobile UX constraints:**
- All interactive board nodes: minimum 44×44pt hit area (Apple HIG standard)
- Text minimum: 14pt at native resolution
- Voting Phase UI must be fully operable on 6-inch display without horizontal scroll

---

## Accessibility

### Core Commitments

- **No-elimination design**: Broken Court is the accessibility bedrock. No player is locked out of gameplay.
- **Session length**: 60–90 minutes fits a parent's evening. This is an explicit design constraint, not a coincidental outcome.
- **Tutorial pacing**: One mechanic per turn, introduced in gameplay order. No front-loaded rules dump.

### Visual Accessibility

| Feature | Requirement |
|---------|-------------|
| Colorblind mode | Must support Deuteranopia and Protanopia profiles. Court colors and Doom Toll states must be distinguishable in both modes. |
| Text scaling | All UI text must scale 100–150% without layout breakage |
| High-contrast mode | Shadowking silhouette and Broken Court indicators must remain legible at high contrast |
| Board node hit areas | ≥ 44×44px on PC, ≥ 44×44pt on mobile |
| Animation speed control | All atmospheric animations (Doom Toll advance, candle dimming) must respect a "reduced motion" setting |

### Input Accessibility

| Feature | Status |
|---------|--------|
| Full keyboard navigation (PC) | Required for all menu and action flows |
| Controller support (PC) | P1 — required for Steam Deck compatibility |
| Touch input (Mobile) | All actions operable via single-touch tap; no multi-finger gestures required for gameplay |
| Screen reader support | P2 — not a launch requirement |

### Cognitive Accessibility

- Discovered Tutorial tooltips surface mechanics at point of first encounter (not front-loaded)
- VULNERABLE indicator (yellow/red) provides early warning before Broken Court — no sudden state change
- Pre-combat summary screen shows Base Strength totals before Fate Cards are drawn — no mental math required during combat
- Doom Toll visual state changes are progressive (7 → 9 → 10+), not binary

---

## Marketing & Launch Strategy

### Core Message

*"The game where you have to save the player you were just trying to beat."*

The rescue mechanic is the marketing anchor. Focus group data: 5 of 8 personas named rescue as their most anticipated moment before completing a full session. The Doom Toll/Voting Phase pressure system is the hook; the rescue is the story.

### Target Channels

| Channel | Persona | Tactic |
|---------|---------|--------|
| Steam discovery | Marcus, Raj | Optimize tags: Strategy, Board Game, Multiplayer, Traitor, Cooperative |
| BoardGameGeek | Raj, Elena, Devon | Developer journal during pre-production; BGG listing with tutorial video |
| Twitch/YouTube | Zoe | Streamer seeding — Blood Pact mode is the streaming driver (reveal moments are clipable) |
| Discord strategy communities | Marcus, Priya | Closed beta access program; post-session screenshot sharing |
| Board game review YouTube | Raj, Devon | Review copies 6 weeks pre-launch |

### Pre-Launch Activities

- **Steam page**: Live during pre-production with wishlist CTA. Key art centered on Doom Toll track and Shadowking silhouette — conveys tension before a word is read.
- **Closed beta**: 50–100 players, targeted at BoardGameGeek community. Focus: balance validation (Dark Lord win rate), Tutorial Turn 3 failure rate.
- **Streamer seeding**: 10 content creators with ≥ 50K followers in board game / strategy space. Priority criteria: Blood Pact mode comfort, cooperative game experience.
- **Launch trailer**: Must show a rescue moment, a Blood Pact reveal, and a Final Phase visual transition. These are the three highest-engagement moments per focus group data.

### App Store / Steam Metadata

**Steam tags (priority order):** Strategy, Board Game, Multiplayer, Co-op, Traitor, Turn-Based, Card Game, Fantasy

**Short description:** *Four courts. One rising darkness. Someone at your table is helping it win.*

**Key features bullet points:**
- No player elimination — Broken Court keeps everyone in the game
- Three modes: Competitive, Cooperative, Blood Pact (traitor)
- The rescue mechanic creates the sessions your group will talk about
- 60–90 minute sessions designed for a game night schedule
- Fully reskinnable engine — more content packs planned

### Launch Window

- **Soft launch target**: Closed beta 60 days before launch
- **Launch**: PC (Steam) + Mobile simultaneously, or PC first with Mobile 30-day offset if Mobile QA requires additional time
- **Post-launch day 1 patch window**: Reserved. Known pre-ship items (simulation re-run, Cooperative mode balance deck) to be finalized in this window if not ship-complete.

---

## Security

### Data Collected

Iron Throne of Ashes collects no persistent personal data in the default configuration. Sessions are ephemeral; game state lives only for the duration of a session. The only exception is optional async multiplayer (planned for P2), which would require a server-side session store with appropriate data retention and deletion policies.

There is no account system in v1.0. No email, no login, no profile. The game is purchased once and played locally.

### Determinism as Cheat Prevention

All game randomness routes exclusively through `SeededRandom` — the only legal RNG in the codebase. The seed is fixed at session creation and shared authoritatively by the host in multiplayer sessions. This means:

- Any client attempting to re-roll random outcomes produces a mismatch with the host's authoritative seed, making manipulation detectable.
- Balance simulations can reproduce any session exactly from its seed, enabling post-session automated cheat auditing.
- `Math.random()` is banned from game logic (verified by grep — zero occurrences in `src/systems/`, `src/engine/`, `src/models/`).

### Multiplayer Trust Model (P1/P2)

When multiplayer is implemented, the server maintains the authoritative `GameState`. Clients submit actions; the server validates and applies them. Clients never mutate state directly. This architecture prevents:

- **Action injection** — submitting illegal moves or out-of-phase actions
- **State tampering** — editing local game state to claim strongholds or manipulate resources
- **Action replay** — submitting the same valid action twice

### Content Pack Validation

All content packs (GLL token registries) are validated at load time via `GLLValidationError`. Missing or malformed GLL keys cause a hard engine rejection before any game state is created — preventing corrupted or adversarially-crafted content packs from reaching the game loop. Token whitelisting is enforced at the registry level.

### Blood Pact Card Delivery (P1)

In Blood Pact mode, the traitor card must be delivered to a single player without revealing the assignment to other players or the host UI. This requires an encrypted one-way channel to the traitor's client. Implementation will use a session-scoped server secret and per-player delivery — the server never sends the traitor's identity to a broadcast channel.

### No Hardcoded Secrets

The engine contains no API keys, database credentials, or seed phrases. Content packs are data files only. No executable content can be injected through the GLL content pack system.

---

## Build Status

### Engine (Alliance Engine v1.0)

| Component | Status | Notes |
|-----------|--------|-------|
| `src/engine/` — Core game loop, phase resolution | ✅ Implemented | TypeScript, Vitest test suite |
| `src/gll/` — GLL token registry, validation | ✅ Implemented | 35 required tokens; `GLLValidationError` on missing keys |
| `src/models/` — GameState, Player, Board, Characters | ✅ Implemented | Strict TypeScript, no `any` types |
| `src/systems/combat.ts` — War Field resolution | ✅ Implemented | Deterministic from seed |
| `src/systems/voting.ts` — Voting Phase | ✅ Implemented | Broken Court participation enforced |
| `src/systems/doom_toll.ts` — Doom Toll tracking | ✅ Implemented | Final Phase threshold = 10 |
| `src/systems/shadowking.ts` — Behavior Card execution | ✅ Implemented | Seeded deterministic |
| `src/utils/seeded_random.ts` — SeededRandom | ✅ Implemented | All randomness routed through here |

### Content Packs

| Pack | Status |
|------|--------|
| `content/iron-throne/` — Iron Throne of Ashes | ✅ Complete (35/35 tokens) |
| `content/sea-of-knives/` — Age of Sail reskin | ✅ Complete (proof-of-concept; validates GLL swappability) |
| `content/verdant-collapse/` | 🔴 Not started |

### Features (P0 / P1 by Launch Checklist)

| Feature | Priority | Status |
|---------|----------|--------|
| F-001 Board: The Known Lands | P0 | ✅ Engine model complete; UI not started |
| F-002 War Banners | P0 | ✅ Engine complete |
| F-002.5 Fate Card Hand Management | P0 | ✅ Engine complete |
| F-003 Characters / Fellowship | P0 | ✅ Engine complete |
| F-004 War Field (Combat) | P0 | ✅ Engine complete |
| F-005 Doom Toll | P0 | ✅ Engine complete; visual state changes not started |
| F-006 Voting Phase | P0 | ✅ Engine complete |
| F-007 Broken Court State | P0 | ✅ Engine complete; automated test coverage required |
| F-008 Shadowking Behavior System | P0 | ✅ Engine complete |
| F-009 Herald Diplomatic Action | P1 | 🔴 Not implemented |
| F-010 Victory Conditions | P0 | ✅ Engine complete |
| F-011a Competitive Mode | P0 | ✅ Engine complete |
| F-011b Blood Pact Mode | P0 | ✅ Engine complete (server-side card delivery not started) |
| F-011c Cooperative Mode | P1 | 🟡 Partial — hard deck composition TBD in balance testing |
| F-012 Tutorial | P0 | 🔴 Not started |
| F-013 AI Opponents | P1 | 🔴 Not started |
| F-014 Multiplayer / Async | P1/P2 | 🔴 Not started |
| F-015 Atmosphere / Audio | P1 | 🔴 Not started |
| F-016 Persistent UI: Standings | P0 | 🔴 Not started |
| F-017 Post-Game Summary | P1 | 🔴 Not started |
| F-018 Fixed Turn Order | P0 | ✅ Engine complete |

**Overall status:** Core game engine is complete and test-covered. UI, networking, atmosphere, AI, and tutorial are all pre-implementation. The engine is ready for a rendering layer.

### Security

#### Data Collected

Iron Throne of Ashes collects no persistent personal data in the default configuration. Sessions are ephemeral; game state lives only for the duration of a session. The only exception is optional async multiplayer (P2), which requires a server-side session store.

#### Determinism as Cheat Prevention

All game randomness routes through `SeededRandom` (the only legal RNG). The seed is fixed at session creation and shared authoritatively by the host for multiplayer sessions. This means:
- Any client attempting to re-roll random outcomes will produce a mismatch with the authoritative host seed.
- Balance simulations can reproduce any session exactly from its seed — enabling automated cheat audit post-session.

#### Multiplayer Trust Model (P1/P2)

When multiplayer is implemented, the server maintains the authoritative `GameState`. Clients submit actions; the server validates and applies them. Clients never mutate state directly. This prevents:
- Action injection (submitting illegal moves)
- State tampering (editing local game state to claim strongholds)
- Action replay (submitting the same action twice)

#### Content Pack Validation

All content packs (GLL token registries) are validated at load time via `GLLValidationError`. Missing or malformed GLL keys cause a hard engine rejection before any game state is created — preventing corrupted or adversarially-crafted content packs from reaching the game loop.

#### Blood Pact Card Delivery (P1)

In Blood Pact mode, the traitor card must be delivered server-side to a single player without revealing the assignment to other players or the host UI. This requires an encrypted one-way channel to the traitor's client. Implementation uses a session-scoped server secret and individual player delivery — the server never sends the card identity to a broadcast channel.

#### No Hardcoded Secrets

The engine contains no API keys, database credentials, or seed phrases. Content packs are data files only. The GLL registry enforces token whitelisting, preventing injection of executable content through content packs.

---

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-04 | Initial PRD — full feature spec, balance parameters, launch checklist |
| 1.1 | 2026-03-06 | Added Competitive Landscape, Monetization Model, Success Metrics, Platform Requirements, Accessibility, Marketing & Launch Strategy, Build Status |
| 1.2 | 2026-03-08 | Added Security section |

---

*Iron Throne of Ashes · Alliance Engine v1.0 · Built for Claude Code*
