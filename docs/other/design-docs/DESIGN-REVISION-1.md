# Iron Throne of Ashes — Design Revision 1

## Fixes for Six Rough Edges

**Status:** Pre-revision proposal · Ready for PRD integration
**Scope:** Five mechanic designs + one balance confirmation + one legacy discrepancy resolved
**Authoring note:** These designs prioritize player enjoyment, information legibility, and meaningful interaction. Each section identifies the problem, states the design decision, specifies the mechanic, and lists implications for the PRD and User Manual.

---

## Overview: What This Revision Solves

| # | Rough Edge | Fix |
|---|---|---|
| 1 | Territory Victory trigger is "spec TBD" | Heartstone becomes a living board token with clear reclaim rules and a legible end-condition |
| 2 | Player turn order in Action Phase never stated | Fixed turn order, randomly assigned at setup, explicitly documented |
| 3 | Heartstone has no board presence during play | Resolved together with Fix 1 — same design |
| 4 | Fate Card hand management unexplained | Complete hand management system with Herald-driven capacity |
| 5 | ESCALATE balance fix needs verification | Confirmed design rationale + simulation requirement formalized |
| 6 | Blood Pact accusation mid-game outcome underspecified | Full accusation resolution designed for both success and failure |

Additionally: a discrepancy between the VISION.md and PRD victory conditions is resolved in Appendix A.

---

## Fix 1 & 3 — The Heartstone as a Living Board Element

### Problem

The Heartstone is the game's central MacGuffin. It is introduced in the opening narrative, mentioned in setup (Hall of Neutrality), and referenced in the Territory Victory condition — and then vanishes from the board entirely. The PRD labels the Territory Victory trigger "spec TBD." A player who finishes the tutorial cannot picture the climactic moment of the game, because the design hasn't fully resolved it.

The result is a game whose narrative payoff is invisible during play. The Shadowking stole the Heartstone. Players never actually interact with the thing they're meant to be recovering.

### Design Decision

**The Heartstone is a physical board token, visible and interactive throughout the game.** It starts at the Dark Fortress (where the Shadowking took it) and can be reclaimed from there, carried by a Fellowship, dropped on combat loss, and held to trigger the Territory Victory condition. It is always visible on the board. Its location is always public information.

The "second deck reshuffle" trigger from the draft PRD is retired. The Territory Victory condition becomes a board-state check, not a probability event: **hold the Heartstone AND hold the most Strongholds at the end of any round.**

This replaces an opaque trigger with a legible, dramatic one that the board communicates at a glance — directly addressing Devon's pre-game concern ("how do I know if I'm winning?") and making the end-game visible to all players in real time.

### Mechanic Specification

**Heartstone Placement at Setup**

The Heartstone token is placed at the Dark Fortress node at game start. (Narrative: the Shadowking carried it there when the Compact shattered. The Hall of Neutrality marks where it once rested — a historical note, not its current location.) The Hall of Neutrality node retains its neutral status; it has no special Heartstone rules.

**Clearing the Dark Fortress**

A Fellowship can interact with the Heartstone only when the Dark Fortress is unoccupied by Death Knights. Blight Wraiths never occupy the Dark Fortress itself (per existing SPAWN rules: Wraiths are placed adjacent to, not at, the Fortress). Death Knights at the Fortress must be defeated in War Field combat before the Reclaim action becomes available.

Death Knight count at the Dark Fortress at any time is a function of the Behavior Deck draw history. There will be games in which the Fortress is never guarded, and games in which two Death Knights anchor there. This variance is intentional — it creates different paths to the Heartstone across sessions.

**The Reclaim Action**

A Fellowship occupying an unguarded Dark Fortress node may spend 1 action to perform the Reclaim action. No War Banner cost. The Heartstone token moves to the Arch-Regent's HUD. All players can see who holds the Heartstone at all times.

