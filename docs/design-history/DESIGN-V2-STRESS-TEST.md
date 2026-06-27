# Design v2 — Final Stress-Test Synthesis & Pre-Code Punch List

> Status: Stage 2.5 — adversarial review of the complete settled spec before code.
> Date: 2026-06-21
> Method: all five panelists (board designer, video designer, MTG judge, 40K ref, DM) independently
> read the full `DESIGN-V2-ALGORITHM.md` with a mandate to break it.
> **Unanimous verdict: FIX-THEN-CODE.** The locked pillars are sound; ~5 convergent holes and a set of
> determinism/legibility gaps must be patched first, or the sim deadlocks / a dominant line emerges /
> the center of the game is hollow by round 12.

---

## P0 — Critical, convergent (flagged by 2+ panelists; must fix before code)

### P0-1. The Pledge free-rider collapse — the heart of the game may be a non-decision
*Flagged by: Board (#1), Judge (A3/D1), 40K (#4).*
The strike is aimed at the leader, the leader's cards are discounted, partial block is proportional, and
cards are spent regardless of outcome. So the rational line for every non-leader is **pledge ≈ 0 and let
the leader (or someone else) cross the threshold** — a classic chicken/last-pledger game. In sealed
commit it's undetectable. If the whole table reasons this way, blocks systematically under-fund, the
Pledge becomes a bystander phase for 3 of 4 players, and the Shadowking win-rate drifts above target.
**This is the #1 thing to resolve on paper and model in sim before any UI.**
**Candidate fixes (pick one to prototype, ML-validate):**
- (a) **Per-contributor benefit:** the averted fraction protects *your own* lands first / grants pledgers
  a small persistent "Favor" (grudge-reduction, a future Crown-discount immunity). Non-pledgers gain none.
- (b) **Shared consequence:** an un-averted strike doesn't only hit the Crown — the steered spoke's Blight
  advance threatens a Forge/Approach that *neighbors* rely on, so free-riding has spillover.
- (c) **Non-pledger penalty / pledge floor:** a card-rich player who pledges far below capacity takes a
  visible standing hit.
Recommend prototyping (a)+(b) together. **Flag as "not yet solved" — this is the primary balance risk.**

### P0-2. The map is a pure tree → quadrant-turtle solitaire
*Flagged by: 40K (#1, H1 — "the one thing"), Board (turtle/kingmaking).*
As drawn, the 17-node graph has **one path per quadrant** and no lateral links except the inner Approach
ring. No flanking; rivals literally cannot reach each other's economy; alliances have nothing to bargain
over. The game collapses into four parallel solitaire races with a Pledge minigame bolted on.
**Fixes (structural, not tuning):**
- Add a **mid-belt lateral ring**: each Forge links to its two neighbor Forges (4 edges, 0 new nodes).
  Makes Forges rival-contested and gives the front a way to spill sideways.
- Add **Approach zone-of-control**: an enemy entering a held Approach must STRIKE/RAID to pass (no free
  march-through), and holding an Approach grants that quadrant a Pledge-cost reduction (a gate vs. the
  dark). Turns chokepoints from transit tiles into objectives.

### P0-3. The Gambit is over-taxed → "1-in-never," and its integration is undefined
*Flagged by: 40K (#3, H4), Board (#5), Judge (C1, A6, A7), DM (#4).*
Four simultaneous costs (forces committed + max surcharge + adjacent-strike multiplier + 3 rivals on one
node + survive two Dawns) make the EV deeply negative — nobody presses it, so its *threat* never shapes
play either. And the integration is unspecified: §6 says the strike targets the Gambit-holder, but §5.6's
single-intent policy says `highestGrudge ?? crownHolder`, with no precedence and no "strike adjacent"
effect in the menu.
**Fixes:**
- **De-tax to two costs** (keep max surcharge + committed forces; drop the adjacent-strike multiplier OR
  give a held throne a small pushback aura). Resolve the win on the **single named-Dawn**, not two.
- **Lock ashed Approaches to "traversable at extra cost," not impassable** (§5.1 [TUNABLE] → decide now):
  impassable late-game makes a Gambit-holder unreachable → unbreakable (inverts the guardrail).
- **Define Gambit↔policy precedence:** Gambit-claimant-target overrides grudge overrides Crown; specify
  the concrete adjacent-strike effect and where `GAMBIT_ADJACENT_STRIKE_MULT` applies.
- **Gambit on the final round:** resolve at that round's Dawn *before* the territory check (don't orphan
  it at the cap).
- **Gambit-in-Blood-Pact:** rivals "withhold pledges to feed the dark at you" accelerates global doom →
  in traitor mode that *helps the traitor win*. Define the interaction explicitly.

### P0-4. The Crown handoff and steered-front re-aim are invisible — players won't know why the fire came for them
*Flagged by: Video (#2, the "confuse"), Board (grudge kingmaking), Judge (G2), DM (villain check).*
The entire "leading is dangerous, negotiate over the Crown" fiction breaks if the Crown changing hands
(recomputed silently from production math at Dawn) and the front re-aiming aren't loud, named events.
**Fixes:**
- **Crown handoff = a named, full-screen beat** ("[Name] now leads. The Shadowking turns its gaze."),
  same weight class as an Act crossing.
- **Two-line telegraph at THREAT:** the strike target AND the steer ("I turn my hunger toward [quadrant]")
  — show the cost of leading *before* players commit actions.
- **Public grudge meters + public current-round pledge *tiers*** (high/med/low/none) — the steering lever
  and the trust signals must be legible (even in Blood Pact, hide only exact amounts, not tiers).

### P0-5. The villain is a once-per-round announcer, not an in-round presence
*Flagged by: DM (#2, villain check), Video (grudge invisible).*
The spec has the bones (telegraph, grudge memory, three acts) but the SK speaks once at THREAT then goes
silent through PLEDGE/ACTION/DAWN. A character that monologues once and never reacts is a recording.
**Fix — an in-round voice layer keyed off the existing `actionLog`/`grudge[]` (zero rules change):**
barks on grudge-earned ("So. *You* draw the blade. Noted."), on a strike landing through a thin pledge
("Your friends sold you cheap."), on a leader toppled, on PUSHBACK (register the wound); and escalation
must **cite the block that caused it** ("You held the line. It will not happen twice."). **Spec it now or
it gets cut as "polish" in Stage 3 — which is exactly how the villain dies.**

---

## P1 — Important (determinism pins + single-panelist structural)

**Determinism gaps (Judge G1–G6, Video #5) — pin all in §7:**
- Grudge ties → seat-order tiebreak (lowest index).
- Hand-refill draw order → single shared seeded deck, drawn in seat order.
- **AI pledge AND AI accusation must be pure `f(state, seed)`** — currently only the Shadowking policy is
  pinned; full reproducibility (§7.6) needs AI player decisions deterministic too.
- Mid-ACTION loss order → `doom_complete` checked before `all_broken`.
- Crown recompute timing → THREAT reads the telegraph-time Crown; recompute only after Dawn escalation for
  *next* round's targeting; steering never uses a not-yet-recomputed Crown.
- Escalation → clamp to **at most one Act advance per Dawn**; never retroactively affects the current
  round's already-resolved strike; define coalescing when patience-full and Blight-threshold cross together.

**Structural / rules (single-panelist but clear):**
- **Rescue debt (Judge C4):** references "vote support" which no longer exists. Redefine the obligation set
  (forced minimum pledge / withheld attack / claim support); enforce breach on **public actions only**
  (sealed pledges can't police a hidden amount); pin the penalty trigger.
- **Add `pledgeHistory[]` to the §2 state model** (Board, Judge C5) — Suspicion Log + Audit need retained
  per-player pledge tiers even though reveal shows only aggregate in Blood Pact.
- **Grudge needs decay + a cap** (Board, 40K H2): otherwise the most heroic player (most DK-kills/Forge-
  reclaims) becomes the permanent target — punishing the only behavior that pushes the front back. And
  pushback should not be strictly self-punishing: heroic-grudge decays faster than SK-wounding grudge, or
  off-spoke contribution is required.
- **Last Stand is one-sided and final** (Judge A4) — no attacker counter-commit (else infinite re-raise).
  **Tie vs. the Shadowking** (STRIKE) should not be coin-flip-negative (Judge A5): consider tie→no-result
  (cards returned) for STRIKE, keep tie→defender for rival RAID.
- **Broken self-break exploit** (40K H6): boosted income + auto-recovery + full Pledge rights can make a
  player *better off Broken*, dodging the Crown. Fix: Broken forfeits Crown-eligibility; decay the income
  subsidy each consecutive Broken round (a comeback ramp, not a home).
- **Pushback vs. anti-turtle** (Judge C3, D2): reclaiming a Forge every round can cancel the per-Dawn
  advance without pledging — a second path to the turtle the anti-stall clause was meant to kill. Define
  the net-front arithmetic as one ordered formula; confirm it can't reach a stable zero; the anti-turtle
  pressure must cover the pushback path too.
- **Capacity transparency** (Board, Judge): make each player's *max possible pledge* public before the
  sealed commit, so a card-rich player's 0-pledge is visibly a choice, not hidden behind fake poverty.

---

## P2 — Pacing / legibility (fold into UI + tuning)

- **Pledge reveal needs a threshold *beat*, not a smooth float** (Video): render `(1-ratio)` as a gate
  taking damage with a snap at `FULL_BLOCK_THRESHOLD`; show per-player cards flying in; villain narrates.
- **Show the Crown discount at commit time** (Video): "4 cards → counts as 2.8."
- **Per-node `blightLevel` pip ladder** as a first-class UI primitive (Video) — doom-as-map needs
  glanceable "how close to ash" per node; PUSHBACK animates pips draining.
- **Gambit alarm banner + countdown** on every screen for the contested round (Video).
- **One `SealedCommit<T>` primitive** for pledge/combat/audit, routed through the determinism contract
  (Video) — avoids three divergent reveal orderings.
- **Whisper-act onboarding** (Video): first 1–2 rounds at fixed low `C` with a coach explaining effective
  contribution + the Crown surcharge the first time the human leads. Spec it; don't defer.
- **Analysis-paralysis guardrail** (Board #3, Video #1): 3–4 nested sealed commits/round over one card
  pool threatens the 45-min target; consider a commit timer / budget.
- **Make the Territory (cap) ending dramatic** (DM #4): 5–7 of 8 games end on the round cap, not a Gambit.
  Frame a named "Last Dawn" with the front's hardest push (tie to Reckoning), so the tally lands *after* a
  desperate defense, not instead of one.
- **Production base may be too thin** (40K H5): 8 production nodes → the Crown can thrash on a single
  claim. Watch in sim; if it thrashes, add node `developmentLevel` so the lead shifts on accumulated
  investment, not one claim.
- **Give the Broken player an active, scary verb** (DM #5) — their signature threat (lost lands feed the
  front) is passive; a comeback engine needs something they *initiate*.

---

## The one decision that reopens a locked choice — PLEDGE VISIBILITY (for the lead designer)

*Flagged hard by the DM (#1, "the one change") and Video (#3).* You chose **"Sealed, then revealed"** for
the Pledge. Two panelists argue this **mutes the theatrical core in the 7-of-8 games that aren't traitor
mode** — the begging, the held breath, the leader sweating their pledge up to cover a defector. Their key
technical point: **determinism does NOT require hiding the commit.** The contract (§7.2) only needs (a) no
pledge referencing another's pledge and (b) ordered resolution against pre-reveal state — both survive an
*open, live, ticking window that freezes-and-resolves at close*. Their proposed reconciliation (which is
the panel's *original* Stage-1 synthesis): **open live pledging in Layer A (competitive/co-op) for drama;
true-sealed only in `blood_pact`, where hiding is the point.** This honors "sealed pledges" where it earns
its keep (deduction) and lets the drama breathe everywhere else. **This is the only finding that touches a
decision you personally made — so it's yours to confirm or revisit.**
