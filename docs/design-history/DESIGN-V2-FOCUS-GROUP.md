# Design v2 — Focus Group Synthesis & Proposed Core

> Status: Stage 1 deliverable (game idea, turn structure, common-enemy system)
> Date: 2026-06-21
> Method: Five isolated-context panelists, no cross-talk — board-game designer, video-game
> designer, D&D DM, MTG judge, Warhammer 40K referee. Their independent verdicts are summarized,
> then synthesized into one proposed core.
> Inspiration honored: the 1983 board game *Shadowlord* (brilliant ambition, poor playability).

---

## 1. The panel agreed — unprompted — on six things

Despite different lenses and no shared context, all five (or 4/5) converged:

| Consensus | Who said it | Why it matters |
|---|---|---|
| **Kill unanimity voting.** Replace the "everyone must pay or it fails" gate with a **threshold / partial-block pledge.** | All 5 | Unanimity = a single defector vetoes the table every round = kingmaking + feel-bad. The judge: "the most fragile object in multiplayer design." |
| **The villain must be a CHARACTER, not a deck.** Telegraph its next move a turn early, target the leader **by name**, give it moods/acts, a voice, and a memory (it holds grudges). | All 5 | "A threat with no agenda is weather, not a villain." A fixed deck gets solved by hour two and the co-op pressure evaporates. |
| **Leading must be DANGEROUS.** The villain hunts the leader; the leader pays a defense surcharge. The lead is a fever passed around the table. | Board, Video, 40K, Judge | Built-in rubber band against the runaway leader, and it makes the "tax the frontrunner" fiction true at the rules level. |
| **Escalation changes the RULES/board, not just +1 a number.** Named tiers/acts that unlock new villain behaviors and visibly tighten the noose. | DM, 40K, Board, Video | The auto-balancer deleting the escalation cards was, per the board designer, "the design's lobotomy." |
| **Doom must be PHYSICAL and tied to the board** — ideally the doom track and the map are the *same object* (territory turning to ash). | DM, Video, 40K | "A number incrementing" never makes a stomach drop. Make refusal cost something you can point at on the map. |
| **No-elimination needs TEETH.** Broken ≠ a voting hostage. It's an active comeback state with a recovery cap; rescue is a political deal with strings; a beaten lord's lost lands feed the enemy. | Judge, 40K, DM, Board | The current Broken Court is a kingmaker engine — "a hostage with a button," the worst NPE in the genre. |

And on **scope**, 4/5 independently said: **shorten the session (30–45 min), shrink the board (~15–18 nodes), defer the hidden-traitor mode, and make co-op a later variant** — ship one tight competitive core first.

## 2. Where they diverged (the real forks)

- **Pledge visibility.** Video designer & DM want an **open, live, ticking staredown** ("you watch the leader sweat and bump to 4"). The judge wants a **sealed buffer + atomic reveal** for determinism and for traitor-mode bluffing. → Reconcilable: open live pledging in competitive/co-op for drama; sealed-then-revealed in traitor mode; resolution always ordered and seed-reproducible.
- **Variance/combat.** Judge: no dice (digital → save-scummed or solved); put uncertainty in *opponents' hidden choices*. 40K: variance is great drama *when the player chose the gamble* (the "Last Stand"). → Reconcilable: no random target selection ever; uncertainty lives in opponents' pledges and in opt-in gambles you choose to take.
- **Traitor.** DM wants it folded into the villain offering one player a **Devil's Bargain** (organic traitor, no hidden role card). Judge designed a full hidden-role audit system. Others: defer. → A genuine scope decision (see §5).

## 3. The proposed core — "Save the world, or take it."

A 30–45 minute game for 2–4 rival warlords carving up a dying kingdom while a living darkness eats
the map and hunts whoever's winning. The whole game is one recurring, terrible choice: **every card
you spend to hold back the dark is a card you didn't spend seizing the throne.**

### Three signature pillars (each is a panel idea, load-bearing)

1. **The Pledge** *(replaces voting — fixes the #1 flaw)*
   The villain telegraphs its next strike, aimed at a named target (almost always the leader). Players
   commit cards toward a **threshold**; partial pledges give **proportional** blocking — so there's no
   single-defector veto and no kingmaker, but the leader benefits most from a full block and the pack is
   incentivized to make them pay for it. The leader's pledged cards **count for less** (the dark hunts the
   strong), which makes "tax the frontrunner" a self-balancing gradient instead of a brittle binary.

