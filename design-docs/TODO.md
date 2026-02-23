# Iron Throne of Ashes — Development To-Do List

## Alliance Engine v1.0

> **Status:** Pre-production → Development
> **Priority notation:** P0 = launch blocker · P1 = launch required · P2 = post-launch v1.1 · P3 = roadmap

---

## Phase 0: Project Setup & Architecture ✅

- [x] Choose game engine / framework — TypeScript + Vitest (Phaser for rendering in later phases)
- [x] Initialize project scaffolding (directory structure, build system, dependency management)
- [x] Define GLL (Genre Language Library) token architecture — all in-world nouns must be swappable content wrappers, no hardcoded nouns in game logic
- [x] Implement GLL token registry and lookup system
- [x] Set up deterministic random seed system (required for simulation reproducibility and balance testing)
- [x] Define core data models: GameState, Player, Board, Round, Phase
- [x] Set up automated test framework — 49 tests passing
- [x] Set up CI/CD pipeline — GitHub Actions workflow
- [x] Establish coding standards and contribution guidelines — CLAUDE.md

---

## Phase 1: Board — The Known Lands (F-001, P0)

- [x] Implement point-to-point graph data structure (28 nodes, adjacency list)
- [x] Define node types: Standard Stronghold (22), Forge Keep (4), Dark Fortress (1), Hall of Neutrality (1)
- [x] Enforce board constraints:
  - [x] Equal path distance (±1 node) from each Court starting position to nearest Forge Keep
  - [x] Dark Fortress not adjacent to any Court starting Keep
  - [x] Each Court's starting Keep pre-claimed at game start
- [x] Implement pathfinding (shortest path between nodes for movement cost calculation)
- [x] Render board at 1080p and 2560×1440
- [x] Ensure all 28 nodes individually selectable with hit area ≥ 44×44px
- [x] Render connection paths as distinct, non-overlapping lines
- [x] Visually distinguish Forge Keep nodes from Standard Strongholds at a glance
- [x] Place Unknown Wanderer tokens face-down across Standard Stronghold nodes at game start (20 tokens)

---

## Phase 2: Resource System — War Banners (F-002, P0)

- [x] Implement War Banner as the single unified resource
- [x] War Banner generation: 1 per Artificer per turn, 3 at Forge Keep Strongholds
- [x] War Banner spending: movement (1 per node), Stronghold claiming (1), combat strength (additive)
- [x] War Banners do not persist between rounds — discard unspent at round end
- [x] War Banner count always visible to all players (open information)
- [x] UI: immediate updates on production, spend, or discard
- [x] UI: clearly distinguish current Banners vs. Banners generated this turn
- [x] UI: visually distinct zero-Banner state

---

## Phase 3: Characters — Fellowship Composition (F-003, P0)

- [x] Implement character data model with Power Levels:
  - [x] Arch-Regent (Power 8) — leader, drives Fate Card draw count, cannot be removed
  - [x] Knight (Power 6) — combat specialist, claims Strongholds, challenges Death Knights
  - [x] Herald (Power 0) — recruits Unknown Wanderers, Diplomatic Protection when solo
  - [x] Artificer (Power 3) — generates War Banners, multiplied output at Forge Keeps
- [x] Set starting Fellowship: 1 Arch-Regent + 1 Knight + 1 Herald + 1 Artificer per Court
- [x] Implement Fellowship management (max size: 8 characters including Arch-Regent)
- [x] Implement Unknown Wanderer pool: 40% Knights, 30% Heralds, 30% Artificers (random distribution)
- [x] Implement Recruit action (Herald only, 1 action, reveals adjacent face-down token)
- [x] Implement Diplomatic Protection:
  - [x] Active when Herald occupies a node alone
  - [x] Other Arch-Regents cannot initiate War Field against solo Herald
  - [x] Blight Wraiths ignore Diplomatic Protection
  - [x] Protection drops when any other Fellowship character enters Herald's node
