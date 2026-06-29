# Design v3 — Textual Algorithm (the engine spec)

> **Role:** the **implementation spec** for the v3 redesign — state shape, the determinism contract, the
> reducer mapping, the new mechanics, and the tunable registry. It is what the next-sprint code is built
> and verified against. The human-readable design lives in `design-history/DESIGN-V3-CONCEPT.md`; the panel
> deliberation in `design-history/DESIGN-V3-FOCUS-GROUP.md`. The adversarial audit that hardens this spec
> is `design-history/DESIGN-V3-STRESS-TEST.md`.
>
> Status: **Stage V3-3 deliverable — design-only.** No code this sprint. Balance numbers are placeholders;
> Stage V3-5 (sim) sets the locked values. Where v3 reuses v2 unchanged, this spec cites the v2 section
> rather than restating it (`DESIGN-V2-ALGORITHM.md`).
> **HARDENED by the V3-4 stress-test** (`design-history/DESIGN-V3-STRESS-TEST.md`): twelve P0 holes were
> found and their fixes are folded into **§13 (authoritative amendments)**, which OVERRIDES earlier prose
> where they conflict; the §12 table gained rows #17–#26. Load-bearing spots carry an inline `[hardened —
> §13 P0-n]` marker. The first-pass §§5–7 prose is kept for rationale; §13 is the corrected layer.
> Date: 2026-06-26
> Builds on: the V3-1 concept and the V3-2 focus group. Closes the §7 open forks of the focus group.

---

## 0. Locked design decisions (v3 delta vs v2)

| Decision | v2 | **v3** |
|---|---|---|
| Defeat model | No elimination; Broken Court (subsidy + recovery cap + `all_broken` win) | **Full elimination.** Beaten = out; eliminated player spectates (with residual agency — §5.5). Broken Court **retired**. |
| Pieces | 1 Warlord + vague retinue + Herald | **A court of 4 archetypes** — Warlord / Marshal / Steward / Herald — each with a distinct verb and a distinct capture-consequence (§2). |
| Combat outcome | Wounds toward Broken | **Capture** (by choice, margin-gated, one-effect-per-combat) — a hostage economy (§5.2). |
| Rescue | Un-Break an ally (forges Oath) | **Ransom** — free a captive (yours or an ally's); freeing an ally's piece may forge an Oath (§5.3). |
| Roster growth | Static | **Discovery** — flip seeded face-down recruit tokens on neutral land; you *meet* a named retainer (or a risk) (§5.1). |
| Dark's terminal win | `doom_complete` + `all_broken` | `doom_complete` + **attrition (last-two/simultaneous elimination)** + **Reckoning auto-pressure** (§6). |
| Heroic win | none (you can only delay the dark) | **Kill the Dark** — assault the heart, end the threat, then survivors fight for the throne (two-act) (§5.6). |
| Catch-up | Crown surcharge + Broken subsidy | **Crown surcharge ONLY** (+ capture-side brakes — §5.4). |

**Kept from v2 wholesale** (cite v2 spec, do not rebuild): the board (the Closing Ring, §2), the Pledge
(§4.2), the telegraphed Shadowking policy + grudge/Ledger + 3 acts (§5.5/§5.6 v2), Oaths (§5.4 v2), the
Crown's Gambit (§6 v2), the Banners/Cards two-economy split, and the full determinism contract (§7 v2),
extended in §7 below.

---

## 1. Game overview

2–4 rival Warlords build a **court** and carve up a dying kingdom while the telegraphed **Shadowking**
burns the map toward the Keystone and hunts whoever leads. Each round: **spend your cards to hold back the
dark, or to seize the throne.** Capture your rivals' retainers, ransom your own back, and — if you dare —
march on the dark's heart and end it. Be the last Warlord standing, hold the most land at the cap, take the
throne, or slay the dark and win the scramble that follows. Let the dark eat the Keystone, or fall to the
last, and you lose (the traitor, in Blood Pact, wins).

- Players 2–4 (empty seats → AI). Length target 30–45 min, ~10–16 rounds **[TUNABLE]**.
- **Elimination is real** (gated to The March+; §5.5). No comeback state.
- Determinism: the entire game (incl. AI and the discovery layout) is reproducible from `seed`.

---

## 2. Components & state

### The map — UNCHANGED from v2
The Closing Ring, 17 nodes, concentric four-fold symmetry, steered front. See `DESIGN-V2-ALGORITHM.md §2`.
One restatement is forced by retiring Broken (§6, edge #24): **Keep-ashing rule** — a Keep cannot be ashed
while its owner holds **any** living stronghold; once a Warlord holds zero strongholds it is `deposed` and
eliminated at Dawn (§6), at which point its Keep ashes normally.

### Pieces — THE COURT (new)
Each player commands a small court. **Start minimal: 4 archetypes max** (the v2 rule holds).

| Archetype | Echoes | Power | Verb / passive | Capture-consequence |
|---|---|---|---|---|
| **Warlord** (leader, 1/player) | Star Master | high | seat of action; cannot be left loose | **its capture/depose = elimination** |
| **Marshal** | Warrior | high combat | the muscle; may declare Last Stand | lose your offensive teeth |
| **Steward** | Merchant | low combat | **+Banners** at its node each Dawn | lose your economy |
| **Herald** *(advanced)* | Diplomat | low combat (`−HERALD_COMBAT_PENALTY`) | `+HERALD_HAND_BONUS` hand; PARLEY vs the dark; never fights | lose your hand/political reach |

- Retainers are recruited via **Discovery** (§5.1) and carry a **seeded name + one-line identity** (drawn
  `f(seed, tokenId)`); the Warlord has a fixed faction name. Names are state; they drive attachment and the
  UI "Hold" rail, not mechanics.
- A captured retainer is held by the captor: **produces nothing**, cannot act, is not gained by the captor
  (a Steward in a cell funds no one). It is a tradeable/ransomable asset (§5.3).
- **Herald is flagged advanced**: if the sim's session-length band can't absorb 4 types, Herald drops to a
  launch variant (focus-group §3.7).

### Cards, Banners, the clock — UNCHANGED from v2 (§2 v2)
Cards (persistent hand, the strategic currency: Pledge / combat / Last Stand / Ransom). Banners (per-round,
tactical: March / Claim / tolls). Act ∈ {Whisper, March, Reckoning}.

### Top-level `GameState` (v3 delta vs v2 §2)
```
GameState {
  seed, round, act, phase
  players[]            // index, type, isEliminated, eliminatedRound, deposed(bool), hand[], banners,
                       //   court[] (piece ids + archetype + name + node + captiveOf|null), crownHeld
                       //   --- REMOVED: isBroken, brokenSince, brokenRoundsConsecutive, wounds
  board                // nodes: owner/ashed/blightLevel/pieces  +  hiddenToken (engine-only; §5.1)
  shadowking {
    forces[]; telegraph; grudge[]; patience
    strikePool[]       // NEW: cards fed by elimination (§5.5) + wraith inputs (§5.5); fuels strikes
    wraiths[]          // NEW: eliminated Warlords serving the dark (id, oneInputPerRound)
    heart {            // NEW: the Kill-the-Dark objective, appears in Reckoning (§5.6)
      nodeId, hp, exposed(bool)
    }
  }
  crownHolder
  pledgeBuffer[]; pledgeHistory[]
  captives[]           // NEW: { pieceId, ownerSeat, captorSeat, capturedRound, recaptureImmuneUntil }
  oaths[]              // UNCHANGED from v2
  activePlayerIndex, turnOrder
  gameEndReason, winner
  // Blood Pact (Layer B): bloodPactHolder, suspicionLog[], accusationState, bloodPactExposed
  actionLog[]
}
```
**Observability (NEW, §7):** all deciders read `observableState(state, viewerSeat)`, which redacts
`board.node.hiddenToken` for unflipped tokens. Engine resolves flips from full state. The AI must not see
under the fog.

---

## 3. Setup

As v2 §3, with three additions, all RNG-ordered to preserve replay (setup draws first, turn-order +
Blood-Pact last):
```
function setup(playerCount, mode, seed):
  rng = SeededRandom(seed)
  board = buildFixedMap()
  for i in 0..playerCount-1:
     players[i] = newWarlord(i, board.keeps[i], factionName[i])   // Warlord only; court grows by Discovery
     players[i].hand = draw(STARTING_HAND)
  bindHiddenTokens(board, seed)          // NEW: every neutral Holding's token content = f(seed, nodeId),
                                          //      frozen now — a reveal later, never a lazy draw (§7)
  placeShadowkingForces(board, DK_START_COUNT)
  shadowking.heart = undefined           // spawns at the Reckoning crossing (§5.6)
  crownHolder = leader(players); turnOrder = rng.shuffle(seats)
  act = Whisper; round = 1; phase = THREAT
  if mode == blood_pact: assignBloodPact(rng, humanPlayersOnly)
  generateBanners(all)
  return state