2. **The Crown is a target painted on your back** *(fuses the rival-game and the doom-game)*
   Whoever leads holds the Crown. It is how you win (most territory), **and** it makes you the villain's
   priority target, **and** it raises your defense cost. Every point of progress makes you a bigger
   target and a worse defender — so players literally **negotiate over who has to be in the lead.**

3. **The dark burns the map** *(doom you can point at)*
   The Shadowking's Blight is a spreading front that converts nodes to **ash — permanently, visibly.**
   The doom track and the board are the same object; the map shrinks toward darkness. A beaten lord's
   lost lands turn to ash and **strengthen the enemy**, so finishing a rival hurts the whole table — the
   pressure that makes rescue (with strings) a real choice. When the dark consumes the last keystone, the
   world ends and everyone loses.

### Turn structure (one round, ~90–120 sec)

1. **THREAT (telegraph).** The Shadowking announces its next move in the first person and shows its
   target on the map (a red march-line). It always escalates if the table blocked it too easily last
   round — successful cooperation *angers* it (a patience ratchet), so blocking is correct but feeds the
   climb. This kills the "block it every round forever" stalemate.
2. **THE PLEDGE (the heart).** Players commit cards toward the threat's threshold (open live in
   competitive/co-op; sealed in traitor). Partial = proportional block. Leader's cards discounted. Reveal
   and resolve in fixed seat order against pre-reveal state (deterministic). Whatever isn't blocked, the
   dark does — ash spreads, the named target is struck.
3. **ACTION (fast, legible).** A single active-player pointer rotates; each player takes ~2 actions —
   march, claim, raid a rival, **rescue (with strings)**, or declare a **Last Stand** when assaulted
   (gamble cards from your hand for a heroic reversal — but those are the cards you needed for the
   Pledge). Every click talks back; illegal moves explain themselves; reachable/claimable are pre-lit.
4. **DAWN (income + escalation).** Deterministic income; Broken recovery checks (with a cap — no
   permanent zombies); escalation tiers, when crossed, unlock new villain behaviors and change the
   board/audio/voice (three acts: **The Whisper → The March → The Reckoning**).

### The common-enemy system (how the threat stays tense AND fair)

- **Reactive targeting, deterministic policy.** The villain follows transparent, telegraphed rules
  (hunt the Crown; spread the Blight toward the most-developed node) — legible enough to play around,
  reactive enough to never be "solved." Determinism is preserved for balance/sim; the *targeting* keys
  off live game state so it can't be memorized into irrelevance.
- **A moving front + a spear-tip.** Blight = the slow inevitable tide (positional, plannable). Death
  Knights = fast deep raids (reactive, scary). Chokepoints between the Ashlands and the rich center
  become alliance leverage ("I hold the gate, you owe me a pledge").
- **Escalation as a menu, not a dial.** Each tier unlocks behavior (Knights move farther; Blight spreads
  two nodes; a final-act "Reaping" assaults every exposed border stronghold) and changes the villain's
  voice and the board's mood.
- **The grudge.** Wound the Shadowking and it hunts *you* next — so players can manipulate the villain at
  each other ("pay up, or I steer it toward your lands"). The whole game in one sentence.

### No-elimination, with teeth
Broken = **active comeback engine**: reduced actions but boosted income, can still raid and make Last
Stands. Auto-recovers after N rounds at minimum strength (no permanent kingmaker-hostage). Rescue is a
rival spending resources to un-Break you **in exchange for a binding one-round debt** (a vote, a pledge,
an attack withheld) — never charity.

## 4. Cut list for v1.0 (panel consensus)
- Unanimity voting; silent binary COUNTER/ABSTAIN.
- Penalty Cards as a separate opaque economy (fold "getting beaten" into one visible Broken meter).
- The 60–90 min target → ship 30–45 min.
- 28 nodes → ~15–18, graspable at a glance.
- The Social-Pressure essay screen (teach in-context, when the leader first gets targeted).
- Most of the Fellowship role-economy math (start with Leader + a couple of pieces; add roles once the
  loop is proven fun).
- Async & mobile (this is now a real-time staredown game).
- Hidden-traitor and full co-op as launch pillars — see §5.

## 5. Open decisions for the lead designer (gate to Stage 2)
Before translating to a textual algorithm, three forks need a human call (the rest is adopted from panel
consensus above):
1. **Doom model** — doom *is* the map (ash front) vs. a separate doom track over a threatened board.
2. **Pledge feel** — open live staredown vs. sealed-then-revealed commit.
3. **Traitor** — defer to a later version vs. fold in as the villain's "Devil's Bargain" vs. keep a full
   hidden-role mode at launch.

The panelists remain available (their context is preserved) for a second round — e.g. to debate these
three forks directly, or to stress-test the synthesized core.