- [x] UI: Fellowship composition visible to all players at all times
- [x] UI: Unknown Wanderer tokens visually indistinguishable face-down
- [x] UI: Diplomatic Protection state clearly indicated on board
- [x] UI: Recruit action greyed out (not hidden) when no Herald in Fellowship

---

## Phase 4: Turn Structure & Game Loop

- [x] Implement round structure:
  1. Shadowking Phase (draw & resolve Behavior Card)
  2. Voting Phase (all players vote simultaneously)
  3. Player Action Phases (2 actions per player, 1 if Broken Court)
- [x] Implement action system: move, claim Stronghold, recruit, initiate combat, rescue
- [x] Enforce phase ordering: Voting Phase resolves before any player action phase
- [x] Implement turn indicator and round counter
- [x] Implement end-of-round cleanup (discard unspent War Banners, generate new Banners)

---

## Phase 5: Combat — The War Field (F-004, P0)

- [x] Implement War Field trigger conditions:
  - [x] Two Fellowships on same node at end of movement
  - [x] Fellowship moves into node occupied by Shadowking force
  - [x] Combat is not optional when Fellowships share a node
- [x] Implement combat resolution sequence:
  1. Calculate Base Strength (sum Power Levels + current War Banners)
  2. Attacker draws ceil(Arch-Regent Power ÷ 4) Fate Cards, plays one face-down
  3. Defender draws one fewer Fate Card (min 1), plays one face-up
  4. Simultaneous reveal
  5. Add card values to Base Strength (negative values reduce, floor at 0)
  6. Higher total wins; ties go to Defender
  7. Loser draws Penalty Cards equal to margin
- [x] Implement Fate Card deck:
  - [x] Weighted distribution: 0 (8%), 1 (12%), 2 (14%), 3 (10%), 4 (4%), −1 (2%), blank/0 (50%)
  - [x] Deck reshuffle when exhausted → advances Doom Toll by 1
- [x] Implement Penalty Card system:
  - [x] Accumulate separately from Fate Cards
  - [x] Persist until rescued or game ends
  - [x] Trigger Broken Court when Penalty Cards ≥ War Banner count
- [x] Implement Shadowking forces combat:
  - [x] Death Knight base strength: 10 (fixed, no Fate Cards)
  - [x] Blight Wraith base strength: 6 (fixed, no Fate Cards)
  - [x] Defeating Death Knight reduces Doom Toll by 1
- [x] UI: simultaneous card reveal (no sequential)
- [x] UI: display margin before Penalty Card assignment
- [x] UI: tooltip explaining face-down/face-up asymmetry
- [x] UI: Fate Card reshuffle notification + Doom Toll advance animation

---

## Phase 6: The Doom Toll (F-005, P0)

- [x] Implement 13-space shared track
- [x] Implement advance triggers (+1 each):
  - [x] Non-unanimous Voting Phase result
  - [x] Fate Card deck reshuffle
  - [x] Blight Wraith claims a Forge Keep Stronghold
  - [x] Any Arch-Regent enters Broken Court state
- [x] Implement recede triggers (−1 each):
  - [x] Fellowship defeats a Death Knight
  - [x] Player reclaims Forge Keep from Blight Wraith
  - [x] 3+ active Arch-Regents vote unanimously AND all spend required Fate Cards
- [x] Implement Final Phase (Toll position 10+):
  - [x] Two Behavior Cards drawn and resolved per round
  - [x] Blight Wraiths auto-spread to adjacent unoccupied Standard Stronghold per round
  - [x] Voting cost increases by 1 Fate Card
- [x] Enforce constraints: cannot advance past 13, cannot recede below 0
- [x] Cumulative advance/recede resolved sequentially (Shadowking phase first, then player phase)
- [x] UI: large persistent element (not sidebar, not tooltip)
- [x] UI: visual state transitions:
  - [x] Positions 1–6: neutral ambient
  - [x] Positions 7–9: candles dimming, Shadowking silhouette at board edge
  - [x] Positions 10–12: board lighting shift, Shadowking silhouette grows, enhanced Blight spread animations
  - [x] Position 13: game-over sequence