The Reclaim action is available from the standard action menu when conditions are met. It is greyed out (not hidden) when the Fortress is occupied by a Death Knight.

**The Heartstone in Play**

The Heartstone moves with the holding Arch-Regent's Fellowship. It is represented by a distinct overlay on the holding Court's board piece — visible without opening a panel.

If the Heartstone-holder loses a War Field combat (against any opponent — player or Shadowking force), the Heartstone drops to the current node as a free token. Any Fellowship that occupies that node may claim it with 1 action (no Banner cost). This creates a mid-game scramble dynamic and ensures the Heartstone is never permanently safe once in play.

If the Heartstone drops at an unoccupied node, it rests there until a Fellowship arrives to claim it. The Heartstone token remains visible on the board. Its node location is shown on the persistent UI.

**Territory Victory Trigger**

At the end of every round's Production Phase, the game checks the following condition:

> *A player holds the Heartstone AND controls more Strongholds than any other player.*

If true: Territory Victory triggers immediately. That player wins.

If the Heartstone-holder is tied for most Strongholds: the tiebreaker sequence applies in order — (1) highest current War Banner count, (2) disclosed coin flip. The tiebreaker result is shown to all players before the win sequence plays.

**Design Rationale**

The end-of-round check (rather than a mid-round check) gives opponents one action window to contest after the Heartstone is claimed. A player who snatches the Heartstone in their action phase cannot win on that same turn — the Production Phase end-check happens after all action phases complete. Opponents know the check is coming and have their remaining actions to respond.

This "last lap" dynamic — everyone sees the win condition is about to trigger, everyone has one action window to disrupt it — is the design's intended dramatic peak. The board communicates it without UI text: the Heartstone token is on someone's piece, the Stronghold count in the persistent UI shows who's ahead. Players will recognize the moment without being told.

### Implications for PRD

- **F-010 (Victory Conditions):** Replace "second Fate Card deck reshuffle" trigger entirely. New trigger: end-of-round Production Phase check, Heartstone held + most Strongholds.
- **F-001 (Board):** Hall of Neutrality node description updated — no longer the Heartstone's in-game position. Heartstone starts at the Dark Fortress.
- **F-008 (Shadowking Behavior):** Note that Death Knights at the Dark Fortress are the primary obstacle to Heartstone access. No new rules required — existing War Field rules apply.
- **F-016 (Persistent UI):** Add Heartstone location to the always-visible UI elements. One line: current holder (or "Dark Fortress" / node name if uncontrolled).

### Implications for User Manual

- Setup section: Heartstone token placed at Dark Fortress during setup.
- Turn structure: The Reclaim action added to the Action Phase action list.
- Victory Conditions section: Rewrite to describe the board-state check. Remove deck-reshuffle language.
- The manual's opening narrative already sets up this design correctly — "the Shadowking walked to the Hall of Neutrality, took the Heartstone, and retreated to his Dark Fortress." No narrative changes needed.

---

## Fix 2 — Player Turn Order in the Action Phase

### Problem

The manual and PRD describe the Voting Phase as simultaneous and the Shadowking Phase as a single event, but neither document states who goes first in the Player Action Phase, whether order is fixed or rotates, or how it is assigned.

### Design Decision

**Turn order is fixed for the entire game session, assigned by a disclosed random draw at setup, proceeding clockwise.** It does not rotate round to round.

Fixed turn order is chosen over rotating first-player for three reasons:
1. The Voting Phase is simultaneous — first-player advantage is already neutralized in the game's highest-stakes decision each round.
2. Fixed order is easier for Devon and Sam to track. "I always go second" is learnable; "figure out who's going first this round" is a friction point repeated every round.
3. The Shadowking acts first every round, re-anchoring the round structure before any player advantage can compound from turn order.

### Mechanic Specification

At lobby setup, after mode selection, the game performs a disclosed random seat assignment. Players see the order: "Court of the Deep Root → Court of the Ember Crown → Court of the Gale Throne → Court of the Tide Seal." This order is fixed for the session.

