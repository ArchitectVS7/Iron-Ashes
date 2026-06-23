# Design v2 — Textual Algorithm (Stage 2)

> Status: Stage 2 deliverable — the mechanical spec the code (Stage 3) is built from.
> **Hardened by the Stage-2.5 stress-test** (`docs/DESIGN-V2-STRESS-TEST.md`): P0/P1 fixes folded in
> below; P2 legibility items live in that punch list for Stage-3 UI work.
> Date: 2026-06-21
> Builds on: `docs/DESIGN-V2-FOCUS-GROUP.md` (Stage 1).
> All balance numbers are **[TUNABLE]** placeholders — Stage 5 (ML) sets the final values.
> Working title: **Iron Throne of Ashes** — *"Save the world, or take it."*

---

## 0. Locked design decisions

| Decision | Choice |
|---|---|
| Doom model | **Doom IS the map** — a spreading Blight burns nodes to permanent ash; the board shrinks. |
| The Pledge (replaces voting) | **Mode-dependent visibility** — *open live window* in Layer A (competitive/co-op); *true-sealed* in Blood Pact. Both freeze and resolve deterministically at window close (§4.2). |
| Traitor | **Full hidden-role mode at launch** — but built as a **separable mode flag** over a self-contained competitive core. |
| Win condition (panel R2) | **Contested Throne + Gambit** — territory-lead baseline at a fixed round cap, PLUS a telegraphed sudden-win by holding the Keystone a full round as the dark's named target (§6). |
| Map (panel R2) | **The Closing Ring with a steered front** — concentric, symmetric, 17 nodes; the hot front rotates toward the leader (§2). |
| Adopted from panel consensus | Villain-as-character (telegraphed, hunts the Crown, grudge, 3 acts); leading is dangerous; escalation changes rules; Broken-with-teeth + recovery cap; ~16-node map; 30–45 min; persistent card hand; in-context onboarding. |

**Architectural rule for Stage 3:** the engine ships two layers. **Layer A (Core)** = everything in §§1–9 except §10. **Layer B (Blood Pact)** = §10 only, gated behind `mode === 'blood_pact'`. Layer A must be fully playable, testable, and balanceable with Layer B absent.

---

## 1. Game overview

2–4 rival Warlords carve up a dying kingdom while the **Shadowking** — an autonomous, telegraphed AI
threat — burns the map toward oblivion and hunts whoever leads. Each round is one tense choice: **spend
your cards to hold back the dark, or spend them to seize the throne.** Hold the most living territory
when the dust settles and you win; let the dark consume the keystone and *everyone* loses (except, in
Blood Pact mode, the traitor who wanted exactly that).

- **Players:** 2–4 (empty seats → AI).
- **Length target:** 30–45 min, ~10–16 rounds **[TUNABLE]**.
- **No elimination.** A broken Warlord becomes a dangerous comeback engine, not a spectator.
- **Determinism:** the entire game is reproducible from `seed`. All randomness via `SeededRandom`.

---

## 2. Components & state

### The map (`Board`) — SETTLED: "The Closing Ring with a steered front" (panel R2 consensus)
Concentric, four-fold symmetric (fair 2–4 starts, single-camera readable, the play space literally
shrinks toward the center). **17 nodes** — one over the ~16 budget to preserve true rotational symmetry
(board-designer + 40K-ref both insisted fairness beats the round number).

```
                 [Keep N]──[Hold]──[Keep E]
                   │   ╲              ╱   │
                [Forge NW]        [Forge NE]
                   │      ╲      ╱      │
              [Approach NW]─[Approach NE]
                   │      KEYSTONE      │        outer ring : 4 Keeps + 4 Holdings (claimable homes/land)
              [Approach SW]─[Approach SE]        mid-belt   : 4 Forges (gate each Approach)
                   │      ╱      ╲      │        inner ring : 4 Approaches (chokepoints; only routes in)
                [Forge SW]        [Forge SE]     center     : 1 Keystone
                   │   ╱              ╲   │
                 [Keep S]──[Hold]──[Keep W]
```
- **Keystone (1, center)** — the loss node (if ashed, the world ends) **and the throne**: a player can win
  the **Crown's Gambit** by holding it a full round as the dark's named target (§6). Reachable only via the
  4 Approaches.
- **Approaches (4, inner ring)** — the chokepoints; each gates one Forge→Keystone path; laterally linked
  so defenders can shift between spokes. **Zone-of-control (stress-test P0-2):** an enemy entering a held
  Approach must STRIKE/RAID to pass — no free march-through — and holding an Approach grants that
  quadrant a Pledge-cost reduction (a gate against the dark). Chokepoints are objectives, not transit.