- [x] UI: readable from any screen position without scrolling
- [x] UI: Toll advance animation plays before next game action (not async)

---

## Phase 7: The Voting Phase (F-006, P0)

- [x] Implement voting system: COUNTER or ABSTAIN for all active Arch-Regents
- [x] Votes hidden until all committed (simultaneous reveal)
- [x] Implement vote resolution:
  - [x] All COUNTER + Fate Card cost paid → Behavior Card blocked/reduced
  - [x] Any abstain or insufficient cards → full effect + Doom Toll +1
- [x] Broken Court Arch-Regents vote at full standing
- [x] Fate Card cost: 1 per player (standard), 2 per player (Final Phase, Toll 10+)
- [x] Implement Behavior Card vote effects table:
  - [x] SPAWN: blocked = Wraiths placed but cannot move this round
  - [x] MOVE: blocked = Death Knight stays in current position
  - [x] CLAIM: blocked = claim cancelled
  - [x] ASSAULT: blocked = assault cancelled
  - [x] ESCALATE: blocked = Doom Toll +1 (cannot be fully blocked)
- [x] Auto-abstain for players with 0 Fate Cards
- [x] UI: clear indication of auto-abstain before vote timer expires
- [x] UI: 60-second vote timer for online play (auto-abstain on expiry)

---

## Phase 8: Broken Court State (F-007, P0)

- [x] Implement Broken Court trigger: Penalty Cards ≥ War Banner count
- [x] Implement Broken Court effects:
  - [x] Reduce to 1 action per turn (from 2)
  - [x] Cannot initiate War Field combat
  - [x] Cannot claim Strongholds
  - [x] Cannot perform Recruit action
  - [x] **Retains full Voting Phase participation** (NON-NEGOTIABLE)
  - [x] Retains existing Stronghold claims
  - [x] Can still defend if War Field initiated against their node
- [x] Implement Rescue mechanic:
  - [x] Any active Arch-Regent may rescue (costs 1 of their 2 actions)
  - [x] Rescuer donates 2–5 Fate Cards
  - [x] Rescued player: restores War Banners = cards donated, clears all Penalty Cards, returns to active
  - [x] Cannot rescue self
  - [x] Only first successful rescue per round takes effect
- [x] Implement all-Broken draw condition: all active Arch-Regents simultaneously Broken → game ends as Draw
- [x] UI: Broken Court visually distinct on board (icon change, reduced action indicators)
- [x] UI: Voting Phase does NOT visually demote Broken Court player's vote
- [x] UI: Rescue action clearly accessible from action menu (not buried)
- [x] UI: recovery animation visible to all players
- [x] **Write automated test: Broken Court state NEVER prevents Voting Phase participation**

---

## Phase 9: The Shadowking Behavior System (F-008, P0)

- [x] Implement Behavior Deck (20 cards): 6× SPAWN, 6× MOVE, 4× CLAIM, 3× ASSAULT, 1× ESCALATE
  > Note: Balance-adjusted from original (ESCALATE reduced 2→1, MOVE increased 5→6)
- [x] Implement Shadowking forces:
  - [x] Death Knights: 2 at start, max 4, Power Level 10, mobile
  - [x] Blight Wraiths: 0 at start, max 9, Power Level 6, static after placement
- [x] Implement card resolution rules:
  - [x] SPAWN: place up to 2 Blight Wraiths adjacent to Dark Fortress (overflow: farthest reachable node from leader)
  - [x] MOVE: closest Death Knight to leading Arch-Regent moves 2 nodes toward them
  - [x] CLAIM: farthest Death Knight from any player claims nearest unoccupied Standard Stronghold
  - [x] ASSAULT: Death Knight adjacent to weakest Arch-Regent initiates War Field
  - [x] ESCALATE: Doom Toll +2 (reduced to +1 if vote unanimous)
