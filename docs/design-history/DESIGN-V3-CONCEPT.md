# Design v3 — Concept & Pillars (the spine)

> Status: **Stage V3-1 deliverable** — the revised game concept that the v3 algorithm spec (V3-3) is built
> from. Design-only; no code this sprint (the engine rewrite is the next sprint).
> Date: 2026-06-26
> Method: a designer-led concept pass folding the *Shadowlord* comparison and the user's v3 direction into a
> revised spine. Pressure-tested next by the V3-2 focus group and the V3-4 stress-test.
> Inspiration honored: the 1983 board game *Shadowlord* — v3 deliberately moves **back toward its soul**.
> Supersedes (for v3 only): `../GAME-DESIGN.md` and `../DESIGN-V2-ALGORITHM.md` remain the **v2** authority;
> v3 docs are provenance until the code sprint promotes them.

---

## 0. Why v3 exists (the one-paragraph case)

v2 is structurally excellent and **better-engineered than its inspiration** — but it quietly became a
different *kind* of game. **Shadowlord is a ROSTER game**: you grow, protect, steal, bribe, and capture a
court of named, differentiated characters, and the drama is *"they bribed my Merchant," "I'm holding his
Warrior hostage."* **v2 is a TERRITORY game**: land under a spreading Blight, with nearly-fungible pieces
(one Warlord + a vague retinue + the Herald). It kept Shadowlord's *setting* and replaced its *engine*. v3
keeps every structural win v2 earned and **puts the roster back at the center** — a court you build, fight
over, capture, ransom, and can genuinely **lose**.

The user's decisive call: **the "no-elimination / Broken Court" comeback system is retired.** It reads as
squishy — high complexity, low payoff. Beaten now means beaten.

---

## 1. What survives from v2, and what is retired

The redesign is **subtractive at the core, additive at the texture.** v2's load-bearing structure is proven
(sim-validated, deterministic, fair); we do not relitigate it.

| v2 pillar | v3 status | Note |
|---|---|---|
| **Doom is the map** (spreading Blight → ash; the board shrinks) | **KEPT** | Still the spine of the apocalypse. |
| **The telegraphed AI villain** (Shadowking: announces, hunts by name, grudge, 3 acts, a voice) | **KEPT** | The most-engineered v2 system; untouched. |
| **The Pledge** (proportional block, no veto, Crown discount) | **KEPT** | Replaces voting; still the cooperative heart. |
| **Leading is dangerous** (Crown surcharge + dark hunts the leader) | **KEPT** — *now the ONLY catch-up* | See §6. |
| **Full determinism** (one `SeededRandom`, AI is pure `f(state, seed)`) | **KEPT** | Non-negotiable; the discovery layer (§4) must respect it. |
| **One core, optional layers** (Blood Pact as a flag) | **KEPT** | v3 core stands alone; Blood Pact rides on top. |
| **Banners (tactical) vs Cards (strategic)** two-economy split | **KEPT** | The roster spends both; see §3–§5. |
| **No-elimination / Broken Court** (subsidy, recovery cap, wound-meter, `all_broken` win) | **RETIRED** | Replaced by knockout (§5/§G). |
| **Rescue (un-Break an ally)** | **TRANSFORMED → Ransom** | Same verb-slot, new referent: hostages, not Broken (§4-B). |

**Retired v2 design commitments to rewrite:** Pillar #6 ("No elimination") and the CLAUDE.md commitment
"Broken Court never prevents Voting." Both are removed in v3.

---

## 2. The revised pitch

**"Build a court. Save the world — or take it. Don't lose your head."**

Two-to-four rival Warlords carve up a dying kingdom while the telegraphed **Shadowking** burns the map and
hunts whoever leads. But now you don't command an abstract banner — you command a **court of distinct
retainers** you grow by exploring the land, fight over, take hostage, and ransom back. Spend your cards to
hold back the dark or to seize the throne — and if your court is shattered and your Warlord is taken, **you
are out.** The bold can even march on the dark's heart and *end it* — then turn on each other for the
throne.

The emotional target v2 lacked and Shadowlord had: **attachment and loss.** You should care about your
Marshal because you recruited her, armed her, and watched a rival capture her — and you should fear the
board state where you have nothing left to lose because, in v3, that means you lose.

---

## 3. The design spine (read this and you understand v3)

Four ideas now carry the game. The first two are inherited; the last two are the v3 turn.

1. **Your cards are pulled two ways at once.** *(inherited)* One small hand pledges against the dark, fuels
   combat, and powers a Last Stand. There is never enough.