The persistent UI displays a turn order tracker showing whose action phase is active. The tracker is visible throughout the round — during Shadowking Phase, Voting Phase, and Action Phases.

In the Voting Phase, all players submit simultaneously regardless of turn order. Turn order is relevant only for Action Phases.

**Online and async play:** In online synchronous play, the action phase time limit applies per player per turn. In async play, the "it's your turn" notification fires when the previous player's action phase completes.

### Implications for PRD

- New specification under F-006 or a standalone F-018 (Round Structure): Document turn order assignment and fixed sequence.
- F-016 (Persistent UI): Add turn order tracker to always-visible UI elements.

### Implications for User Manual

- Setup section: Add "Turn order is determined by a random draw at setup and is fixed for the session. It will be shown in the turn tracker at the top of the screen."
- Round Structure / Phase 3: Add "Players take their action phases in the fixed turn order established at setup."

---

## Fix 4 — Fate Card Hand Management

### Problem

Fate Cards appear in three contexts in the PRD (combat draws, voting costs, rescue donations) but the core hand management system — starting hand size, replenishment timing, hand limit, and the distinction between personal hands and combat draws — is never specified. A player who runs out of Fate Cards mid-game cannot understand how they got there or how to recover.

### Design Decision

**Fate Cards operate as two distinct pools with different replenishment rules.** Personal hand cards are a managed resource that persists across rounds and is driven by Herald count. Combat draws are fresh from the shared deck, used and discarded per combat. Treating these as separate systems removes ambiguity about when cards come and go.

**Herald count drives hand capacity.** A Fellowship rich in Heralds holds more political capital. This adds a third strategic reason to recruit Heralds (beyond recruitment and Diplomatic Protection), making Herald-heavy Fellowship composition a distinct and viable archetype: less combat power, more political staying power, stronger voting position.

### Mechanic Specification

**Two Fate Card Pools**

*Personal Hand* — Cards held by each player. Used for: Voting Phase (COUNTER costs), Rescue donations. These cards persist between rounds up to the hand limit. They are not discarded at round end.

*Combat Draws* — When a War Field triggers, the attacker draws fresh cards from the shared Fate Card deck, selects one, plays it face-down. The defender draws one fewer (minimum 1), selects one, plays it face-up. After combat resolves, all drawn-but-unplayed cards are discarded to the deck's discard pile. Combat draws never pass through or interact with a player's personal hand.

This separation means: spending Fate Cards in the Voting Phase and spending them on Rescue are the only ways to drain a personal hand. Combat does not touch personal hands.

**Starting Hand**

Each player draws 3 Fate Cards from the shared deck at game start. This is their opening personal hand.

**Hand Limit**

Base hand limit: 3 cards.
+1 per Herald in the Fellowship beyond the first (each additional Herald increases the hand limit by 1).
Maximum hand limit: 6 cards.

| Herald count | Hand limit |
|---|---|
| 0 (Herald lost, no replacements) | 3 |
| 1 (starting Herald) | 3 |
| 2 | 4 |
| 3 | 5 |
| 4+ | 6 |

**Replenishment**

At the Production Phase (end of each round, after Artificers generate War Banners), each player draws Fate Cards from the shared deck until their hand reaches their current hand limit.

If a player is already at or above their hand limit (e.g., they were frugal with votes), they draw 0 cards. There is no forced discard — excess cards above the limit cannot be held, so the limit is a ceiling that prevents hoarding, not a mandatory discard trigger.

**Design Rationale and Strategic Implications**

This system creates three distinct Fellowship archetypes with different political profiles:

*Knight-heavy Fellowship:* Strong combat, low Herald count, hand limit stays at 3. Win fights, accumulate territory, but vote less often or at greater cost. Good for aggressive early expansion; struggles late when voting becomes critical.