- [x] Implement "Leading Arch-Regent" definition: most Strongholds (tiebreak: highest War Banners)
- [x] Enforce constraints:
  - [x] Never target Dark Fortress or Hall of Neutrality
  - [x] Death Knights cannot occupy same node as solo Herald (Diplomatic Protection for MOVE, not ASSAULT)
  - [x] Deck reshuffle advances Doom Toll by 1
- [x] Fully deterministic execution from given seed
- [x] UI: Shadowking action fully animated before player actions each round
- [x] UI: active Behavior Card displayed during resolution
- [x] UI: Shadowking forces visually distinct from all player pieces (no color overlap)

---

## Phase 10: Herald Diplomatic Action (F-009, P1)

- [x] Implement Diplomatic Action at Dark Fortress:
  - [x] Herald must travel alone (no other Fellowship characters in movement group)
  - [x] No Death Knight or Blight Wraith occupying Dark Fortress at time of entry
  - [x] Costs 1 action
  - [x] Reduces Doom Toll by 1
  - [x] Once per game per Herald character (mark Herald after use)
- [x] UI: Dark Fortress shows Herald interaction indicator when solo Herald is adjacent
- [x] UI: Diplomatic Action available in action menu when conditions met
- [x] UI: Doom Toll reduction animation plays immediately after confirmation
- [x] Action log records diplomatic action for all players

---

## Phase 11: Victory Conditions (F-010, P0)

- [x] Implement Player Victory — Territory Control:
  - [x] Heartstone reclaimed from Shadowking
  - [x] Arch-Regent holding Heartstone + most Strongholds wins
  - [x] Tiebreak: highest War Banners → coin flip (disclosed)
- [x] Implement Shadowking Victory — Doom Toll reaches 13:
  - [x] All players lose (except Blood Pact holder in Traitor mode)
- [x] Implement Draw — All Courts Broken simultaneously:
  - [x] Game ends immediately, all players lose
- [x] Victory triggers immediately when conditions met (no end-of-round delay)
- [x] UI: persistent standings indicator showing current Stronghold counts
- [x] UI: "who is winning" legible from main board view without score panel

---

## Phase 12: Game Modes (F-011)

### Competitive Mode (P0)
- [x] Standard 2–4 player game
- [x] Territory victory or Shadowking victory
- [x] No hidden information except Unknown Wanderer tokens

### Blood Pact / Traitor Mode (P0)
- [x] Blood Pact card dealt privately via app (no physical shuffle tell)
- [x] Blood Pact delivery is server-side (never sent to non-recipient clients)
- [x] Blood Pact Arch-Regent wins if and only if Doom Toll reaches 13
- [x] All normal player actions available (no mechanical restriction, only strategic incentive)
- [x] Blood Pact reveal conditions:
  - [x] Game end (post-game summary)
  - [x] Unanimous accusation by all other active Arch-Regents (costs 2 Fate Cards each, failed accusations are costly)
- [x] UI: mode selection is first post-lobby screen

### Cooperative Mode (P1)
- [x] All Arch-Regents win collectively by reclaiming Heartstone before Doom Toll completes
- [x] Harder Shadowking Behavior Deck (composition TBD in balance testing)
- [x] No PvP War Field (Fellowships may share nodes without combat)
- [x] UI: War Field initiation disabled between player Fellowships

---

## Phase 13: Persistent UI — Standings & Status (F-016, P0)

- [x] Always visible on main board view (no separate panel required):
  - [x] Doom Toll position and current phase
  - [x] Each player's Stronghold count
  - [x] Each player's War Banner count
  - [x] Each player's Broken Court status
  - [x] Current round number
  - [x] Whose turn / Voting Phase active indicator
- [x] Standings panel ≤ 15% of board area
- [x] Readable at 1080p without zooming
- [x] Broken Court uses distinct visual indicator (not just color change)
- [x] Broken Court indicator on standings panel AND on Court's board piece
- [x] Voting Phase clearly distinguishable from action phase