```

---

## 4. Round structure — THREAT → PLEDGE → ACTION → DAWN

THREAT and PLEDGE are **unchanged from v2** (§4.1/§4.2) except that the dark's strike may draw extra power
from `strikePool` (§5.5), and a landed strike now **captures court pieces / strips land** toward elimination
instead of dealing wounds (§5.2/§5.5). DAWN is where elimination resolves (§6).

### 4.3 ACTION — the verb menu (v3 delta)
```
function actionPhase(state):
  for pIndex in turnOrder where not players[pIndex].isEliminated:
     ... actions loop (ACTIONS_NORMAL; no ACTIONS_BROKEN — Broken is gone) ...
     // legal actions:
     //   MARCH / CLAIM / SWEAR_OATH / BREAK_OATH / PARLEY / PASS  — as v2 §4.3
     //   CLAIM        : now FLIPS the node's hidden token first (§5.1) — you meet a retainer or a risk
     //   RAID         : combat vs a co-located rival; on win, attacker ELECTS one of
     //                  {take land | rout the piece | CAPTURE a piece} — capture only if margin≥CAPTURE_MARGIN
     //                  and never combined with node loss (one-effect-per-combat, §5.2)
     //   STRIKE       : combat vs a Shadowking force; killing a DK claims its node + pushes the front (as v2)
     //   RANSOM       : free a captive (yours or an ally's) for cards/banners; an ally-ransom may forge an
     //                  Oath (§5.3) — replaces v2 RESCUE
     //   ASSAULT_HEART: commit a force to damage the dark's heart (Reckoning only, §5.6)
     //   --- REMOVED: RESCUE (→ RANSOM)
  // elimination is NOT resolved here — Warlord-capture sets `deposed`; resolved at DAWN (§6, determinism)
