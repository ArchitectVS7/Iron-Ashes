# Design v2 — Focus Group, Round 2 (Post-Implementation Review)

> Status: Stage-5 design review (reconvened panel on the playable, balance-simulated build)
> Date: 2026-06-22
> Method: The same five isolated-context panelists from Round 1 (board-game designer,
> video-game designer, D&D DM, MTG judge, Warhammer 40K referee), no cross-talk. Each was
> briefed on the current loop + the locked 5c balance data (4200-game deterministic sim) and
> asked three questions: (Q1) where is the fun, and where is it leaking; (Q2) why do players
> never engage the dark, and how to fix it; (Q3) the per-count win-rate fork (A accept / B change).
> Companion to `DESIGN-V2-FOCUS-GROUP.md` (Round 1, the original synthesis).

---

## 0. The one-line finding

**The game is balanced at the macro level and hollow at the micro level.** Pooled Shadowking win
20.2% (on target), even seat share, free-riding punished — but **two of the three signature pillars
do not fire in play**: the Grudge (DK-kills **0.00**/game) and rescue-with-strings (**0.06**/game vs a
2–4 target). What ships is a clean territory race with a telegraph minigame bolted on. All five
panelists, independently, reached this same verdict.

## 1. What the panel agreed on — unprompted (5/5 or 4/5)

| Consensus | Who | The point |
|---|---|---|
| **The game is "solitaire-beside-others."** ~75–78% of games end as a math problem (territory 49.6% + gambit 27.8%), not a confrontation. The interaction layer is dormant. | All 5 | "A two-line game wearing a five-system costume." (board) "Parallel solitaire under a shared timer." |
| **The villain is weather, not a character** — because the player's only verb toward it is *endure*. You can't have a relationship with a hailstorm. | All 5 | The telegraph gives it a voice; the dead Grudge means it has no memory you can provoke. |
| **The dead Grudge is an INVERTED INCENTIVE, not a tuning miss.** Killing a DK is *pure cost*: +3 grudge → you become the villain's next named target → zero territory/resource/win payoff. A rational player correctly refuses. | All 5 | "You built a dare with no prize." (DM) "A punishment for engagement, called a pillar." (judge) |
| **The fix is to pay heroism in the game's WIN CURRENCY** (territory / tempo / intel), not in flavor or a soft favor. The sign must flip. | All 5 | Same disease afflicts rescue (0.06/game) — a deal paid in soft favors in a game decided by hard territory *now*. |
| **The sim CANNOT measure the fix until the AI gets a verb to hunt.** There is no "march toward a DK" action — bots only strike one already standing on them. Add the action or kills stay 0.00 no matter how good the rules are. | All 5 | Cheapest, highest-leverage change on the board. |
| **The Crown's Gambit over-fire (26.7% vs 10–20%) is a SYMPTOM of the dead middle**, not a standalone bug. With the dramatic/political paths dead, the bold spike is the only excitement left. Fix the dead pillars *first*; the gambit likely self-corrects. | 4/5 (board, video, judge, 40K) | Do NOT pre-emptively nerf the gambit in 5d/5e. |

## 2. The Q2 fix — a composite all five converged on

Each panelist proposed, in their own words, the **same three-part mechanic**. Naming differs; the shape is identical.

1. **Add the verb — a "Hunt" / March-to-Intercept action.** Let a player (and the AI archetypes)
   path *toward* a Death Knight, not only swing if one wanders onto them. Without this the choice
   literally cannot exist. (Unanimous, and the prerequisite for everything else.)

2. **Pay the kill in win-currency.** Killing a DK must grant something that moves the
   territory/clock math *this round*. Proposed payoffs (pick/combine):
   - **Claim / un-ash / ward the node** the DK died on — first right to claim it free ("spoils of
     the breach", 40K; "Severance Bounty" + ash-immunity, board).
   - **Steal the next telegraph** — learn the dark's next target before the Pledge (intel as
     treasure, board/video).
   - **A one-round leader-grade Pledge discount** — the Crown's defensive break without the Crown's
     target (judge).
   - **Pushback on the whole spoke segment** behind the DK — reclaim the blight corridor it carved (40K).

3. **Make the Grudge a STEERABLE WEAPON, not a curse — the Round-1 soul, finally firing.**
   Let the player *aim* the dark at a rival: "Paint the Crown" (video) / "Redirect the Hunt" (board)
   / shove a rival up the **Vendetta Slate** (DM). The face-up Vendetta Slate (DM) renders the
   villain's *memory* as a board object: grudges persist and escalate across the three acts, so a
   name held at the top draws a Reckoning-tier vendetta strike. This is "wound the dark to steer it
   at YOU" made literally playable — and it keeps the villain telegraphed and fair (the Slate is
   face-up; the re-aim is announced).

### Two sharp refinements worth their own line

- **Asymmetric-by-standing reward (MTG judge — the most important structural idea).** The Grudge
  *Mark* (becoming the next target) should fire **only if you are 1st or 2nd in territory.** Kill a
  DK while 3rd/4th and you take the payoff with **no Mark.** This makes dark-hunting a **catch-up
  lever for the trailing half** and a **trap for the leader** — which (a) preserves "leading is
  dangerous," (b) prevents it becoming a new dominant line, and (c) injects agency exactly where the
  game is currently flattest. *This is also a candidate remedy for the 4p gap (see §3).*