---

## Phase 14: Tutorial — Into the Blighted Wastes (F-012, P0)

- [x] Implement 5-turn guided tutorial (non-skippable for first-time players):
  - [x] Turn 1 — March from Your Keep: movement, War Banner costs, claiming
  - [x] Turn 2 — Send the Herald Ahead: recruitment, Diplomatic Protection
  - [x] Turn 3 — Your First Battle: War Field resolution, Fate Cards, Penalty Cards
  - [x] Turn 4 — The Toll Strikes: Doom Toll, Voting Phase, cost of abstaining
  - [x] Turn 5 — Claim the Forge Keep: production loop, Forge Keep strategic value
- [x] Each turn introduces exactly one mechanic (never two)
- [ ] Tutorial opposition is scripted (not AI) — deterministic for reproducibility
- [x] Tutorial does not track win/loss — ends after Turn 5
- [x] All tutorial dialogue skippable with single button press (no confirmation)
- [x] Implement Discovered Tutorials (contextual tooltips, post-mandatory):
  - [ ] First Artificer recruited
  - [ ] First rescue performed (either direction)
  - [ ] First Death Knight combat
  - [ ] First time Doom Toll reaches Final Phase
  - [ ] First Blood Pact accusation (Blood Pact mode only)
- [ ] Discovered Tutorials do NOT appear during mandatory tutorial
- [ ] First-session detection: reliable, does not re-trigger on returning players
- [ ] Tutorial completion persists across reinstalls (server-side flag)
- [ ] Test Tutorial Turn 3 (War Field) with Devon and Sam personas

---

## Phase 15: AI Opponents (F-013, P1)

- [ ] Implement 3 AI difficulty levels:
  - [ ] Apprentice: expansion priority, rarely abstains, no leader-targeting (for Devon/Sam)
  - [ ] Knight-Commander: balanced play, leader-targeting, ~12% abstain rate (default for solo)
  - [ ] Arch-Regent: full heuristic play, check-the-leader voting, aggressive Forge Keep targeting, optimal rescue timing
- [ ] AI fills empty player slots in solo play
- [ ] AI fills disconnected player slots (after 90-second reconnect window)
- [ ] AI never receives Blood Pact card (human players only)
- [ ] AI behavior deterministic from given seed
- [ ] AI processing time: no perceivable delay on target hardware
- [ ] UI: AI opponents labeled distinctly from human players
- [ ] All difficulty levels available from lobby setup

---

## Phase 16: Atmosphere & Audio (F-015, P1)

### Visual State Layers
- [x] Doom Toll 1–6: default board state
- [x] Doom Toll 7–9: candles dimming (10% opacity reduction per position), Shadowking silhouette at board edge (low opacity)
- [x] Doom Toll 10–12: warm-to-cold lighting shift, Shadowking silhouette 80%, enhanced Blight Wraith animations
- [x] Doom Toll 13: game-over cutscene

### Event Animations (Required)
- [x] Doom Toll advance: bell-strike animation, audio cue, counter increment
- [x] Rescue confirmation: distinct visual + audio beat (emotional peak of session — premium production value)
- [x] Blood Pact reveal: full-screen moment (not sidebar notification), requires intentional confirmation to dismiss
- [x] Death Knight defeated: particle effect at node, Doom Toll recede animation

### Audio
- [ ] Ambient soundtrack: 3 states (Default, Pressure at Toll 7+, Final Phase at Toll 10+)
- [x] Doom Toll advance: distinct audio cue (different from other notifications)
- [x] Rescue action: unique audio signature
- [ ] All audio mutable via settings

### Constraints
- [x] All atmosphere changes driven by game state variables (not timers)
- [x] Atmosphere must not obscure board readability at any Toll position

---

## Phase 17: Multiplayer & Async Play (F-014)