*Herald-heavy Fellowship:* Lower combat power, high Herald count, hand limit grows to 5–6. COUNTER votes reliably without draining to zero. More likely to rescue effectively. Less able to hold Strongholds by force; more able to maintain political alignment. Most effective in long games with high Doom Toll pressure.

*Balanced Fellowship:* 1–2 Heralds, hand limit of 3–4. The default path. Flexible but never optimal at any one axis.

This makes "what kind of Fellowship are you building?" a genuine strategic identity question, not just a combat-optimization problem. The focus group data supports this — Priya's comment ("I rescued my rival because I needed his vote") reflects exactly the political capital management this system formalizes.

**Edge Case: Herald Lost in Combat**

If a player loses their only Herald in combat (defeated in a War Field where the Herald was present), their hand limit drops by 1 if applicable. If their current hand exceeds the new limit, the excess cards are not immediately discarded — they hold the surplus until cards are spent, then do not refill past the new limit. This prevents a sudden hand-size collapse while still reflecting the political cost of losing a Herald.

Herald Power Level is 0, making them unlikely to swing combat outcomes. But a Fellowship that deliberately exposes a Herald to combat (e.g., moving a Herald into a contested node without splitting the group) is taking a real risk to their political capacity.

**Auto-Abstain Condition**

A player with 0 personal hand cards cannot COUNTER — they auto-abstain, as specified in the PRD. Under this system, a player reaches 0 hand cards by spending faster than they replenish. At hand limit 3 with 1 vote/round (1 card spent), they break even. A rescue that donates 4 cards depletes the hand immediately. The system makes the path to 0 cards legible and the recovery path (Production Phase replenishment + recruit a Herald) equally legible.

### Implications for PRD

- **F-002 (War Banners):** No changes — War Banners and Fate Cards are now explicitly distinct resource types.
- **F-003 (Characters):** Herald entry in the character table updated: add "Each Herald beyond the first increases your personal Fate Card hand limit by 1 (max 6)."
- **F-004 (Combat):** Clarify that combat Fate Card draws are temporary, not from personal hand.
- **F-006 (Voting Phase):** Clarify that Fate Cards spent on COUNTER come from personal hand.
- **F-007 (Broken Court / Rescue):** Clarify that Rescue donations come from personal hand.
- **New section:** Add F-002b or a standalone Hand Management section specifying starting hand, hand limit formula, and replenishment timing.

### Implications for User Manual

- Add a "Fate Cards" section (parallel to War Banners) explaining personal hand vs. combat draws.
- Update Fellowship character table: Herald entry adds "Each additional Herald raises your Fate Card hand limit by 1."
- Update the War Field section: clarify combat draws are separate from personal hand.
- Update the Voting Phase section: "Voting COUNTER costs 1 card from your personal hand."
- Add to Quick Reference: hand limit formula, starting hand size, replenishment timing.

---

## Fix 5 — ESCALATE Balance: Design Confirmation and Rationale

### Problem

The launch checklist specifies reducing ESCALATE cards from 2 to 1 and adding 1 MOVE card. The Quick Reference in the User Manual already reflects the corrected deck. The simulation re-run confirming the 18–22% Dark Lord win rate target has not been formally noted as completed.

This section formalizes the design rationale so it does not get revisited during revision and establishes the simulation requirement as a blocking checklist item.

### Design Decision

**The ESCALATE card count is 1. The MOVE card count is 6. This is final for v1.0.**

### Design Rationale

With 1 ESCALATE in a 20-card deck, the probability of drawing ESCALATE on any given round is 5%. In a 13-round average session, ESCALATE is expected to appear approximately 1.3 times before the deck first reshuffles. The reshuffle itself adds 1 to the Doom Toll — so the deck naturally creates one crisis event from reshuffling, plus a roughly 1-in-20 chance of an additional +2 spike.