```

### 4.4 DAWN (v3 delta)
```
function dawnPhase(state):
  banners reset/regenerate (Stewards add +STEWARD_INCOME at their node; no Broken subsidy)
  drawUpTo(hand, HAND_LIMIT) in seat order from the shared seeded deck
  applyScheduledEscalation()                 // Blight spread, Act may advance; Reckoning spawns the heart (§5.6)
  applyReckoningAutoPressure(state)           // NEW: if Reckoning and no live ASSAULT_HEART, dark eliminates
                                              //      strongholds table-wide (§6)
  resolveDeposals(state)                      // NEW: deposed / zero-stronghold Warlords eliminated here, seat order (§6)
  recomputeCrown(state)                       // among living players only
  checkEndConditions(state)                   // §6 — loss preempts win; attrition successor to all_broken
  if not gameOver: round += 1; phase = THREAT
```

---

## 5. Core mechanics

### 5.1 Discovery (grow the court by exploring)
Neutral Holdings carry a **face-down token**, content pre-bound at setup as `f(seed, nodeId)`. CLAIM flips
it (the claimer can't act further that turn — cf. v2 Diplomat search):
- **Recruit (~`DISCOVERY_RECRUIT_PCT`, ≈60%):** reveal a named retainer (archetype by seeded roll); it
  joins your court at the node with no Banners until you provide them.
- **Blight-seed (~25%):** the front quickens in this quadrant — a fixed front-delta inserted at a defined
  slot in the §5.1-v2 net-front ordered sum. **Agency, not pure loss:** the seed manifests as a fightable
  threat that, if cleared (STRIKE) this/next turn, yields a **bonus recruit** — a bad flip becomes a
  decision, not a dice-loss.
- **Death-Knight (~15%):** a DK spawns on the node (blocks CLAIM until killed; killing it claims the node +
  pushes the front, as v2). The flip-spawned DK acts only **next** THREAT (never retroactively).
- **Partial telegraph:** a token shows a back-sigil hinting risk-vs-reward, so CLAIM is press-your-luck, not
  blind. Determinism: see §7 (pre-bound, observable-projection).

### 5.2 Capture (the fluid roster)
> `[hardened — §13 P0-1/P0-2/P0-3/P0-10/P0-11]` ROUT is now a tempo loss (not free removal), `CAPTURE_MARGIN`
> rises with the attacker's standing (the military catch-up lever), depose legality is **Act**-gated, Whisper
> caps court-stripping, and Exposure is a mandated UI readout. The prose below is the first pass.

On a winning RAID, the attacker **elects exactly one** outcome:
```
if margin >= CAPTURE_MARGIN:  choices = {TAKE_LAND, ROUT_PIECE, CAPTURE_PIECE}
else:                          choices = {TAKE_LAND, ROUT_PIECE}
attacker picks one            // never TAKE_LAND + CAPTURE together — one effect per combat
```
- **CAPTURE_PIECE:** move a defending non-Warlord piece to `captives[]` (captiveOf = attacker). The Warlord
  is **never** directly capturable; it can only be `deposed` by losing its last stronghold (§6). Capturing
  the *last non-Warlord piece* in a quadrant, then taking the Warlord's last stronghold, is the multi-turn
  siege path to elimination.
- **Loosened co-location `[Stage 5e]`:** a RAID is legal whenever the defender has **any on-board piece**
  at the node — the defender's Warlord need NOT be co-located. So a winning, margin-clearing RAID may
  CAPTURE an **unguarded co-located retainer** (a Marshal/Steward sitting on a freshly-recruited Holding
  while its Warlord is elsewhere). Every other brake is intact: the Warlord is never directly capturable
  (deposal is §6-only); the standing-scaled `CAPTURE_MARGIN` gate; one-effect-per-combat; ROUT-as-tempo;
  the captive guard cap; and Whisper last-retainer protection. The combat resolves on the defender's
  power **at that node** (an unguarded retainer defends with little base power, so the margin gate is the
  real cost — but the leader still needs the standing-scaled margin to seize one).
- **Severity ramp (Blight-gated, replaces the act cliff):** in Whisper a RAID captures ≤1 non-Warlord and
  **cannot take a last stronghold**; in March, free; in Reckoning, the Warlord's last stronghold is
  reachable → depose. Gate on Blight level so the tide lowers protection table-wide together.
- **Last Stand** (Marshal/Warlord, as v2 §5.3): defender pours in extra cards; **on loss, node-only** (no
  added capture — one-effect-per-combat).

### 5.3 Ransom (replaces Rescue)
```
function ransom(actor, captive):
  require actor co-located/adjacent to the captor's hold OR actor == captive.owner
  pay RANSOM_COST (cards) + RANSOM_BANNERS; a fixed RANSOM_SINK_CUT is DESTROYED (not paid to captor)
  free captive → returns to owner's nearest stronghold; set recaptureImmuneUntil = round + RECAPTURE_IMMUNE
  if actor != captive.owner and both oath-free and BOTH CONSENT: forgeOath(actor, owner, via:'ransom')