### Online Synchronous (P1)
- [ ] 2–4 human players in real time
- [ ] Standard session length: 60–90 minutes
- [ ] Voting Phase timer: 60 seconds per round
- [ ] Disconnected player: AI fills at Knight-Commander after 90-second reconnect window
- [ ] Session state fully server-side (no local session files)
- [ ] Rejoin restores complete game state (Penalty Cards, Broken Court flags, Doom Toll)

### Async / Pass-and-Play (P2)
- [ ] Each player takes turn when available
- [ ] Voting Phase resolved when all players have submitted (no timer)
- [ ] Session may span multiple days
- [ ] Blood Pact mode disabled for async
- [ ] Clear "it's your turn" notification

---

## Phase 18: Post-Game Summary (F-017, P1)

- [ ] Display final board state (Stronghold map at game end)
- [x] Display Doom Toll final position
- [x] Per-player stats:
  - [x] Strongholds claimed
  - [x] Fellowships recruited
  - [x] War Banners spent
  - [x] Combats won/lost
  - [x] Times in Broken Court
  - [x] Rescues given / received
  - [x] Votes cast vs. abstained
- [x] Win condition that triggered
- [ ] Blood Pact identity revealed with action log (if Blood Pact mode)
- [x] Blood Pact reveal is full-screen moment before stats (definitive reveal)
- [ ] Summary displayed simultaneously to all players (server-side rendering for online)
- [x] Skippable after 5 seconds
- [x] Primary CTAs: "Play again" and "Return to lobby"

---

## Phase 19: Balance Testing & Simulation

- [x] Confirm Behavior Deck adjustment: ESCALATE 2→1, MOVE 5→6
- [x] Run balance simulation with updated deck
- [ ] Verify Dark Lord win rate: 18–22% (target)
- [ ] Verify average rounds per session: 8–16 (observed: 13.2)
- [ ] Verify Doom Track peak: 5–8 (observed: 6.4)
- [ ] Verify rescue events/game: 1–3 (observed: 2.8)
- [ ] Verify PvP combats/game: 6–12 (observed: 13.6 — monitor post-fix)
- [ ] Verify territory spread (max−min): 3–6 (observed: 4.8)
- [ ] Verify Heartstone claimed rate: 50–80% (observed: 80%)

---

## Phase 20: GLL Verification & Engine Reusability

- [x] All GLL tokens confirmed swappable without engine changes
- [x] Run Sea of Knives reskin test (swap all Iron Throne nouns → Age of Sail nouns)
- [x] Verify no hardcoded nouns remain in game logic
- [x] Document GLL token dictionary for future reskins

---

## Phase 21: Launch Checklist

> Every item below must be TRUE before ship.

- [x] ESCALATE cards reduced from 2 to 1; MOVE cards increased from 5 to 6
- [ ] Simulation confirms Dark Lord win rate 18–22% with updated deck
- [x] Herald Diplomatic Action (F-009) implemented and tested
- [x] Blood Pact mode ships at launch (not post-launch)
- [ ] Persistent standings UI (F-016) passes readability test at 1080p
- [ ] Rescue event has distinct audio + visual signature (F-015)
- [ ] Tutorial Turn 3 (War Field) tested with Devon and Sam personas — no silent failure
- [ ] Post-game Blood Pact reveal implemented (F-017)
- [x] All GLL tokens confirmed swappable (Sea of Knives reskin test)
- [x] Broken Court state never prevents Voting Phase participation (F-007) — automated test coverage

---

## Deferred to Post-Launch

| Feature | Target Version | Status |
|---|---|---|
| Asymmetric faction powers | v1.1 | Designed, not built |
| Spectator mode | v1.1 | Required for streaming |
| Cross-platform async save | v1.1 | Mobile launch secondary |
| Steam Workshop (custom skins) | v1.2 | GLL enables this |
| Biome Affinity system | v2.0 (Verdant Collapse) | Eco-thriller reskin |
| Tournament / rated matchmaking | v2.0 | Requires playerbase |

---

*Iron Throne of Ashes · Alliance Engine v1.0 · Built for Claude Code*