This makes ESCALATE a rare shock — a moment that resets the table's risk calculation — rather than a background rhythm. The game's tension should come from the accumulation of SPAWN and MOVE and CLAIM outcomes, not from a reliably recurring +2 Toll. Two ESCALATE cards produced a 40% Dark Lord win rate because the Toll could compound faster than voting could reliably suppress it. One card keeps the Toll as a slow pressure rather than a runaway freight train.

The additional MOVE card (5→6) maintains Behavior Deck pressure without Toll acceleration. More Death Knight movement means more Forge Keep threats, more ASSAULT setups, more player-facing danger — without fast-tracking the shared loss condition. This preserves the 13-round average session length while reducing the Dark Lord win rate to target.

**Important note for the Fate Card system revision:** If the Fate Card hand management system (Fix 4) significantly changes average COUNTER voting success rates, the ESCALATE balance should be re-evaluated. A system in which players hold more Fate Cards more reliably may tilt the Doom Toll lower than intended. Re-run the simulation with the Herald-driven hand capacity system enabled before confirming final balance.

### Updated Behavior Deck (Final, v1.0)

| Card | Count | Notes |
|---|---|---|
| SPAWN | 6 | Unchanged |
| MOVE | 6 | +1 from original |
| CLAIM | 4 | Unchanged |
| ASSAULT | 3 | Unchanged |
| ESCALATE | 1 | Reduced from 2 |
| **Total** | **20** | |

### Implications for PRD

- **F-006 (Voting Phase):** Update Behavior Deck composition table.
- **Section 4 (Balance Parameters):** Mark "ESCALATE cards 2→1" fix as resolved. Add simulation re-run requirement (including Fate Card system) to launch checklist.
- **Launch Checklist:** Update checklist item: "Simulation re-run confirms Dark Lord win rate 18–22% with updated Behavior Deck AND Herald-driven Fate Card hand system."

### Implications for User Manual

- Quick Reference already correct. No changes needed.

---

## Fix 6 — Blood Pact Accusation: Mid-Game Resolution

### Problem

The PRD specifies that a unanimous accusation costs each accusing player 2 Fate Cards and that the Blood Pact status is revealed at game end or on accusation. It does not specify: what happens to the revealed traitor, whether they continue playing, what their win condition becomes, or what the mechanical consequences are for accusers in both the success and failure cases.

Without resolution, a successful mid-game accusation has no designed outcome. The game would need to improvise at a moment that should be one of the session's most dramatic beats.

### Design Decision

**A successfully accused Blood Pact player is not removed from the game.** Consistent with the design pillar that eliminated "dead time" (Broken Court replaces elimination), the revealed traitor continues playing but with converted win conditions and a mechanical penalty. Their betrayal is exposed; their political position is weakened; the game continues with all players working toward the same goal.

This decision is correct for four reasons:

1. **Consistency with "no dead time."** The game's most celebrated accessibility feature is that nobody watches from the sidelines. Removing a player for being caught as the traitor contradicts this at the worst possible moment — when the most engaged player has been most engaged.

2. **Redemption is a story.** An exposed traitor who now fights alongside former enemies creates a narrative arc unique to Blood Pact mode. This is the kind of moment Aaliyah would write a recap about.

3. **The accusation system needs failure to have teeth.** If a failed accusation only costs Fate Cards, it is mechanically cheap. The traitor must survive a successful accusation for the false accusation penalty to feel proportionate — losing 2 cards per accuser to accuse someone who is then unaffected (vs. losing 2 cards to accuse someone who is then converted and weakened) creates clear asymmetry.

4. **The reveal moment is the emotional peak.** Killing the traitor immediately ends the best story beat prematurely. Let the reveal breathe.

### Mechanic Specification

**Accusation Conditions (unchanged from PRD)**

Unanimous vote of all other active Arch-Regents (excluding the accused). Each accusing player spends 2 Fate Cards before the accusation resolves.