```
- **Resource-negative to the pair** (the sink) → no value-neutral laundering loop (stress-test E2).
- **Recapture immunity** + a freed-piece "rallied" defense bonus → kills the recapture grief pump (E1).
- **Captive guard cap:** a captor may hold ≤ `CAPTIVE_GUARD_CAP` per living Marshal/stronghold; over-cap
  captives must be ransomed/traded/released → holding hostages costs attention (the snowball brake, §5.4).
- **Captive-on-captor-death:** captives are **freed to their original owners** (never folded into spoils).

### 5.4 The snowball brakes (catch-up is capture-side, not a subsidy)
"Leading is dangerous" (Crown surcharge + dark hunts the leader) is the ONLY general catch-up. Because the
capture economy is super-linear, the spec adds **capture-side** brakes (NOT a comeback subsidy — that would
re-create the Broken Court we deleted): the captive **guard cap** (§5.3), **no free spoils** (eliminated
cards → dark/sink, §5.5), **captured Stewards produce for nobody**, **resource-negative ransom** + **recapture
immunity** (§5.3). If the sim still shows runaway elimination, the fallback is a **capture-side underdog
lever** (ransom subsidy / bounty on the leader's captors), never a return of Broken Court.

### 5.5 Elimination, the strike pool, and residual agency
> `[hardened — §13 P0-4/P0-8/P0-9]` The strikePool is now capped+decaying with a defined power formula; the
> Wraith scores on the dark's progress and steers only the dark's existing target (no revenge-laser); the
> Death-Curse targets the leader/oathbreaker/beneficiary, never "whoever took the last stronghold." The prose
> below is the first pass.
- **Trigger (single, deterministic timing):** a Warlord is `deposed` when it holds **zero living
  strongholds** OR its last stronghold is taken in Reckoning. Depose sets a flag; **elimination resolves
  only at DAWN, in seat order** (`resolveDeposals`) — no mid-action hand-cascades.
- **The dark can eliminate too:** a landed strike / DK that takes a last stronghold deposes its target;
  `applyReckoningAutoPressure` lets the dark depose table-wide late (§6).
- **No free spoils:** an eliminated player's hand → the **`strikePool`** (or removed-from-game; never to the
  eliminator, never reshuffled into the deck — §7). The strike pool adds power to future dark strikes and is
  the wraith's ammunition.
- **Death Bequest (the exit beat):** at elimination the player makes ONE final choice — **bequeath** a held
  captive or remaining cards to a living player (forging a posthumous Oath), **OR** **Death-Curse** their
  killer (the dark's grudge-steer points `CURSE_GRUDGE` harder at that player for the rest of the game).
- **Wraith (the afterlife):** the eliminated Warlord joins `shadowking.wraiths`; each round it gets ONE
  bounded input — nudge the dark's target/grudge by one step, OR add one visible card from the strike pool
  to the telegraphed strike. **Capped** (`WRAITH_INPUT_CAP` total across wraiths) so wraiths can't co-pilot
  the dark into an instant win. Determinism: a wraith input is a scripted/AI `f(state,seed)` choice like any
  other, resolved in elimination-seat order.

### 5.6 Kill the Dark (the heroic two-act climax)
- **The heart** spawns as a real on-map node at the **Reckoning** crossing (`shadowking.heart`), with a
  public **HP track** (`HEART_HP`).
- **ASSAULT_HEART:** commit a force (pieces + Banners + a card sink) over **2–3 telegraphed rounds**; each
  commit lands a visible hit; the dark **retaliates by name**. Committed pieces **cannot also defend your
  homeland** — the opportunity cost is the real cost (a failed assault can let the tide eat your lands).
- **On HP→0 (the dark falls):**
  1. The apocalypse clock is removed (no more Blight advance / strikes); all black forces banished; captives
     held by the dark freed to owners (cf. v2 Lost-Fortress win).
  2. **Two-act ending — short & sharp:** a hard **`POST_DARK_ROUNDS` (2–3 Dawn) clock**, Gambit-style, to a
     final Territory/Gambit resolution among survivors. The **raid-leader is deliberately disadvantaged**
     (spent force) so heroics don't auto-win; the villain's **dying bark telegraphs the betrayal** so the
     turn is foretold, not an anticlimax.
- Tuned **rare and costly** — its *threat* shapes negotiation even when it doesn't fire (like the Gambit).

### 5.7 The Shadowking policy, Oaths, the Gambit — UNCHANGED from v2
The telegraphed reactive policy (target precedence, grudge/Ledger, acts, the in-round voice layer), Oaths +
the Ledger, and the Crown's Gambit are reused from `DESIGN-V2-ALGORITHM.md §5.4/§5.6/§6`. **Additions:** the
voice layer gains barks for the new systems (capturing a DK, a ransom, a rival-caused elimination, the
heart assault — focus-group §3.5); the grudge array also receives the **Death-Curse** nudge (§5.5).

---

## 6. Win & loss conditions (rewritten — `all_broken` replaced)

Check order fixed and deterministic; **loss preempts win**; all snapshots post-escalation, seat order.

### Wins
- **Last Warlord standing** *(new, from elimination)* — one living Warlord remains → that player wins
  (subject to loss-preempt).
- **Territory** *(as v2)* — most living production at `ROUND_CAP`.
- **The Crown's Gambit** *(as v2 §6)* — hold the Keystone the named round. **Heart win-gate
  (Stage 5h, §5.6):** the throne cannot be claimed while the dark's HEART still beats beneath it —
  while the heart is **exposed at the Keystone** (its HP > 0 in Reckoning), a Gambit can neither be
  **declared** (named) nor **converted** to a win; the claimant merely garrisons a contested
  crossing. This removes the *incidental* throne-wins of heart-assaulters who sit the Keystone to
  break the heart (the heart/Keystone conflation): to take the throne in Reckoning you must first
  **Kill the Dark**, whose collapse displaces the raid force off the crossing (§13 P0-7) and opens
  the post-dark scramble. A Gambit that converts **before** Reckoning (the heart has not yet risen)
  or **after** the dark falls is unaffected — so the deliberate Gambit stays a live, special play
  while the cheap incidental win is gone.
- **Kill the Dark → the scramble** *(new, §5.6)* — slaying the dark removes the loss clock and triggers the
  short two-act resolution; the *winner* is whoever wins that resolution, not automatically the raid-leader.

### Losses (no draws)
- **Doom Complete** *(as v2)* — the dark ashes the Keystone → Shadowking win (Blood-Pact traitor wins unless
  exposed). Checked every Dawn, after escalation, seat order; **preempts** all wins.
- **Attrition (the `all_broken` successor)** — if a Dawn would leave **zero living Warlords** (simultaneous
  final deposals, or the dark deposing the last) → **Shadowking wins by attrition** (traitor wins unless
  exposed). This is the explicit replacement for the removed `all_broken` path.
- **`applyReckoningAutoPressure`** keeps the dark a credible executioner: in Reckoning, if no ASSAULT_HEART
  is *live* (`[hardened — §13 P0-5/P0-6]`: liveness requires a real heart-hit that round, and the pressure
  targets the **most-hoarded / least-engaged seat first**, not table-wide-flat — it taxes the turtle, not
  the already-behind), the dark deposes strongholds — so the attrition win threatens the lead and the
  passive, restoring the low-player-count threat `all_broken` provided.

### Ordering edge-cases (RESOLVED — §12 table has the full list)
The load-bearing ones: simultaneous/last-two deposals → attrition Shadowking win; loss-preempts extended to
last-Warlord-standing; Gambit-win on the named Dawn preempted by a same-Dawn Doom Complete; an eliminated
Blood-Pact traitor **still wins** on a later `doom_complete` (their bargain was the ash) — see §12 #5.

---

## 7. Determinism contract (v2 §7 + v3 additions)

All of v2 §7 holds (single `SeededRandom`; frozen-then-ordered Pledge; one rotating ACTION pointer;
seat-index tie-breaks; loss-check order; one Act/Dawn). **v3 adds:**

- **D1 — Pre-bound hidden tokens.** Every discovery token's content is bound at setup as `f(seed, nodeId)`
  and frozen in state. A flip is a **reveal of pre-existing hidden state**, never a lazy draw from the live
  stream → claim-order-independent and **not save-scummable**.
- **D2 — Observable projection.** AI and human deciders read `observableState(state, viewerSeat)`, which
  redacts unflipped token contents. The engine resolves flips from full state. Hidden state is engine-only;
  **the AI must not see under the fog** (preserves fairness + the pure-policy contract).
- **D3 — Flip side-effects are slotted.** A Blight-seed flip inserts its front-delta at a **fixed point** in
  the §5.1-v2 net-front ordered sum; a flip-spawned DK acts only **next** THREAT.
- **D4 — Cards are removed-from-game, never reshuffled.** Eliminated/dark-routed cards leave the game (they
  do not re-enter the shared seeded deck — that would reorder the draw stream and break replay). Over-limit
  discards use a fixed rule (lowest card-id) or an explicit scripted owner choice — never an unseeded pick.
- **D5 — Elimination resolves at DAWN, seat order.** Depose is a flag set in ACTION; `resolveDeposals` fires
  at Dawn in seat order; simultaneity resolves by snapshot-then-seat-order (no mid-action cascades).
- **D6 — Wraith inputs** are pure `f(state, seed)` (AI) or scripted (human), resolved in elimination-seat
  order, capped by `WRAITH_INPUT_CAP`.

---

## 8. Mapping to current v2 code (remove / rebuild / reuse)

| v2 system | v3 action |
|---|---|
| `combat.ts` `checkBrokenState`, wounds→Broken, Holdings-ash-on-Broken | **REMOVE.** Replace with capture election (§5.2) + depose flag. |
| `actions.ts` `executeRescue`, `checkBrokenRecovery` | **REMOVE Rescue/recovery → REBUILD as `executeRansom`** (§5.3). |
| `sequencer.ts` Broken income/actions, recovery check, **`all_broken`** check; `reducer.ts` `all_broken` | **REMOVE.** Rebuild end-conditions: attrition + last-standing + auto-pressure (§6). |
| `types.ts` `isBroken/brokenSince/brokenRoundsConsecutive/wounds` | **REMOVE.** Add `isEliminated/deposed/court[]/captives[]/strikePool/wraiths/heart` (§2). |
| Tunables `BREAK_THRESHOLD, ACTIONS_BROKEN, BROKEN_INCOME_BONUS, BROKEN_MAX_ROUNDS, RESCUE_COST, RESCUE_TRIBUTE_BANNERS, LANDED_STRIKE_WOUNDS` | **REMOVE** (Broken-specific). LANDED_STRIKE becomes land-strip/depose pressure, not wounds. |
| Board graph, `SeededRandom`, the Pledge, Oaths, Gambit, Shadowking policy, AI scaffolding, the sim harness (`src/v2/sim/`) | **REUSE** (the sim re-balances v3 — §9). |
| `applyCommand` reducer, phase sequencer | **REFACTOR** for the new verbs (RAID-elect, RANSOM, ASSAULT_HEART, CLAIM-flips-token) + Dawn deposal. |

The court/capture/discovery/heart systems are **new build** on the reused substrate.

---

## 9. Tunable registry (v3)

**New levers (placeholders; sim sets values):** `CAPTURE_MARGIN`, `CAPTIVE_GUARD_CAP`, `RECAPTURE_IMMUNE`,
`RANSOM_COST`, `RANSOM_BANNERS`, `RANSOM_SINK_CUT`, `STEWARD_INCOME`, `DISCOVERY_RECRUIT_PCT` (+ seed/DK
split), `HEART_HP`, `POST_DARK_ROUNDS`, `WRAITH_INPUT_CAP`, `CURSE_GRUDGE`, plus Blight-thresholds for the
capture **severity ramp** and the **Reckoning auto-pressure**.
**Kept from v2:** `STARTING_HAND, HAND_LIMIT, ACTIONS_NORMAL, DK_*, BLIGHT_*, PUSHBACK, doomCost C, CROWN_*,
FULL_BLOCK_THRESHOLD, PATIENCE_*, FORGE_*, ROUND_CAP, GAMBIT_*, OATH_*, HERALD_*, SEALED_CORE_PLEDGE`.
**Removed:** the 7 Broken/Rescue tunables (§8).

**Re-balance note (CRITICAL):** retiring `all_broken` changed one of the dark's two win-paths, so the
Shadowking win-rate **band must be re-validated from scratch** in Stage V3-5 — do not assume v2's 18–22%
holds. New metrics the sim must add: elimination timing distribution (guard against round-2 *determination*),
captures/game, ransoms/game, named-retainer attachment proxy (capture→ransom-back rate), Kill-the-Dark fire
rate, **spectator dead-time distribution** (the UX risk — flag if any human is eliminated before
`ROUND_CAP × DEAD_TIME_FLOOR`).

---

## 10. Blood Pact (Layer B) — v3 interaction notes
Reused from v2 §10, with the elimination interactions pinned: an **eliminated traitor still wins** on a
later `doom_complete`/attrition (their bargain was the ash; §12 #5). The Wraith afterlife is *especially*
charged for an eliminated traitor (they actively steer the dark toward doom) — a deliberate, surfaced
tension; the accusation tools (Audit, Suspicion Log) are unchanged. Re-tune in a v3 5e-equivalent.

---

## 11. Deliberately deferred / open for the code sprint
- E (cards-under-pieces) and F (open trade market) remain **parked** (concept §4); revisit post-core.
- The exact archetype numbers/verbs and the seeded name pools are placeholders for Stage V3-5.
- Full co-op, async/mobile — deferred as in v2.

---

## 12. Edge-case resolution table (closes the judge's audit)

| # | Edge case | Resolution |
|---|---|---|
| 1 | Simultaneous deposals at one Dawn | Snapshot, resolve in seat order; resolving one never changes another's eligibility retroactively. |
| 2 | **Last two Warlords deposed at once** | **Shadowking wins by attrition** (the `all_broken` successor). Traitor wins unless exposed. |
| 3 | Elimination timing | Always at DAWN via `resolveDeposals` (depose flag set in ACTION). No mid-action elimination. |
| 4 | Eliminator hand > HAND_LIMIT | N/A — eliminated cards go to `strikePool`/removed, never to a player (no inheritance). |
| 5 | Eliminated Blood-Pact traitor | **Still wins** on a later doom/attrition. Surfaced, intended. |
| 6 | Captive when captor is deposed | **Freed to original owner.** Never folded into spoils. |
| 7 | Captured Steward/Herald passive | The captor gains **nothing**; stays off if traded. **Softened by §13 P0-3 (authoritative):** a captured/routed Steward still trickles `STEWARD_DENIED_TRICKLE` to its *owner* — denial is partial, not total. |
| 8 | Loss-preempts-win vs last-Warlord-standing | Doom Complete / attrition at a Dawn preempts a same-Dawn last-standing or Gambit win. |
| 9 | Gambit holder deposed on the named Dawn | Deposal (loss-side) resolves before the Gambit win-check → no win. |
| 10 | Kill-the-Dark vs in-flight dark deposal same Dawn | The heart dying is applied **before** the dark's deposal pressure → ending the dark cancels its pending kills that Dawn. |
| 11 | Eliminated player's standing Oaths | Dissolved cleanly; no oathbreaker grudge to the surviving partner. |
| 12 | Eliminated player's already-frozen pledge | Counts (spent regardless, as v2) — state it explicitly. |
| 13 | Whisper "killing blow" when court already down to Warlord | Strips land only; **cannot depose in Whisper** (opening protection) — the severity ramp forbids last-stronghold loss pre-March. |
| 14 | "Stronghold" definition / Keep-ashing without Broken | Stronghold = any owned living production node (Keep/Forge/Holding). Keep ashes only after its owner is deposed (§2/§6). |
| 15 | Tie-breaks after eliminations | All "tie → seat order" use lowest **surviving** seat. |
| 16 | Flip side-effect ordering / flip-spawned DK initiative | Fixed slot in the net-front sum; DK acts next THREAT (§7 D3). |
| 17 | **Hero deposed the Dawn the dark dies** (rival took their last stronghold) | Heart-kill resolves "remove loss clock + start scramble" **before** `resolveDeposals`; the raid-leader is **shielded from deposal** that Dawn. (Was the §12 gap #10 missed.) |
| 18 | Three clocks (`POST_DARK_ROUNDS` / `ROUND_CAP` / live Gambit) | Post-dark resolution is a **single named Dawn** that overrides `ROUND_CAP`; a Gambit named beyond it resolves at that Dawn. |
| 19 | CLAIM that flip-spawns a DK / Blight-seed | You **own** the claimed node; a flip-spawned DK co-locates (blocks *future* claims, acts next THREAT); a Blight-seed delta hits the **claimed** node — you own blighted land (real risk). |
| 20 | Severity gate authority | **Act-gated** (named/legible), not Blight-gated; Act-advance already keys off Blight+patience, so the two cannot disagree. |
| 21 | Multiple simultaneous assaulters | Hits stack; **largest cumulative committer** = the raid-leader for §5.6 penalties + by-name retaliation; ties → lowest seat. |
| 22 | Freed captive, owner dead / at zero strongholds | Owner dead → removed-from-game; owner alive but stronghold-less → held until they have one, else removed that Dawn. |
| 23 | Posthumous Bequest-oath vs oath-dissolve sweep | The Bequest-forged oath is **exempt** from the eliminated-player oath dissolve (it is meant to persist). |
| 24 | Wraith ordering / cap race (simultaneous eliminations) | Resolve in ascending **original-seat-index**; grudge/target nudges apply **before** telegraph, card-adds **after**, in one fixed sweep. |
| 25 | Over-cap captive forced-release | Lowest pieceId, to original owner, at Dawn. |
| 26 | "Killer" undefined for multi-turn / dark deposal | Killer = seat of the **most recent stronghold-stripping action**; dark-caused → curse redirects to the living **beneficiary** (nearest claimant of the ashed land). |

---

## 13. Stress-test hardening (V3-4 P0 fold — AUTHORITATIVE)

> These amendments override §§5–7 prose where they conflict. Each closes a P0 from
> `design-history/DESIGN-V3-STRESS-TEST.md`. Numbers are placeholders for Stage V3-5.

- **P0-1 — ROUT is a tempo loss, not removal.** A routed piece returns to its owner's nearest stronghold
  next Dawn, capture/rout-immune for `RECAPTURE_IMMUNE`. The *only* way to remove a piece from the game is
  CAPTURE-then-not-ransomed, which carries every brake.
- **P0-2 — Military catch-up lever (NOW, not fallback).** `CAPTURE_MARGIN` **rises with the attacker's
  standing**, and trailing seats get a defensive combat bonus vs the production leader's RAIDs. Catch-up now
  lives in the combat currency the snowball runs on — *not* a comeback subsidy.
- **P0-3 — Steward denial is partial.** Stewards defend at elevated grade on their home node; a
  captured/routed Steward still trickles `STEWARD_DENIED_TRICKLE` to its owner — denial can't freeze the
  board to the cap.
- **P0-4 — strikePool capped + decaying + defined.** ≤ `STRIKEPOOL_CAP` cards; oldest removed-from-game each
  Dawn; power = Σ(card.power); a strike consumes lowest-card-id cards first → terminal removed set. Decouples
  strike power from cumulative deaths (kills the chain-collapse) and makes it simulable.
- **P0-5 — Auto-pressure retargeted.** It deposes the **most-production / least-engaged seat first**, scaled
  by standing — taxes the turtle and the lead, never the already-behind. This is the meta-centering lever.
- **P0-6 — Assault liveness is real.** Suppressing auto-pressure requires a heart-hit **that round** + a
  minimum commit; a stalled/token assault does not count as live.
- **P0-7 — Raid-leader penalty in the win currency.** On the dark's death the heart's collapse **displaces
  the raid force off the Keystone**, and the raid-leader's committed pieces' home nodes count **un-producing**
  for the (single-Dawn, P0-18) post-dark resolution. The hero contests; isn't auto-win or auto-robbed.
- **P0-8 — Wraith de-weaponized.** It scores on the **dark's progress** (an underworld track) and steers only
  the dark's **existing target precedence (the board leader)** — intensity, not a chosen face.
- **P0-9 — Punishment decoupled from eliminating.** Death-Curse / Wraith-steer target the **board leader or an
  oathbreaker**, never "whoever took the last stronghold"; a dark-killed victim curses the living
  **beneficiary** (§12 #26) so the exit beat always lands.
- **P0-10 — Whisper protects against hopelessness.** A player's **last retainer cannot be captured in
  Whisper**, and a Warlord reduced below a threshold gets a one-time mid-game **Rally** (recover a piece /
  card swing).
- **P0-11 — Exposure is legible.** A persistent per-player **Exposure meter** (SAFE / can-lose-land /
  can-be-DEPOSED) updates the instant the Act gate moves, with a "the tide has reached you" beat one Dawn
  before depose unlocks; **projected combat margin is shown pre-commit** so the capture option is never a
  silent surprise.
- **P0-12 — Determinism clauses** (extend §7): **D2 amended** — `observableState` also redacts `seed` and any
  input sufficient to recompute hidden content; deciders may not call hidden-derivation functions; the
  pre-flip back-sigil is a **frozen field `sigil = g(content)`** with an exhaustively specified codomain (the
  only observable derived from token content). **D7** — strikePool semantics (P0-4) + conservation invariant
  `|deck|+|hands|+|strikePool|+|removed|` constant. **D8** — the Death Bequest is `f(state,seed)`/scripted,
  resolved in `resolveDeposals` in seat order. **D9** — hidden derivations use a namespaced sub-stream
  `SeededRandom(hash(seed, nodeId))`; `tokenId ≡ nodeId`; the Blight-seed bonus-recruit pre-binds under the
  same key.

**Carried to the code sprint as openRisks (P1):** wraith/curse concentration, ransom-direction kingmaking,
discovery bonus rewards the strong, unclocked negotiation dead-time, attachment-without-recourse, the
capture-worth-doing band, thin wraith engagement, and a **design-level per-turn time budget** (the RAID
elect-chain × 4 archetypes inflation). See the stress-test P1 list.

---

*This spec (as amended by §13) is the design-time target for the next-sprint rebuild. Stage V3-5 (sim) must
re-validate the Shadowking win-rate from scratch and watch three load-bearing metrics: the snowball↔turtle
balance, captures/elimination-timing in-band, and spectator dead-time.*
