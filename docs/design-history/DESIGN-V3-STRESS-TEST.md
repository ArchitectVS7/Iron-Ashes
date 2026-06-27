# Design v3 — Adversarial Stress-Test (break the spec)

> Status: **Stage V3-4 deliverable** — the pre-code adversarial audit of `DESIGN-V3-ALGORITHM.md`. P0 fixes
> are folded back into the algorithm spec (and the concept's meta note); P1/P2 live here as the punch list
> the code sprint must carry. Design-only.
> Date: 2026-06-26
> Method: Three isolated-context breakers, no cross-talk — a balance/exploit breaker, a
> determinism/edge-case breaker, and a player-experience/pacing breaker. Each read the **complete** v3 spec
> with a mandate to break it. Their findings are de-duplicated into a severity-ranked punch list.
> Breaks: `DESIGN-V3-ALGORITHM.md`. Folded into: that spec's §5–§7/§12 (see "Resolution" column).

---

## The headline

The redesign's intent survives, but the breakers proved the **first spec pass over-fixed the snowball and
under-fixed three other failure modes**:

1. **The brakes are economic; the dominant engine is military.** Every snowball brake binds the *capture*
   verb and the *economy*; the optimal line routes through **ROUT** and **Marshal tempo + denial**, which no
   brake touches. (Balance breaker.)
2. **The anti-snowball stack quietly created a turtle meta.** "Leading is dangerous" + eliminator-punishment
   + explore-risk + a flat table-wide auto-pressure that *rewards the biggest hoarder* together make
   *build-quietly-and-coast* dominant. The spec spent all its energy on the snowball and never saw the
   passivity it built. (UX breaker + balance breaker converge.)
3. **Two new subsystems are non-deterministic and so cannot even be simulated** — the **strikePool** (no
   set→power formula, no consumption order) and the **observable projection** (leaks `seed`, so the fog is
   cosmetic). Stage V3-5 would be measuring noise. (Determinism breaker.)

All three are convergent across at least two breakers. They are **P0**.

---

## P0 — fatal / convergent (folded into the spec before code)

| # | Hole | Mechanism | Resolution (folded) |
|---|---|---|---|
| **P0-1** | **ROUT bypasses every brake.** | ROUT was undefined, needed no margin, carried no guard-cap / no ransom-recovery / no immunity → strictly dominant over CAPTURE for a denial leader; the "hostage economy self-balances" thesis evaporates because the optimal play never makes a hostage. | **ROUT redefined as a tempo loss, not a removal** (§5.2): a routed piece returns to its owner's nearest stronghold next Dawn, and is capture/rout-immune for `RECAPTURE_IMMUNE`. Removing a piece from the game is *only* CAPTURE-then-not-ransomed, under all brakes. |
| **P0-2** | **Snowball is military; brakes are economic.** | Crown surcharge taxes gold; the flywheel is a strong Marshal eating soft Stewards. The lead's *army* is never taxed. | **A military/tempo underdog lever added NOW, not as fallback** (§5.4): `CAPTURE_MARGIN` **rises with the attacker's standing** (leader must win by more to capture), and trailing seats get a defensive combat bonus vs the production leader's RAIDs. Catch-up now lives in the *combat* currency the snowball runs on. |
| **P0-3** | **Steward denial = win in a relative game.** | "Produces for nobody" removes the captor's *gain* but not the victim's *loss*; the Steward is both highest-value and softest target → "rout/capture the Steward first" is the dominant order with zero defensive compensation. | **Stewards defend at elevated grade on their home node, and a captured/routed Steward still trickles `STEWARD_DENIED_TRICKLE` to its owner** (§2/§5.4) — denial is partial, not total, so it can't freeze the board to the cap. |
| **P0-4** | **strikePool is a monotonic accelerant AND undefined.** | Eliminated hands → dark pool with no cap/decay → elimination #2 comes faster than #1 (chain-collapse toward an *attrition* loss, not a player win). And no set→power formula or consumption order → replay-breaking + un-simulatable. | **Cap + decay + a defined formula** (§5.5, §7 D7): `strikePool` holds ≤ `STRIKEPOOL_CAP` cards, oldest removed-from-game each Dawn; power = Σ(card.power); a strike consumes lowest-card-id cards first → terminal removed set. Decouples strike power from cumulative deaths. |
| **P0-5** | **Reckoning auto-pressure is inverted.** | Table-wide *flat* deposal removes a stronghold from everyone, so the player at zero first (the already-raided trailer) dies first, and the **biggest hoarder survives longest** → the one anti-passivity tool *rewards* the turtle and *accelerates* collapse toward the leader. | **Auto-pressure targets the most-production / least-engaged seat FIRST** (§6), scaling per-seat by standing. It now taxes the turtle and threatens the lead — the intended anti-passivity teeth. |
| **P0-6** | **Token assault suppresses auto-pressure for free; volunteer's dilemma kills path D.** | Auto-pressure fires only if "no ASSAULT_HEART is live"; a 1-Banner stalled assault disables it for free, and since the raid-leader is disadvantaged, *no one* rationally launches a real assault. | **Liveness requires a real heart-hit that round + a minimum commit** (§5.6); a stalled/under-committed assault does not suppress auto-pressure. |
| **P0-7** | **The raid-leader's "disadvantage" is in the wrong currency, and the heart sits on the throne.** | "Spent force" is a *combat* penalty; the post-dark win is *territory*; and the raid army is literally on the Keystone when the dark dies → instant Gambit/throne hold. An already-ahead player lands the final hit with surplus military and wins with land intact. | **Penalty moved to the win currency** (§5.6): on the dark's death the heart's collapse **displaces the raid force off the Keystone**, and the raid-leader's committed pieces' home nodes count as **un-producing** for the post-dark resolution. The hero contests; they don't auto-win and aren't auto-robbed. |
| **P0-8** | **The Wraith trades dead-time for a sanctioned grief-laser.** | In the base game the Wraith has **no win condition** + a per-round directed input + a personal **Death-Curse** target = textbook kingmaker with a precision tool aimed at whoever beat them. The cap only stops *multiple* wraiths; the common lone wraith is unconstrained. | **Wraith gets a self-interested score axis and depersonalized targeting** (§5.5): it scores on the *dark's progress* (an "underworld" track), and its steer is **constrained to the dark's existing target precedence (the board leader)** — intensity, not a chosen face. Revenge-laser severed. |
| **P0-9** | **Eliminator-punishment fights the last-standing WIN.** | The game says "eliminate rivals to win," but Death-Curse + Wraith-at-your-killer make *being the eliminator* a liability → killing-blow hot-potato, table stalls. And Death-Curse is **null when the dark kills you** (you can't curse the dark), so the marquee exit beat half-breaks exactly when the dark does most of the killing (Reckoning). | **Punishment decoupled from the act of eliminating** (§5.5): the Death-Curse / Wraith-steer target the **board leader or an oathbreaker**, never "whoever took the last stronghold." A dark-killed victim curses the living player who **benefited most** (nearest claimant of their ashed land) → the exit beat always lands. |
| **P0-10** | **"Doomed but not dead" in Whisper.** | Opening-protection forbids *depose* in Whisper but not *strip-to-the-bone*; a player can be reduced to Warlord + 1 stronghold with no path to win, then forced to play lost turns until March puts them down. Worse than a fast out (no Wraith toy yet, no exit beat). | **Whisper also caps court-stripping** (§5.2): a player's **last retainer cannot be captured in Whisper**, and a Warlord reduced below a threshold gets a one-time mid-game **Rally** (recover a piece / card swing). Protection now covers *hopelessness*, not just elimination. |
| **P0-11** | **The severity ramp is invisible → death by surprise.** | The Blight-gated continuous ramp is *less legible* than the Act cliff it replaced (a number players don't track vs a named Act). Exposure — the spec's own stated must-be-legible value — becomes a hidden continuous variable with no UI commitment; capture availability (`margin ≥ CAPTURE_MARGIN`) is likewise a pre-commit guess. | **Mandated legibility** (§5.2 + a UI clause): a persistent per-player **Exposure meter** (SAFE / can-lose-land / can-be-DEPOSED) that updates the instant the gate moves, a telegraphed "the tide has reached you" beat one Dawn before depose unlocks, and **projected combat margin shown pre-commit**. |
| **P0-12** | **strikePool/observable determinism violations.** | (a) `observableState` hands the AI `seed`+`nodeId`, so it recomputes redacted token content — fog is cosmetic. (b) the pre-flip "back-sigil" is a function of hidden content with an unspecified codomain → implementations diverge. (c) Death Bequest is a decider input not covered by §7. (d) "killer" is undefined for multi-turn/dark deposal. | **New/extended determinism clauses** (§7 D2 amended, D7–D9 added): redact `seed` + forbid hidden-derivation calls; the back-sigil is a **frozen `g(content)` field** with an exhaustively specified codomain; Bequest is `f(state,seed)` resolved in `resolveDeposals`; "killer" = seat of the most recent stronghold-stripping action, dark → curse redirects (§5.5/§12). |

---

## P1 — serious, carried to the code sprint (not blocking the design)

- **P1-1 — Wraith / curse target concentration.** Even depersonalized (P0-8), a wraith aiming the dark's
  *intensity* at the leader is decisive when two seats are close; let the cursed player **shed/decay** the
  curse via PARLEY/Herald.
- **P1-2 — Ransom direction is free kingmaking.** A near-dead player choosing *whom* to ransom-empower tips
  the winner; restrict ally-ransom to oath-partners, or accept-and-surface as intended.
- **P1-3 — Recapture immunity must cover ROUT** (closed by P0-1's "immune to capture/rout").
- **P1-4 — Discovery "bonus recruit" rewards the strong** (the leader clears threats best). Scale the
  bonus inverse to standing, or make the leader's DK-clear reward land-only.
- **P1-5 — Negotiation/ransom haggling has no clock** (Diplomacy's dead-time). Structured offer/response or
  a negotiation timer; otherwise ransom benches the table.
- **P1-6 — Attachment without recourse teaches "hide your good pieces."** A captured named retainer you
  can't afford to ransom is gone all game; give the owner a one-time **desperate-rescue** RAID bonus when
  down to few pieces.
- **P1-7 — Capture may not be worth doing** (the brakes may bite *too* hard → reinforces the turtle). A sim
  watch-metric: captures/game must stay in a live band, not collapse to zero.
- **P1-8 — One wraith click / ~4 min is thin engagement.** Accept it as a Bequest-led beat, or add
  touchpoints. UX, not balance.
- **P1-9 — Turn-time budget is punted to the sim.** Set a **design-level per-turn budget** before code; the
  RAID elect-chain (raid→resolve→elect→pick piece) × 4 archetypes is the inflation risk the UX lens flagged.

---

## Under-specified interactions the spec MUST state before code (determinism breaker §2)

Folded into `DESIGN-V3-ALGORITHM.md §12` as new rows (#17–#26):
1. **U1 — hero eliminated at the instant of victory** (rival takes the raid-leader's last stronghold the
   round the heart dies): the heart-kill's "remove loss clock + start scramble" resolves **before**
   `resolveDeposals`, and the raid-leader is shielded from deposal the Dawn the dark dies. (Highest-stakes
   omission — the §12 table *believed* #10 closed it; it did not.)
2. **U2 — three clocks** (`POST_DARK_ROUNDS` vs `ROUND_CAP` vs a live Gambit): the post-dark clock is a
   **single named Dawn** (P0-7 / UX P0-E) that overrides `ROUND_CAP`; a Gambit named beyond it resolves at
   that Dawn.
3. **U3/U4 — CLAIM-flip ordering**: you **own** the claimed node; a flip-spawned DK co-locates (blocks
   *future* claims, acts next THREAT); a Blight-seed front-delta hits the **claimed** node (you own a
   blighted node — the risk is real).
4. **U5 — Blight-gate vs Act-gate authority**: depose legality is gated on the **Act** (named, legible —
   UX P0-11), and Act-advance already keys off Blight+patience; the §5.2 "Blight-gated" wording is corrected
   to "Act-gated" so the two cannot disagree.
5. **U6 — multiple simultaneous assaulters**: hits stack; the **largest cumulative committer** is the
   raid-leader for §5.6 penalties and the dark's by-name retaliation; ties → lowest seat.
6. **U7 — auto-pressure magnitude / liveness** (closed by P0-5/P0-6).
7. **U8/U10 — freed captive whose owner is dead / has zero strongholds**: → removed-from-game (owner dead)
   or held until the owner has a stronghold, else removed at that Dawn.
8. **U9 — posthumous Bequest-oath vs the oath-dissolve sweep**: the Bequest-forged oath is **exempt** from
   the eliminated-player oath-dissolve (it is the one oath meant to persist).
9. **DH7 — wraith ordering/cap race**: resolve in ascending **original-seat-index** (not elimination order);
   grudge/target nudges apply **before** telegraph computation, card-adds **after**, in one fixed sweep.
10. **DH11 — over-cap captive forced-release**: lowest pieceId, to original owner, at Dawn.

---

## Verdicts

- **Balance breaker:** *the snowball is NOT solved* — define ROUT under the brakes, add a **military** catch-up
  lever, cap+decay the strikePool, retarget auto-pressure, fix the raid-leader currency. (All folded.)
- **Determinism breaker:** *not implementable as-is* — the strikePool semantics (P0-4/P0-12) and the
  seed-leak (P0-12) each independently break the "same seed ⇒ identical game" invariant; another spec pass
  was required. (Done — D2 amended, D7–D9 added.)
- **UX breaker:** *v3 tips toward turtle-until-Reckoning, not snowball* — the single best re-centering is to
  make the dark's pressure target the **most-hoarded / least-engaged seat first** (P0-5), converting the only
  anti-passivity tool from a turtle-reward into a turtle-punish.

**Gate decision:** with the twelve P0s folded into the algorithm spec, the v3 **design** is sound enough to
enter the code sprint — but **three things are now load-bearing for Stage V3-5 (sim)** and must be watched
from the first sweep: (1) the snowball↔turtle balance (captures/game and elimination-timing must both stay
in-band), (2) the re-validated Shadowking win-rate (the `all_broken` replacement changed the dark's
win-path), and (3) a real **spectator dead-time** metric (no human eliminated before
`ROUND_CAP × DEAD_TIME_FLOOR`). The P1 list rides into the code sprint as openRisks.