*Note on quorum:* In a 4-player game, 3 players must unanimously accuse. In a 3-player game, 2 players. In a 2-player game, accusation is not available (there is only one other player — unanimous vote of 1 is not meaningful social deduction). Blood Pact mode in 2-player games resolves at game end only.

---

**Successful Accusation (Blood Pact player correctly identified)**

Resolution sequence:

1. **Full-screen reveal.** The Blood Pact identity is exposed in a distinct full-screen moment — matching the end-of-game reveal treatment. This is the scene. Give it room.

2. **Win condition converts.** The revealed traitor's win condition becomes the Territory Victory condition, shared with all other players. They can now win by holding the Heartstone and the most Strongholds, like everyone else. Their Blood Pact win condition is void.

3. **Political penalty.** The revealed traitor loses 3 Fate Cards from their personal hand (to a minimum of 0 — no negative hand). They enter the next Voting Phase unable to COUNTER if their hand is at 0. They are politically weakened at the moment the table needs to rally.

4. **Doom Toll recedes by 1.** The traitor's influence is broken. The world breathes slightly easier. This is a small but meaningful reward for the accusers — the political cost of catching a traitor is offset by a Toll reprieve.

5. **Partial refund to accusers.** Each player who voted to accuse receives 1 Fate Card back (net cost: 1 card per accuser, not 2). This prevents the accusation from being punishing to the players who were correct. Correct suspicion should feel rewarding, not merely tolerated.

6. **Action log entry.** A persistent entry appears in the game log: "Blood Pact exposed — [Court name] converted to Territory Victory. Doom Toll receded by 1." Visible to all players.

The revealed traitor then continues playing as a normal competitive Arch-Regent. Their past action log — every abstention, every delayed rescue — is visible in the full log. The table will draw its own conclusions about what was sabotage and what was strategy. This is intentional.

---

**Failed Accusation (wrong player accused, or Blood Pact player accused before cards are spent)**

Resolution sequence:

1. **Accusation fails visually.** A brief UI moment shows the accusation collapsing — the accused player's screen shows a "Wrongly Accused" state; accusers see "Accusation Rejected."

2. **Accusers lose 2 Fate Cards each.** As specified. No refund.

3. **Accused player gains 1 Fate Card.** Political vindication. They were right to be trusted (or they successfully deceived the table — either way, the mechanic does not distinguish). This card represents their restored political standing.

4. **No Doom Toll change.**

5. **Accusation lockout (1 round).** The same accused player cannot be accused again for 1 full round. This prevents the table from immediately re-accusing after a failed attempt and burning through Fate Cards in a retry loop.

**Accusation Cooldown:** Regardless of success or failure, once an accusation has been attempted against any player, no new accusation can be initiated for 2 rounds. This pacing restriction prevents the game from devolving into a continuous accusation loop and forces the table to absorb the political consequences of each attempt.

---

**Blood Pact in Cooperative Mode**

Blood Pact is disabled in Cooperative mode (as specified in PRD). No changes.

**Blood Pact in Async/Online Play**

Accusation requires simultaneous vote submission — all non-accused active players must submit their accusation vote within the standard voting timer (60 seconds in online synchronous; within the same async turn window in async play). A failed timer means the accusation does not proceed. No partial accusations.

### Implications for PRD

- **F-011b (Blood Pact Mode):** Add full accusation resolution sequence for both success and failure cases.
- **F-011b:** Add 2-player mode note (accusation not available).
- **F-011b:** Add accusation cooldown rule (2 rounds after any accusation).
- **F-015 (Atmosphere):** Successful mid-game accusation uses the same full-screen reveal treatment as end-of-game reveal. Specify this explicitly — the production team should not treat it as a sidebar event.
- **F-017 (Post-Game Summary):** If accusation occurred and succeeded mid-game, the post-game summary notes the accusation round and shows the traitor's action log from that round forward (separated from pre-accusation log to show how their behavior changed after conversion).