- **Forges (4, mid-belt)** — one per quadrant, high-value (3 income); reclaiming/holding one **pushes the
  Blight front back** down that spoke (§5.1). **Lateral mid-belt ring (stress-test P0-2):** each Forge
  also links to its two neighbor Forges (a 4-cycle, +4 edges / 0 nodes) — so Forges are rival-contested,
  flanking exists, and the front can spill sideways. The prime contested objectives.
- **Keeps (4, outer corners)** — Warlord homes, pre-claimed, rotationally symmetric; cannot be ashed
  until their owner is Broken.
- **Holdings (4, outer edges)** — claimable land (1 income) seeding the early land-grab.
- **Blight entry:** 4 symmetric outer seams (between Keeps). The Blight converges inward
  Keep-edge → Forge → Approach → Keystone. There is no single off-center "Ashgate" — symmetry instead of
  one corner. **Steered front:** each round the villain *accelerates the advance down one spoke*, aimed at
  the current leader's quadrant (§5.1, §5.6) — so there is always a hot, directional, contiguous front,
  it just rotates toward whoever leads. Fairness (symmetric structure) + drama (a moving, leader-seeking
  salient) at once.
- Each node has runtime `NodeState`: `owner` (player index | SHADOWKING | null), `ashed` (bool),
  `blightLevel` (0..N — how close to ashing), `pieces` (which Warlords' forces / which enemy forces sit here).

### Pieces
- **Warlord (leader piece)** — 1 per player; cannot be destroyed; its node is "where you act from."
- **Retinue pieces** — recruited; add combat strength and let you act in more than one place. **[scope: start minimal — 1–2 piece types — and add roles only once the loop proves fun.]**
- **Shadowking forces:**
  - **Death Knights** — mobile spear-tip; raid deep toward the Crown; strength `DK_POWER` **[TUNABLE]**.
  - **Blight** — the static, spreading tide; converts nodes toward ash; strength `BLIGHT_POWER` **[TUNABLE]**.

### Cards & resources
- **Card hand (persistent)** — the strategic currency. Used to **Pledge**, to fuel **combat**, and to
  **Rescue**. Persists between rounds (spend-vs-save tension). Hand limit `HAND_LIMIT` **[TUNABLE]**;
  refilled toward the limit at Dawn.
- **Banners (per-round income)** — spent on movement and claiming; do **not** persist (discarded at Dawn).
  This keeps two distinct economies: **Banners = tactical (board), Cards = strategic (the Pledge/the dark).**

### The clock
- **Doom is positional, not a counter.** The "doom level" is an *emergent readout* = how far the Blight
  front has advanced toward the Keystone. The UI may still show a derived number, but the source of truth
  is the ashed/blighted map.
- **Act** ∈ {Whisper, March, Reckoning}, advanced by Blight progress thresholds **[TUNABLE]**.

### Top-level `GameState` (additions/changes vs. current code)
```
GameState {
  seed, round, act, phase
  players[]            // each: index, type, isBroken, brokenSince, hand[], banners, crownHeld
  board                // nodes with owner/ashed/blightLevel/pieces
  shadowking {
    forces[]           // death knights + blight
    telegraph          // the announced next move (target node + effect), set in Threat phase
    grudge[]           // per-player grudge weight; DECAYS each round, CAPPED; heroic-grudge decays faster than SK-wounding grudge (§5.6)
    patience           // ratchet: rises when the table blocks; triggers escalation when full
  }
  crownHolder          // player index currently leading (the Crown); recomputed per §7 timing
  pledgeBuffer[]        // current-round pledges (open & live in Layer A; sealed in Blood Pact)
  pledgeHistory[]       // RETAINED per-player pledge tiers per round — feeds Suspicion Log + Audit (§10)
  activePlayerIndex, turnOrder
  gameEndReason, winner
  // Blood Pact (Layer B only):
  bloodPactHolder, suspicionLog[], accusationState
  actionLog[]          // the event stream the UI renders from
}
```

---

## 3. Setup algorithm

```
function setup(playerCount, mode, seed):
  rng = SeededRandom(seed)
  board = buildFixedMap()                       // ~16 nodes, symmetric
  for i in 0..playerCount-1:
     players[i] = newWarlord(i, board.keeps[i]) // keep pre-claimed
     players[i].hand = draw(STARTING_HAND)      // [TUNABLE]
  placeShadowkingForces(board.ashgate, DK_START_COUNT)   // [TUNABLE]
  board.keystone defined; board.ashgate seeds blightLevel
  crownHolder = leader(players)                 // §5.2; tie → seat order
  turnOrder = rng.shuffle(seats)                // fixed for the session (disclosed)
  act = Whisper; round = 1; phase = THREAT
  if mode == blood_pact: assignBloodPact(rng, humanPlayersOnly)   // §10
  generateBanners(all)                          // round-1 income
  return state
```

Determinism note: assign turn order and Blood Pact **last** so they don't perturb earlier RNG draws
(map, forces, hands). Same `(playerCount, mode, seed)` → identical setup.

---

## 4. Round structure

Four phases, fixed order: **THREAT → PLEDGE → ACTION → DAWN.** One interaction window each.

### 4.1 THREAT (telegraph)
The Shadowking declares its next strike *before* it happens, so the table can react/negotiate/sell each
other out. Fully public, deterministic from state.

```
function threatPhase(state):
  intent = chooseShadowkingIntent(state)        // §5.6 — reactive policy, hunts the Crown
  state.shadowking.telegraph = intent           // { effect, targetNode, doomCost C, struckPlayer }
  log(intent.firstPersonLine)                   // the villain speaks, names its target
  render()                                       // red march-line to targetNode
```
`intent.doomCost C` = the card threshold the table must collectively meet in the Pledge to fully avert
this strike. `C` scales with Act and player count **[TUNABLE]**.

### 4.2 THE PLEDGE — the heart
Replaces voting. No unanimity. Partial pledges give **proportional** mitigation. The Crown's cards count
for less. **Visibility is mode-dependent (stress-test decision):** an **open live window** in Layer A
(competitive/co-op) — pledges visible and adjustable on a timer, the staredown — which **freezes** at
window close and resolves deterministically; **true-sealed** in Blood Pact (hidden commit, aggregate-only
reveal — the traitor hides a thin pledge in the noise). Determinism is identical either way: the frozen
vector is resolved in fixed seat order against pre-reveal state.

```
function pledgePhase(state):
  C = state.shadowking.telegraph.doomCost
  // CAPACITY TRANSPARENCY (anti-fake-poverty): each player's MAX possible pledge (|hand|) is PUBLIC
  // before commit — so a card-rich player's low pledge is visibly a choice, in every mode. (P0/§10)
  publish(maxPledge[p] = |p.hand| for all active p)

  // 1. Commit
  //   Layer A: OPEN live window — players raise/lower visibly on a timer; FREEZE at close.
  //   Blood Pact: SEALED — hidden simultaneous commit.
  for each active player p (incl. Broken — Broken keep full Pledge rights):
     pledge[p] = choosePledge(p)                // 0..|hand|  (frozen vector either way)

  // 2. Reveal / lock
  //   Layer A: amounts already visible; lock them.  Blood Pact: flip; show AGGREGATE total only (§10).
  recordTiers(pledgeHistory, pledge[])          // retain per-player TIER (high/med/low/none) every mode

  // 3. Deterministic resolution — fixed seat order, against pre-reveal state
  effective = 0
  for p in seatOrder:
     weight = (p == crownHolder) ? CROWN_PLEDGE_DISCOUNT : 1.0     // [TUNABLE] < 1
     effective += pledge[p] * weight
     discard(p.hand, pledge[p])                 // cards spent regardless of outcome

  // 4. Proportional block — NOT all-or-nothing
  ratio   = clamp(effective / C, 0, 1)
  averted = ratio
  resolveStrike(state, telegraph, averted)      // §5.1/§5.6: apply (1-averted); spread uses ceil() — see note

  // 5. ANTI-FREE-RIDER (stress-test P0-1 — the #1 balance risk) [TUNABLE / ML-VALIDATE]
  //   Without this, the dominant line is "pledge ~0, let someone else cross the threshold."
  //   Candidate (prototype + ML-test): contributors are rewarded, free-riders are not:
  //     (a) the averted fraction shields a PLEDGER's own lands first; AND
  //     (b) each pledger earns a small persistent FAVOR (grudge-reduction / one-time Crown-discount immunity).
  //   Plus shared spillover: an un-averted strike's Blight advances on the steered spoke, threatening
  //   Forges/Approaches NEIGHBORS rely on — so free-riding is not consequence-free. (See §6 anti-turtle.)

  // 6. Patience ratchet — cooperation angers the dark
  if ratio >= FULL_BLOCK_THRESHOLD:             // [TUNABLE] e.g. >=1.0
     state.shadowking.patience += PATIENCE_ON_BLOCK
     if patience full: scheduleEscalation()     // §5.5 — at most ONE Act advance per Dawn (§7)
```

- **Rounding note:** the spread effect uses `ceil((1-ratio) * spreadAmount)` (§5.1) — you can't ash half a
  node, so for `spreadAmount = 1` the block is effectively binary at the threshold. Tune so this reads as
  intended, not surprising.
- **Crown-only worst case:** with the discount, the Crown alone may be unable to reach `C` even by
  emptying its hand — intended (the hunted can't fully self-save) but `C(Act, playerCount)` must be tuned
  for it.
- **Key property:** one defector hurts but cannot veto; the leader benefits most from a full block yet
  contributes least efficiently. **The free-rider incentive (step 5) is the primary thing the Stage-5 sim
  must prove solved before this design is trusted.**

### 4.3 ACTION
Single rotating active-player pointer (no true simultaneity → deterministic). Each takes `actions`
(`ACTIONS_NORMAL` / `ACTIONS_BROKEN`) **[TUNABLE]**.

```
function actionPhase(state):
  for pIndex in turnOrder:
     p = players[pIndex]; activePlayerIndex = pIndex
     while p.actions > 0 and not gameOver:
        a = chooseAction(p)                      // human click / AI
        apply(a)                                 // via single applyCommand reducer (Stage 3)
        // legal actions:
        //   MARCH    : move a piece 1 node (cost 1 banner)
        //   CLAIM    : claim current unclaimed Holding/Forge (cost 1 banner)
        //   RAID     : initiate combat vs a co-located rival (§5.3)
        //   STRIKE   : initiate combat vs a co-located Shadowking force (§5.3) — killing a DK pushes back the Blight
        //   RESCUE   : un-Break a co-located/adjacent ally for a binding debt (§5.4)
        //   RECRUIT  : reveal/recruit a retinue piece (if a recruiter is present)
        //   PASS     : end actions
        if combat occurred and defender would fall: offer LAST STAND (§5.3)
     postTurnBrokenCheck(p)                       // §5.4
     checkImmediateLoss(state)                    // doom_complete / all_broken can fire mid-phase
```
Conflict rule: if two actions would contest the same node, the active player at the time resolves first
(seat-order initiative). Banners are spent at the moment of action against current state.

### 4.4 DAWN (income, recovery, escalation, victory)
```
function dawnPhase(state):
  for p in players: discard(p.banners); generateBanners(p)     // banners don't persist
  for p in players: drawUpTo(p.hand, HAND_LIMIT)               // cards refill toward limit
  for p in players (Broken): recoveryCheck(p)                  // §5.4 — auto-recover after cap
  applyScheduledEscalation(state)                              // §5.5 — Blight spreads, Act may advance
  recomputeCrown(state)                                        // §5.2
  checkTerritoryVictory(state)                                 // §6 — end-of-round only
  if not gameOver: round += 1; phase = THREAT
```

---

## 5. Core mechanics in detail

### 5.1 The ash-map / Blight spread (doom you can point at)
- Blight enters at the 4 symmetric outer seams and converges inward along the spokes
  (Keep-edge → Forge → Approach → Keystone). Each escalation (and each un-averted SPREAD strike) raises
  `blightLevel` on the **frontier** nodes (those adjacent to already-blighted/ashed nodes).
- **Steered front:** each round the advance is *accelerated down one spoke*, chosen by the villain's
  policy and aimed at the **current leader's quadrant** (§5.6). The ring stays symmetric but the *hot
  front* rotates toward whoever leads — fairness plus a real moving salient.
- When a node's `blightLevel` reaches `BLIGHT_TO_ASH` **[TUNABLE]**, it becomes **ashed**: owner cleared,
  produces nothing, and is gone for the game. **Ashed nodes remain TRAVERSABLE at extra movement cost —
  NOT impassable** (locked per stress-test P0-3: impassable would strand a Gambit-holder unreachable and
  let isolated survivors wait out the cap; traversable keeps the shrinking board tense, not segmented).
- **Net-front arithmetic (ordered, stress-test C3):** each round resolve in this fixed order —
  (1) PLEDGE-phase un-averted SPREAD advances `ceil((1-ratio) * intent.spreadAmount)` frontier steps;
  (2) ACTION-phase PUSHBACK from killing a Death Knight / reclaiming a Forge retreats the front by
  `PUSHBACK` **[TUNABLE]** (floors at the outer seam — Blight cannot retreat off-board then re-enter);
  (3) DAWN escalation advance. The net is a single ordered sum; **PUSHBACK must not be able to perfectly
  cancel the Dawn advance every round** (else it's a second turtle path — the §6 anti-turtle pressure
  covers the pushback path too, not just pledge-dodging).
- PUSHBACK is the players' lever against the map dying; it replaces the old "defeat a Death Knight → doom
  −1." (Off-spoke contribution may be required so the leader isn't their own best firefighter — ML-tune.)
- **Loss:** the dark eats the Keystone → `doom_complete`.

### 5.2 The Crown (leading is dangerous)
- `crownHolder` = player with the most **living owned production** (Holdings + Forges, Forge weighted
  `FORGE_WEIGHT` **[TUNABLE]**). Tie → most Banners, then seat order. Recomputed at Dawn (and on demand
  for targeting).
- The Crown does three things at once:
  1. **It's how you win** (territory victory keys off it — §6).
  2. **The Shadowking prioritizes it** (§5.6 targeting).
  3. **Defense surcharge** — the holder's pledged cards count for `CROWN_PLEDGE_DISCOUNT < 1` (§4.2).
- Net effect: progress paints a target on your back and makes you a worse defender → players negotiate
  over who has to lead.

### 5.3 Combat & the Last Stand (variance you choose)
Deterministic base + concealed-choice uncertainty (judge) + opt-in gamble (40K). **No random target
selection, no hidden dice.**
```
function combat(attacker, defender):
  // base strength = pieces' power + (optional) committed cards
  atkCards = attacker chooses to commit (sealed); defCards = defender chooses to commit (sealed)
  atk = power(attacker) + value(atkCards)
  def = power(defender) + value(defCards)
  reveal(atkCards, defCards); discard both
  winner = (atk > def) ? attacker : defender    // ties → defender
  margin = |atk - def|
  applyOutcome(loser, margin)                    // loser takes "wounds" toward Broken (§5.4)
```
- Uncertainty lives in *how many cards your opponent secretly commits*, not in dice.
- **Ties:** rival RAID → defender wins (clean). **STRIKE vs. a Shadowking force → no-result, cards
  returned** (P1/A5 — attacking the dark shouldn't be coin-flip-negative).
- **Last Stand:** when a defender (incl. a Broken Warlord) would lose a stronghold, they may commit
  **any** number of additional cards for a heroic reversal — but those are the same cards needed for next
  round's Pledge. It is **one-sided and final** (no attacker counter-commit — else infinite re-raise; the
  attacker already spent). The Last Stand prompt **telegraphs the stakes** ("Win and you also drive back
  the tide here"). Win → hold the node *and* destroy a Death Knight / push back the front; lose → node
  falls and the cards are gone (often crippling your next Pledge → your defeat feeds the dark).

### 5.4 Broken Court & Rescue (no elimination, with teeth)
- **Enter Broken** when accumulated wounds ≥ `BREAK_THRESHOLD` **[TUNABLE]** (one visible meter — a
  cracking shield — *not* a separate Penalty-Card economy).
- **Broken state:** reduced actions (`ACTIONS_BROKEN`) **but boosted income** (a comeback subsidy
  `BROKEN_INCOME_BONUS` **[TUNABLE]**); may still RAID, STRIKE, and Last Stand; **keeps full Pledge
  rights**. A Broken Warlord's *lost* Holdings turn to ash and feed the front (§5.1) — so beating a rival
  down hurts the whole table. **Anti-exploit (P1):** while Broken you **forfeit Crown-eligibility**, and
  the income subsidy **decays each consecutive Broken round** — a comeback *ramp*, not a sustainable home
  (else self-breaking becomes a strategy to dodge the Crown). Broken players also need an active, scary
  verb they *initiate* (not just "lost lands feed the front") — design one in Stage 3 (DM note).
- **Recovery cap:** auto-recovers to minimum strength after `BROKEN_MAX_ROUNDS` **[TUNABLE]** — no
  permanent kingmaker-hostage (judge's fix).
- **Rescue:** an active Warlord spends `RESCUE_COST` cards to un-Break an ally, in exchange for a
  **binding one-round debt**. The obligation set is: a forced **minimum Pledge contribution**, a
  **withheld attack** (named target, one round), or **claim support** — enforced on **public actions
  only** (a sealed/secret pledge amount can't police a debt; the forced-minimum is applied transparently).
  No "vote" obligation (voting was replaced by the Pledge). Never charity; breaking the debt incurs a
  penalty **[TUNABLE]**.
- **Draw:** if all active Warlords are Broken simultaneously → `all_broken` (all lose).

### 5.5 Escalation acts (the noose tightens, visibly)
Three acts, advanced by Blight progress and/or the patience ratchet:
- **Whisper** — the dark mostly threatens and takes edge nodes; small strikes; ominous voice.
- **March** — Death Knights make deep raids and the SK names hunts; Blight spreads faster.
- **Reckoning** (final act) — every round the dark acts harder; a "Reaping" can strike every exposed
  border stronghold; doom accelerates; the voice is constant. A visible "point of no return."
- Each act crossing is a **named, full-screen beat** and changes rules + board mood + audio + the
  villain's dialogue register. Escalation **unlocks behavior**, it does not merely +1 a number.

### 5.6 The Shadowking behavior policy (character, deterministic, reactive)
Not a faceless deck. A transparent, telegraphed policy keyed off live state:
```
function chooseShadowkingIntent(state):
  // TARGET PRECEDENCE (stress-test P0-3): Gambit claimant > highest grudge > Crown holder.
  target = gambitClaimant(state)                 // if a Gambit is live, the dark names the claimant
        ?? highestGrudge(state)                  // else the player it most resents
        ?? crownHolder                           // else hunt the Crown
        // ties broken by lowest seat index (deterministic — §7)
  // effect chosen by Act + board (and by whether a Gambit is live):
  //   Gambit live: STRIKE-ADJACENT — assault the claimant's lands NEIGHBORING the Keystone, with
  //                GAMBIT_ADJACENT_STRIKE_MULT; the dark CANNOT ash the garrisoned Keystone directly (§6).
  //   Whisper:  SPREAD (advance Blight toward Keystone) | SEIZE (claim nearest living Holding)
  //   March:    MARCH a Death Knight 2 nodes toward target's nearest stronghold | RAID (assault it)
  //   Reckoning:REAP (assault all exposed border strongholds) | SURGE (double SPREAD)
  return { effect, targetNode, steerQuadrant: quadrantOf(crownHolder),
           doomCost C(Act, playerCount), firstPersonLine(target) }
```
- **Two-line telegraph (P0-4)** at THREAT (§4.1): line 1 = *this round's strike* (the Pledge target);
  line 2 = *the steer* ("I turn my hunger toward [Crown quadrant]") — show the cost of leading BEFORE
  players commit actions, so the steered-front re-aim (§5.1) is never a surprise.
- **Grudge is public, decays, and is capped (P0-4 / P1):** wounding the SK (killing forces, reclaiming
  Forges) raises *your* grudge — players steer the dark at each other — but grudge is shown as a public
  per-player meter, decays each round, is capped, and **heroic-grudge decays faster than direct-SK-wound
  grudge**, so occasional heroism is safe and only sustained provocation makes you the target. Prevents
  the most helpful player (most front-pushback) from becoming the permanent victim. Ties → lowest seat.
- **In-round voice layer (P0-5)** — keyed off the existing `actionLog` + `grudge[]`, ZERO rules change:
  the villain barks during PLEDGE/ACTION, not only THREAT — on grudge earned ("So. *You* draw the blade."),
  on a strike landing through a thin pledge ("Your friends sold you cheap."), on a leader toppled, on
  PUSHBACK (it registers the wound). Escalation (§5.5) **cites the block that caused it**. This is what
  makes the villain a presence, not an announcer — spec it now or it gets cut as "polish."
- **Crown handoff is a named, full-screen beat** (P0-4), same weight class as an Act crossing:
  "[Name] now leads. The Shadowking turns its gaze." The "leading is dangerous" fiction is invisible
  without it.
- **Deterministic** from state+seed (sim/balance friendly), yet **reactive** so it can't be memorized
  into irrelevance (a pure function of a large live state, not a fixed lookup deck).

---

## 6. Victory & loss conditions — SETTLED: "Contested Throne + Gambit" (panel R2)
Two ways to win; the Keystone is both the doomsday node and the throne. Check ordering is fixed and
deterministic (loss preempts win; all snapshots taken post-escalation in seat order).

### Default win — Territory (how ~most games end)
- The game has a fixed, common-knowledge **round cap `ROUND_CAP`** **[TUNABLE]** (not a player-pullable
  threshold — that would hand the leader a self-timed snapshot, per the judge).
- At the **Dawn of the final round** (after escalation resolves, loss check passed), the living player
  with the **most living production/territory** wins. Ordered, seed-deterministic tiebreakers (no coin
  flips): (1) most living territory; (2) fewest ashed tiles adjacent to your holdings; (3) most Banners;
  (4) earliest seat order.

### Alternate sudden win — The Crown's Gambit (the dramatic climax)
A bold, fully telegraphed central play, **de-taxed to TWO real costs** (stress-test P0-3 — four costs
made it a button nobody presses). Timeline:
1. **Seize:** during ACTION, march a force onto the Keystone (only via an Approach). 
2. **Declared & named:** if you **hold the Keystone at Dawn**, the Gambit goes public and the dark
   **names you** — at the next THREAT it aims at you regardless of production lead. Rivals get this whole
   round to break you (raid you off, out-position, or withhold pledges to feed the dark at you).
3. **Win — resolved on the SINGLE named-Dawn:** if you **still hold the Keystone at that next Dawn**, you
   win immediately. (One named round of risk, not two — per P0-3.)

**The two costs (and only two):**
- **Max Crown surcharge** (`GAMBIT_SURCHARGE`) — your pledged cards count for the least while you sit the
  throne. Kills passive turtling on the Keystone.
- **Committed forces** — your pieces are tied to the center, so you can't push the front back elsewhere; a
  failed Gambit can let the tide swallow your homeland (risk = reward).

**Guardrails:**
- **No instant everyone-loses:** while garrisoned, the dark **cannot ash the Keystone directly** — it
  STRIKE-ADJACENTs the claimant's neighboring lands instead (§5.6), at **normal** rate (the amplifying
  multiplier is dropped per P0-3). The Gambit risks *your* position, not the table's instant loss.
- **Ashed Approaches stay traversable at extra cost** (§5.1, now locked) — otherwise the dark could ash
  all 4 Approaches around a Gambit-holder, stranding them unreachable and making the Gambit *unbreakable*.
- **The traitor can NEVER win the Gambit** (their win is the ash) — keeps the two secret-win conditions
  from colliding.
- **Final round:** a Gambit held into the round cap resolves at that cap's Dawn **before** the territory
  check (never orphaned by the cap).
- **Blood Pact interaction (explicit):** rivals "withholding pledges to feed the dark at the Gambiteer"
  also advances global doom toward the Keystone — which *helps the traitor win*. So in Blood Pact a live
  Gambit is double-edged for the table; surfacing this tension is intended, but the loss check (Keystone
  ashed → traitor wins) still **preempts** the Gambit win if the dark reaches the center first (§check order).

### Loss & draw
- **Doom Complete (all lose):** the dark ashes the Keystone → game ends immediately. In Blood Pact mode →
  the traitor wins, all others lose. **Checked at the end of every Dawn, after escalation, in seat order;
  preempts the win check.**
- **All Broken (draw):** all active Warlords Broken at once → all lose.

### Anti-turtle / anti-stall (baseline, the judge's fix — applies regardless of win path)
Every Dawn the front advances one step toward the Keystone **unless** the round's collective Pledge met
threshold. Passivity is therefore lethal: a player who stops pledging to dodge the Crown surcharge is
feeding their own loss — and the traitor must *actively* suppress pledges (detectable) rather than simply
wait. This converts the territory race's "turtle-to-cap" line from dominant into suicidal.

---

## 7. Determinism contract (for Stage 3 + ML)
1. Single source of randomness: `SeededRandom(seed)`, threaded explicitly. No `Math.random()` anywhere
   (including seed selection in the ML harness).
2. **Pledges:** the commit vector is **frozen** at window close (open in Layer A, sealed in Blood Pact),
   then deducted in **fixed seat order against pre-reveal state**. No pledge may reference another's
   pledge. (Open-but-frozen is just as deterministic as sealed — visibility ≠ resolution order.)
3. **Combat commits & Audit:** route through ONE `SealedCommit<T>` primitive (commit → buffer → atomic
   reveal → ordered resolve) so pledge/combat/audit can't drift to three different orderings.
4. **Action phase:** one rotating active pointer; no simultaneity; node conflicts resolved by seat-order
   initiative.
5. **Behavior policy:** pure `f(state, seed)`; targeting reads live state but never RNG-picks a victim.
6. **Targeting ties** (grudge or Crown): broken by **lowest seat index**, never RNG (§5.6).
7. **Crown recompute timing:** THREAT reads the **telegraph-time** Crown; the Crown is recomputed only
   **after** Dawn escalation, for *next* round's targeting. Steering never uses a not-yet-recomputed Crown.
8. **Hand refill:** a single shared **seeded deck**, drawn in **seat order** at Dawn (`drawUpTo`).
9. **AI decisions are pure `f(state, seed)`** — AI *pledge* and AI *accusation* (§10), not just the
   Shadowking policy. Required for the "scripted inputs ⇒ identical game" invariant.
10. **Loss-check order:** when multiple end conditions could fire, `doom_complete` is checked **before**
    `all_broken`; the **loss check preempts the win check**; at Dawn, **recovery is evaluated before
    `all_broken`** (a simultaneous break+recover is survival, not a draw).
11. **Escalation:** at most **one Act advance per Dawn**; escalation never retroactively affects the
    current round's already-resolved strike; define coalescing if patience-full and a Blight threshold
    cross in the same Dawn.
12. Same `(playerCount, mode, seed, [scripted inputs])` ⇒ identical game. The invariant the ML harness and
    the test suite both assert.

---

## 8. Mechanic-by-mechanic mapping to current code (Stage 3 reuse vs. rebuild)
| v2 mechanic | Reuse from current engine? |
|---|---|
| Board graph, `SeededRandom`, GLL tokens | **Reuse.** |
| Phase machine | **Refactor** to THREAT→PLEDGE→ACTION→DAWN; one pure sequencer. |
| Voting → **The Pledge** | **Rebuild** (sealed buffer, proportional block, Crown discount). |
| Doom track → **ash-map** | **Rebuild** doom as Blight/ash on nodes; remove the integer-only track. |
| Combat | **Refactor** to sealed-commit + Last Stand; keep deterministic core. |
| Broken Court / Penalty Cards | **Rebuild** to single wound meter + comeback subsidy + recovery cap + debt-rescue. |
| Shadowking deck | **Rebuild** as telegraphed reactive policy with grudge + acts. |
| AI players | **Refactor** to the new action/pledge space (and to pledge sealed). |
| All movement/claim/combat logic | **Consolidate** into one `applyCommand` reducer (kills the 3–4 duplicate copies). |

---

## 9. Tunable parameters (Stage 5 / ML sets these)
`STARTING_HAND, HAND_LIMIT, ACTIONS_NORMAL, ACTIONS_BROKEN, DK_START_COUNT, DK_POWER, BLIGHT_POWER,
BLIGHT_TO_ASH, PUSHBACK, doomCost C(Act, playerCount), CROWN_PLEDGE_DISCOUNT, FULL_BLOCK_THRESHOLD,
PATIENCE_ON_BLOCK / patience cap, FORGE_WEIGHT, BREAK_THRESHOLD, BROKEN_INCOME_BONUS, BROKEN_MAX_ROUNDS,
RESCUE_COST, act thresholds, ROUND_CAP, GAMBIT_SURCHARGE, GAMBIT_ADJACENT_STRIKE_MULT.`
Target Gambit frequency: it should actually fire in ~1-in-6-to-8 games **[TUNABLE]** — rare enough to be
an event, common enough that its *threat* shapes negotiation every game (board designer).
Target metrics (from old PRD, re-validate): Shadowking win rate **18–22%**, session **10–16 rounds**,
2–4 rescue events/game, no dominant pledge line. **These are validated against the REAL rules and AI in
the new sim — never against a stubbed greedy bot (see `docs/ML-SYSTEM-ANALYSIS.md`).**

### 9.1 Player-count identity ladder (LOCKED decision — Stage 5)
The Shadowking win-rate target (18–22%) is a **POOLED** target across player counts. Per-count win rate
is a **monotonic gradient by design, not a defect to flatten**: the Pledge's blocking power scales with
the number of allies, so co-op is inherently harder with fewer of them. After the Stage-5-dark
engagement fix this reads **2p ~31% / 3p ~22% / 4p ~9%** — the dark is a credible threat at every count.
This is shipped as a named **difficulty/identity ladder**, each a deliberately different texture:

| Count | Name | Texture |
|---|---|---|
| 2 | **The Duel** | a brutal duel against a third party that may actually win — survival-horror stakes |
| 3 | **The Triumvirate** | the balanced middle — the dark and the rivals both matter |
| 4 | **The Carve-up** | the rivals are the danger; the dark is weather you weaponize (the grudge/steer) |

Decision history: the per-count flatness was escalated to the lead designer at Stage 5c (numbers alone
can't flatten it without exploding 2p past 40% / flipping the dominance guard — proven across 5 grids).
The reconvened focus group (`DESIGN-V2-FOCUS-GROUP-R2.md` §3) recommended **A — accept + name the
tiers** once the dark-engagement fix lifted the middle. **Chosen: A.** The deferred surgical alternative
(marginal-pledge-effectiveness decay, option B) is recorded but NOT built. Do not re-litigate without
sign-off.

---

## 10. Layer B — Hidden-traitor (Blood Pact) [mode flag]
Built on top of the sealed-pledge substrate; absent unless `mode === 'blood_pact'`.
- **Setup:** one **human** player is secretly the Blood Pact holder; wins iff `doom_complete` fires
  without being correctly accused. AI never holds it.
- **Deduction surface (the judge's fix — required, or the traitor is just "the defector you can't
  prove"):**
  - In Blood Pact mode, the Pledge reveal shows **only the aggregate total**, not individuals — the
    traitor hides a thin pledge in the noise.
  - **Audit action:** a suspicious player may spend resources during ACTION to reveal **one** opponent's
    *last* pledge. A real cost; a real tool.
  - **Suspicion Log:** each player's recent pledge-tier history (high/med/low/none) for the last
    `SUSPICION_LOG_ROUNDS` **[TUNABLE]** rounds, visible only from the accusation screen.
  - **Accusation:** all other active Warlords must unanimously commit; correct → traitor's win condition
    converts to territory + penalties + the front pushes back; wrong → accusers pay, the accused is
    vindicated (gains), and a cooldown/lockout prevents spam **[TUNABLE]**.
- **"Can't pay" definition (critical):** inability to pay = pledges 0 and that fact is public — so being
  card-poor cannot be used as a fake-traitor shield.

---

## 11. Deliberately deferred / open for Stage 3
- Full co-op mode (variant, post-core).
- Async & mobile (this is a real-time game — open live Pledge window in core).
- Deep retinue/role economy (start minimal; expand once the loop is proven).
- **P2 legibility/UX items** (pledge reveal as a threshold beat, blightLevel pip ladders, Gambit alarm
  banner, `SealedCommit<T>` primitive, Whisper-act onboarding, the dramatic "Last Dawn" cap ending) — see
  `docs/DESIGN-V2-STRESS-TEST.md §P2`; implement during Stage-3 UI.
- **Primary open balance question for Stage 5 (ML):** is the Pledge free-rider incentive (§4.2 step 5)
  actually solved? This must be proven before the design is trusted.
- *(Resolved in panel R2: win condition = Contested Throne + Gambit, §6; map = the Closing Ring with a
  steered front, §2. Stress-test P0/P1 fixes folded in throughout.)*