2. **Doom is the map.** *(inherited)* The Blight is a tide of ash with a location and a direction, racing
   the Keystone at the center — which is also the throne.
3. **You command a court, and the court is contestable.** *(new — recs A/B/C)* Your strength is a roster of
   **differentiated pieces** you grow by **discovery** and that rivals can **capture and ransom.** Pieces
   are people, not tokens — the source of attachment, intrigue, and table-talk v2 lacked.
4. **You can be knocked out, and you can kill the dark.** *(new — recs G/D)* Defeat is real: lose your court
   and your Warlord and **you are eliminated.** Victory can be heroic: assemble a force, assault the dark's
   heart, and **end the threat** — then the survivors fight for the crown.

If a player internalizes those four, they play v3 correctly. §4–§6 refine them.

---

## 4. The roster systems (the v3 core — A, B, C)

### A — The Court (differentiated pieces)
The retinue becomes a small **court of archetypes**, each with a distinct verb and a distinct vulnerability
— echoing Shadowlord's Warrior/Merchant/Diplomat without its bookkeeping. Working set (final mix settled in
V3-2/V3-3):

| Archetype | Echoes | Strength | Verb / role | Why it matters |
|---|---|---|---|---|
| **Warlord** (leader) | Star Master | high | your seat of action; **its capture = elimination** | the piece you must protect |
| **Marshal** | Warrior | high combat | the muscle; carries Last Stands | the fighter you build around |
| **Steward** | Merchant | low combat | generates Banners where it sits | the economy engine to protect/raid |
| **Herald** | Diplomat | low combat | political: `+hand`, Parley vs the dark, no-fight | inherited from v2; now one of several |

Design rule (kept from v2): **start minimal.** 3–4 archetypes max at launch; the mix is a tuning lever, not
a content treadmill. The point is *distinct decisions*, not a large bestiary.

### C — Discovery (grow the court by exploring)
The early game becomes a **land-grab with fog**: neutral Holdings carry **face-down recruit tokens** (the
Shadowlord disc-flip). CLAIM flips one — most reveal a retainer you add to your court; some reveal a **risk**
(a Blight seed that quickens the front in that quadrant, or a Death Knight that must be killed). This gives
expansion a reason beyond flat income, injects surprise, and **keeps the determinism contract**: the token
layout is just another seeded draw, reproducible from `seed` (§7 of the algorithm spec will pin this).