### Implications for User Manual

- Blood Pact section: Add accusation resolution (both outcomes) as a clear two-case block.
- Add note on 2-player restriction.
- Add accusation cooldown rule.
- The dramatic weight of a successful accusation should be communicated narratively, not just procedurally: "When the accusation lands, the game stops. The truth is known. The traitor remains — but they are changed."

---

## Appendix A — VISION.md Discrepancy: "Elimination Victory"

The VISION.md contains a victory condition not present in the PRD:

> **Elimination Victory:** Last Arch-Regent not in Broken Court state wins.

This condition contradicts the design pillar "No Dead Time" and the PRD's explicit statement that Broken Court state replaces elimination. If an Arch-Regent can win by being the last one standing outside Broken Court, then Broken Court functions as a soft elimination — exactly what the design is committed to preventing.

**Recommendation:** Remove "Elimination Victory" from VISION.md. It appears to be a residual design from an earlier iteration before the Broken Court rescue mechanic was fully specified. The three end states defined in the PRD (Territory Victory, Shadowking Victory, All Courts Broken Draw) are complete and correct.

**The PRD's "All Courts Broken" draw condition** is the appropriate replacement: if all Arch-Regents simultaneously enter Broken Court state, the game ends as a draw — no player wins. This is structurally different from "last player standing wins" because the Doom Toll advanced when each player fell, meaning the table collectively failed. It is a shared loss, not a last-man-out victory.

No new mechanics required. Only a VISION.md edit.

---

## Summary: Changes by Document

### PRD Changes Required

| Section | Change |
|---|---|
| F-001 | Hall of Neutrality description updated — Heartstone starts at Dark Fortress |
| F-003 | Herald entry: add Fate Card hand limit bonus |
| F-004 | Clarify combat draws are separate from personal hand |
| F-006 | Update Behavior Deck composition (1 ESCALATE, 6 MOVE); clarify COUNTER costs from personal hand |
| F-007 | Clarify Rescue donations come from personal hand |
| F-008 | Note: Death Knights at Dark Fortress are primary obstacle to Heartstone access |
| F-010 | Rewrite Territory Victory trigger: end-of-round check, Heartstone held + most Strongholds |
| F-011b | Full accusation resolution for success and failure; 2-player restriction; accusation cooldown |
| F-015 | Mid-game accusation uses same full-screen treatment as end-of-game reveal |
| F-016 | Add Heartstone location and turn order tracker to always-visible UI |
| F-017 | Mid-game accusation noted in post-game summary |
| New section | Round Structure: document fixed turn order assignment and clockwise sequence |
| New section | Fate Card Hand Management: starting hand, hand limit formula, replenishment timing |
| Balance Parameters | Confirm ESCALATE fix; add simulation re-run requirement with Fate Card system enabled |
| Launch Checklist | Update simulation re-run item; add Fate Card system verification |

### User Manual Changes Required

| Section | Change |
|---|---|
| Setup | Heartstone token at Dark Fortress; turn order random draw |
| Fate Cards | New standalone section: personal hand vs. combat draws, hand limit, replenishment |
| Fellowship table | Herald: add hand limit bonus |
| Action Phase | Add Reclaim action; add turn order statement |
| War Field | Clarify combat draws are separate from personal hand |
| Voting Phase | Clarify COUNTER costs from personal hand |
| Blood Pact section | Add accusation resolution (both outcomes), 2-player note, cooldown |
| Victory Conditions | Rewrite Territory Victory trigger |
| Quick Reference | Add hand limit formula and starting hand |

### VISION.md Changes Required

| Section | Change |
|---|---|
| Victory Conditions | Remove "Elimination Victory" — contradicts design pillars and PRD |

---

*Iron Throne of Ashes · Design Revision 1*
*Prepared for PRD v1.1 and User Manual v1.1*
*Next step: PRD author integrates these specifications into updated feature sections*