- **Make the DK matter on the board (40K referee).** Today DKs sit on the outer seams, march only at
  the named target, and `DK_PER_PLAYER = 0` (the smoking gun for the dead-lever finding). Give them a
  standing order to **march toward the Keystone autonomously** (a deterministic, telegraphed second
  front), **block claims / suppress income** on the node they occupy (ignoring them now costs you in
  the present), and **scale their count with player count.** This converts "ignore for free" into
  "ignoring costs you," creates *threat-flow* through chokepoints (which revives the dead
  "I-hold-the-gate-you-owe-me-a-pledge" leverage and, with it, the rescue politics), and — because
  the threat now scales with the table — **adds dark pressure precisely at 4p.**

## 3. The Q3 fork — the panel reframes it

Raw vote: **3 lean A** (lock the gradient: video, DM, judge) · **2 lean B** (change a mechanic: board,
40K). But the split is shallower than it looks — **the real consensus is "decide this AFTER the Q2 fix,
because the fix changes the inputs to this very decision."**

- **The 4p gap (SK win 7.9%) is a symptom of DEAD STAKES, not a balance defect.** At 4p the dark is
  near-irrelevant, so 4p collapses into the solved territory race. The proven reason it's
  unflattenable by numbers — pledge supply scales with player count while the strike threshold
  doesn't ("more hands bail the same flood") — is exactly what the §2 fixes attack *without* touching
  the pledge identity that explodes 2p:
  - The **asymmetric grudge reward** lifts trailing seats — structurally what 4p needs.
  - **`DK_PER_PLAYER` scaling** adds dark pressure that grows *with* the table.
- **B (threshold/pledge surgery) is disqualified in its blunt form** (judge): any super-linear
  threshold tuned to lift 4p drags 2p past 40% and flips the dominance guard (PvE boss as the modal
  winner — a worse failure than an uneven gradient). The *surgical* version that survives is the board
  designer's **diminishing marginal pledge** (each additional ally's pledged cards count at a
  decaying rate), held in reserve as a fallback if §2 doesn't close the gap.
- **A (accept) is honest only if you OWN it** — ship the gradient as a named identity ladder:
  **2p "Duel" (the dark is a real threat) → 3p "Triumvirate" → 4p "The Carve-up" (rivals are the
  danger, the dark is weather you weaponize)**, not a silent lock laundered as "intended difficulty."

**Synthesized recommendation: defer A-vs-B.** Implement §2 first, re-measure, then decide — A (lock +
name the tiers) if the gap narrows, surgical-B (marginal-pledge decay) only if it doesn't.

## 4. The other dormant pillar — rescue (this is Stage 5d)

Three panelists (board, DM, judge) independently noted rescue-with-strings (0.06/game) is the **same
disease as the Grudge**: it pays the rescuer in a soft future favor in a game decided by hard present
territory, so rational players skip it. **The fix is the same template:** a rescue deal must hand the
rescuer something that moves the win math *this round* (intel, tempo, a node, a Trophy-grade favor) —
fold it into the same win-currency economy rather than tuning RESCUE_COST in isolation. *This is direct
design input for Stage 5d, which is next.*

## 5. Other flags raised

- **The Pledge needs faces (DM).** Proportional partial-block resolves as silent arithmetic. Surface
  *who held back*: simultaneous reveal, and let an under-pledger gain a private benefit but float up
  the Vendetta Slate ("the dark notices who didn't fight"). Turns the Pledge into a Devil's Bargain
  every round and ties Pledge + Grudge + villain-memory into one engine.
- **Raiding is structurally negative-sum (judge, 40K).** Aggressor wins 9.4% because lateral violence
  in a radial-threat game is mutual disarmament that helps the dark — the bystander seat profits. Raids
  should matter when controlling a *specific* node matters; the §2 DK-corridor mechanic is what makes
  specific nodes worth fighting a rival over.
- **The latent zone-of-control rule already exists** (a DK co-located with your Warlord forces a STRIKE
  before you can march) — it just never bites because DKs sit where nobody is. The §2 "DKs march inward"
  change activates dormant geography (the ashed-but-traversable lanes become the spear's scar).

## 6. Bottom line for the lead designer

The Pledge is a keeper and the bones are good. But **three of five interaction systems are dead because
their rewards are paid in the wrong currency, and the signature pillar is the deadest of all.** The path
forward the panel converged on, in order:

1. **Add the Hunt verb** (engine + AI action space) — without it nothing else is measurable.
2. **Pay DK-kills in win-currency** + **asymmetric-by-standing Grudge Mark** (trailing seats rewarded,
   leaders taxed) + **steerable Grudge / Vendetta Slate**.
3. **Make DKs march inward, block/convert nodes, and scale with player count** (`DK_PER_PLAYER > 0`).
4. **Re-run the 4200-game sim.** Expect DK-kills > 0, rescue/grudge politics alive, gambit drifting
   toward band, and the 4p gap narrowing.
5. **Then** settle Q3: lock + name the tiers (A) if the gap closed; surgical marginal-pledge decay (B)
   if not.
6. Apply the **same win-currency template to rescue** in Stage 5d.

This is a **mechanic patch, not a tuning pass** — it reopens a design seam rather than turning a knob, so
it is a lead-designer call (see ROADMAP).