### B — Capture & Ransom (the fluid roster)
Combat no longer only deals "wounds toward Broken." A rival RAID that wins can **capture a piece** (not the
Warlord directly — see §5): the captive sits in the captor's hold, **produces nothing**, and becomes a
bargaining chip. This restores Shadowlord's best intrigue and gives the social layer something concrete to
trade. The hostage economy:
- **Ransom** *(the transformed Rescue)* — pay cards/banners to free a captive (yours or an ally's); freeing
  an ally's piece can **forge an Oath**, preserving the v2 rescue→Oath bond on a new referent.
- **Trade-back** — captives are tradable assets in the open negotiation layer.
- **Loss** — a captive whose owner is eliminated is freed-to-the-captor or removed (settled in V3-3).

> **This is the synthesis that makes the whole redesign coherent:** A gives you a court worth losing, C
> grows it, B makes it contestable, and G (next) makes losing it *final*. Rescue didn't die — it became
> Ransom, which is a *better* fit for a roster game than un-Breaking ever was.

---

## 5. Knockout — elimination, with the opening protected (G)

**The model: full elimination. An eliminated player spectates.** No comeback state, no subsidy, no recovery
cap, no wound-cushion. This is the purest Shadowlord stake and the user's explicit call.

- **Elimination trigger** *(candidates; V3-3 picks)*: your **Warlord is captured** (Shadowlord's
  capture-the-Star-Master), **or** you hold **zero living strongholds** at a Dawn. The Warlord is the last
  thing standing; reaching it means breaking the court around it first (which B/A make a process, not a
  single roll).
- **The dark can eliminate you too.** A landed strike or a Death Knight that takes your last stronghold
  removes you — so the Shadowking is a credible executioner, not just weather.
- **Where the cards go** *(Shadowlord-faithful)*: an eliminated player's hand transfers to whoever
  eliminated them (the dark **discards** them). A real spoils-of-war incentive.

**The hard constraint elimination creates — protect the opening.** "Eliminated → spectate" is lethal to a
30–45 min game if a human can be removed in round 2 and then watches for 25 minutes. So:

> **No elimination during the Whisper act.** Knockout unlocks only at **The March** (and bites hardest at
> The Reckoning). In Whisper, a "killing blow" instead *captures the court down to the Warlord* / strips
> land — devastating but survivable. The first act is for building and positioning; the knives come out when
> the noose visibly tightens.

This also dovetails with the kept catch-up (§6): taxing the leader slows the snowball that would otherwise
cause early knockouts. **The V3-4 stress-test's job #1 is to try to break the opening-protection rule.**

---

## 6. Win, loss, and catch-up

### Wins
- **Territory** *(inherited, the common ending)* — most living production at the round cap.
- **The Crown's Gambit** *(inherited)* — hold the Keystone a full named round.
- **Kill the Dark** *(new — D, the heroic climax)* — assemble a force, march on the dark's **heart** (the
  Blight source / a manifested Shadowking seat reachable in The Reckoning), and **defeat it.** Echoes
  Shadowlord's storm-the-Lost-Fortress raid. Resolution is **two-act**, exactly like Shadowlord: ending the
  dark does **not** auto-win — it removes the apocalypse clock and the survivors then fight for the throne
  (a final territory/Gambit resolution with the dark gone). Fills the emotional gap v2 has: in v2 you can
  only *delay* the dark; in v3 you can *beat* it. Tuned rare and costly (its **threat** shapes play even
  when it doesn't fire — like the Gambit).

### Losses (no draws)
- **Doom Complete** *(inherited)* — the dark ashes the Keystone; everyone loses (Blood-Pact traitor wins).
- **Last Warlord standing is also how the rival-game ends** — once elimination exists, a single survivor
  among the Warlords can win outright (Shadowlord's Master-of-the-Universe), subject to the dark not having
  won first (loss preempts).
- **`all_broken` is GONE** — its referent (everyone Broken) no longer exists. The dark's attrition win is
  now literal: it can **eliminate** Warlords directly (§5). V3-3 must re-state the Shadowking win-rate
  bands, since one of its two v2 win-paths was replaced.

### Catch-up
**"Leading is dangerous" is the only catch-up, by design.** The Crown surcharge + the dark hunting the
leader stay. No comeback subsidy returns. Rationale: it is *also* the snowball brake the elimination model
needs — the further ahead you pull, the more the dark (and the table) is pointed at you, which keeps the
trailing seats alive long enough to matter. If V3-4 shows runaway elimination despite this, the fallback is
a new underdog mechanic (bounties / sharper trailing-seat grudge-steer), **not** the return of Broken Court.

---

## 7. The open forks (gate to V3-2 / V3-3)

Settled here: the four resolved decisions (elimination+spectate, G+A+B+C+D core, full design arc, kept
catch-up). Still open, to be settled by the focus group and pinned in the algorithm spec:

1. **The exact archetype mix** (3 vs 4) and each one's numbers/verb.
2. **The elimination trigger** — Warlord-capture vs zero-strongholds vs both.
3. **Capture mechanics** — does a winning RAID *always* capture, or only on a margin / a choice? Can the
   Warlord ever be captured directly, or only after the court is stripped?
4. **The discovery risk mix** — recruit/Blight/Death-Knight ratios, and how a flip stays deterministic and
   non-feel-bad (a bad flip must not be a pure dice-loss).
5. **The "Kill the Dark" path** — what the heart *is*, when it unlocks, what force it costs, and how the
   two-act ending resolves with 2/3/4 survivors.
6. **Spectator dead-time** — beyond opening-protection, does an eliminated player get *any* residual agency
   (a haunt/curse, a single advisory pledge, nothing)? The focus group's social lens owns this.

The next document (`DESIGN-V3-FOCUS-GROUP.md`) convenes the panel on exactly these.

---

## 8. Post-stress-test note (added after V3-4)

The adversarial stress-test (`DESIGN-V3-STRESS-TEST.md`) found that the first design pass **over-fixed the
snowball and accidentally built a turtle meta**: stacking "leading is dangerous" + eliminator-punishment +
explore-risk + a flat dark auto-pressure made *build-quietly-and-coast* the dominant line. The single most
important conceptual correction: **the dark's pressure must tax the most-hoarded / least-engaged seat first**,
turning the only anti-passivity tool from a turtle-*reward* into a turtle-*punish*. The catch-up lever also
had to move into the **military** currency (the snowball is an army, not a treasury). Twelve P0 fixes are
folded into `DESIGN-V3-ALGORITHM.md §13`; this concept's spine is unchanged, but "leading is dangerous" is
now explicitly balanced against an equal-and-opposite "**hiding is dangerous**."
