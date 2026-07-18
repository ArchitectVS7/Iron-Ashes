# Iron Throne of Ashes — Game Design Document

> **This is the design authority for the game.** It describes *what the game is* and *why it is built
> this way*, in prose, for designers and anyone who wants to understand the whole.
>
> - For the **player-facing rules**, read [`USER-MANUAL.md`](USER-MANUAL.md).
> - For the **implementation spec** (pseudocode, determinism contract, state shape, reducer mapping),
>   read [`DESIGN-V2-ALGORITHM.md`](DESIGN-V2-ALGORITHM.md) — the engine spec this document sits above.
> - For the **exact numbers**, the single source of truth is [`src/v2/tunables.ts`](../src/v2/tunables.ts)
>   (`DEFAULT_TUNABLES`). Every value quoted below is pulled from there; if they ever disagree, the code
>   wins and this document is the bug.
> - The deliberation that produced these decisions (focus groups, stress test, the v1 post-mortems) lives
>   in [`design-history/`](design-history/). It is provenance, not authority.
>
> Status: balance is **locked and validated** (Phase 5 complete — Shadowking win ~20%, all bands pass,
> 2-seed stable). Mechanics that only a human table can judge are labelled UNTESTED here and tracked in
> [`archive-V2/human-playtest-checklist.md`](archive-V2/human-playtest-checklist.md).

---

## 1. The pitch

**"Save the world, or take it."**

One to four rival Warlords — any mix of human and AI — carve up a dying kingdom while an autonomous,
*telegraphed* villain called the **Shadowking** burns the map toward oblivion and hunts whoever leads.
Every round you face one tense choice with a single pool of cards: **spend them to hold back the dark, or
spend them to seize the throne.** Hold the most living land when time runs out and you win. Let the dark
consume the center and *everyone* loses — except, in the hidden-traitor mode, the one player who wanted
exactly that.

It is a 30–45 minute digital board game about **dynastic rivalry under a shared apocalypse**. The other
players are your rivals, but the dark is the reason you sometimes have to cooperate with them — and the
reason cooperating is dangerous, because the player who does the most to save the world is usually the one
about to win it, and the dark is watching the leader.

- **Players:** 1–4 humans. Empty seats are filled by AI Warlords, so a single human plays against three AI
  rivals; four humans can share the table; any mix in between works. (The engine models 2–4 seats; "one
  player" means one human among AI.)
- **Length:** ~30–45 minutes, ~12 rounds on average (hard cap at round 14).
- **No elimination.** A beaten Warlord becomes a dangerous comeback engine, never a spectator.
- **Fully deterministic.** The entire game is reproducible from a seed; all randomness flows through one
  seeded generator. This is what lets the AI be fair, the balance be measurable, and replays be exact.

---

## 2. The design spine (read this and you understand the game)

Three ideas carry the whole design. Everything else is in service of them.

**1. Your cards are pulled two ways at once.** You hold a small hand of cards (start with 4, cap of 6).
Those same cards are how you *pledge* against the Shadowking's next strike, how you *fight* rivals, and how
you make a desperate *last stand*. There is never enough. Every card you spend saving the world is a card
you didn't spend taking it, and vice versa. This single shared economy is the engine of every hard
decision.

**2. Doom is the map, not a counter.** There is no abstract doom meter ticking upward. The apocalypse is a
**Blight** — a tide of ash that spreads node by node across the board, burning territory permanently dead.
It has a *location* and a *direction*: it creeps inward from the edges toward the **Keystone** at the
center. You can point at the doom. You can see which of your lands it will eat next. And the center node it
is racing toward is also the throne — so the doomsday object and the prize are the same place.

**3. Leading is dangerous.** The player with the most land is the **Crown**, and the Crown is a target.
The Shadowking hunts the Crown by name. The Crown's pledged cards count for *half* when defending the
world. So pulling ahead paints a target on your back and makes you a worse defender — which means the table
is constantly, quietly negotiating over *who has to lead right now*, and nobody wants to be too far ahead
too early. This is the game's built-in catch-up mechanic, and it is a rule, not a feel.

If a new player only ever internalizes those three things, they will play the game correctly. Everything in
the sections below is a refinement of one of them.

---

## 3. The core loop

Each round is four phases, always in the same order. There is exactly one decision window per phase, which
keeps the game readable and — critically — keeps it deterministic.

> **THREAT → PLEDGE → ACTION → DAWN**, then repeat.

**THREAT — the villain telegraphs.** Before it acts, the Shadowking announces its next strike out loud:
*who* it is targeting (by name) and *what* it will do. It also announces where it is "turning its hunger" —
toward the current Crown's quadrant. Nothing is hidden. This is the table's cue to react, negotiate, and
sell each other out.

**PLEDGE — the heart of the game.** The strike has a **cost** (a card threshold `C`). Every player may
pledge cards toward meeting it. This is *not* a vote — there is no unanimity and no veto. Pledges are
**proportional**: meet half the threshold and you block half the strike. The Crown's cards count for half
(the defense surcharge). In the standard game the pledge window is **open and live** — everyone sees the
numbers move and can adjust until it freezes — so it plays as a staredown. (In hidden-traitor mode, and for
one special case below, it is sealed.) Whatever isn't blocked, lands: the Blight advances, and the named
target takes wounds.

**ACTION — you play your turn.** Players act one at a time in a fixed, disclosed order (this preserves
determinism — there is no true simultaneity). On your turn you get **2 actions** (1 if you're Broken),
spending per-round **Banners** to move and claim. Your menu: march a piece, claim land, raid a rival,
strike the dark, rescue a broken ally, swear or break an oath, recruit a retinue or a Herald, send a Herald
to parley, or pass. (Full verb list in §6.)

**DAWN — the world turns.** Banners reset and regenerate; hands refill toward the limit; broken players
check for recovery; the Blight makes its unavoidable baseline creep inward; the villain may **escalate** to
a harsher act; the Crown is recomputed; and victory is checked. Then the next round's THREAT begins.

The two economies map cleanly onto this loop: **Banners are tactical** (board movement and claiming, spent
and regenerated every round) and **Cards are strategic** (the Pledge, combat, and rescue, persisting
between rounds so that spending now is a real sacrifice later). Keeping them separate is deliberate — it
means "I'm strong on the board this turn" and "I'm strong against the dark this turn" are different kinds of
strength, and you trade between them across the whole game.

---

## 4. The board — the Closing Ring

The map is a **17-node concentric ring**, four-fold symmetric so that 2, 3, or 4 players always start fair
and the play space literally shrinks toward the middle as the game goes on.

```
                 [Keep N]──[Hold]──[Keep E]
                   │   ╲              ╱   │
                [Forge NW]        [Forge NE]
                   │      ╲      ╱      │
              [Approach NW]─[Approach NE]
                   │      KEYSTONE      │     outer ring : 4 Keeps + 4 Holdings (homes & claimable land)
              [Approach SW]─[Approach SE]     mid-belt   : 4 Forges (gate each approach, +3 income)
                   │      ╱      ╲      │      inner ring : 4 Approaches (chokepoints to the center)
                [Forge SW]        [Forge SE]   center     : 1 Keystone (the doom node AND the throne)
                   │   ╱              ╲   │
                 [Keep S]──[Hold]──[Keep W]
```

- **The Keystone** (1, center) is both the loss node and the throne. If the Blight ashes it, the world ends
  and everyone loses. If you can hold it for a full round under the dark's gaze, you win outright (the
  Crown's Gambit, §7). It is reachable only through the four Approaches.
- **Approaches** (4, inner ring) are chokepoints — the only routes to the Keystone. They are laterally
  linked, so a defender can shift between them. An enemy entering an Approach you hold cannot simply march
  through; they must fight (zone of control), and holding an Approach cheapens defending that quadrant.
- **Forges** (4, mid-belt) are the prime objectives: each produces **3** income (weighted ×3 toward the
  Crown count), each gates one quadrant's path to the center, and reclaiming one pushes the Blight back down
  that spoke. Marching into a *rival's living Forge* pays its owner a **toll** of 1 Banner — so holding a
  Forge taxes everyone who crosses your quadrant. Sworn allies pass free. The Forges are also laterally
  linked to each other, so flanking and side-to-side pressure exist.
- **Keeps** (4, outer corners) are the Warlords' pre-claimed homes. They cannot be ashed until their owner
  is Broken — your home is safe while you stand.
- **Holdings** (4, outer edges) are claimable land worth 1 income — the early land-grab.

The Blight enters at the four symmetric outer seams between the Keeps and converges inward along the spokes
(Keep-edge → Forge → Approach → Keystone). Crucially, the front is **steered**: each round the villain
accelerates the advance down *one* spoke, aimed at the Crown's quadrant. So the ring stays geometrically
fair, but there is always a hot, moving, directional front — and it rotates toward whoever is winning.

Ashed nodes are **traversable at extra cost**, not impassable. This is a deliberate choice: if ash walled
the board off, a Gambit-holder could be stranded unreachable, and isolated survivors could simply wait out
the clock. A shrinking-but-crossable board stays tense instead of fragmenting into safe corners.

---

## 5. The Pledge in detail

The Pledge is the mechanism that replaced unanimity voting, and getting it right is the whole reason the
game works socially.

A strike's cost `C` scales with the current act and the player count (more allies, more total cards, higher
bar). Each player commits some number of cards from their hand. They are summed — the Crown's at half
weight — and compared to `C`. The fraction met is the fraction of the strike averted; the rest lands. Cards
are spent whether the strike is blocked or not.

This produces the exact properties the design wants:

- **No veto.** One defector hurts the table but cannot single-handedly doom it, because blocking is
  proportional. This kills the kingmaking pathology of unanimous voting, where any one player could hold the
  whole table hostage.
- **The leader is the worst defender.** The Crown most *wants* a full block (it's the target) but
  contributes least efficiently (half weight). So the table negotiates: *you're ahead, you spend.*
- **Free-riding is punished, not rewarded.** The naive exploit is "pledge nothing, let someone else cross
  the threshold." Three things stop that from dominating: (a) the averted fraction shields a *contributor's*
  own frontier land first, so a free-rider's land eats the strike; (b) every non-zero pledge earns a small
  persistent goodwill that lowers your grudge with the dark; and (c) the baseline Blight creep at Dawn
  happens *regardless* of the round's pledge, so passivity is slowly lethal to everyone. This was the single
  biggest balance risk in the design, and the sim confirms it is solved — free-riding never becomes the
  dominant line at any player count.
- **Cooperation angers the dark.** When the table fully blocks a strike, the Shadowking's **patience**
  ratchets up; when it fills (at 3), the villain escalates. You can hold the line, but holding it perfectly
  every round only makes the dark meaner — there is no stable equilibrium where the world is safe.

**One exception to "open and live":** when a player has seized the Keystone for a Gambit (§7), *that
player's* pledge becomes **sealed** even in the standard game. The idea is that the exposed gambler
shouldn't be perfectly readable while the table decides whether to bail them out or feed them to the dark.
Whether this sealed beat *feels* like the intended dilemma at a real table is UNTESTED — the balance reason
for it stands regardless.

---

## 6. The action verbs

On your turn you spend actions (2 normal, 1 Broken) and Banners. The verbs, grouped by what they're for:

**Hold ground and grow.**
- **March** — move a piece one node (1 Banner). Marching into a rival's living Forge also pays its owner a
  1-Banner toll; crossing ashed ground costs 1 extra; sworn allies cross each other's Forges free.
- **Claim** — take the unclaimed Holding or Forge you're standing on (1 Banner). Blocked if a Death Knight
  sits there — you must kill it first.
- **Recruit** — bring out a retinue piece (more strength, act in more places) or a **Herald** (§8, the
  political build).

**Fight.**
- **Raid** — attack a co-located rival. Combat is deterministic base strength plus however many cards each
  side *secretly* commits, revealed at once. Ties go to the defender. The loser takes wounds toward Broken.
- **Strike** — attack a co-located Shadowking force. Killing a **Death Knight** is one of the best plays in
  the game: it claims the node the knight died on (real win-currency), drives the Blight back down that
  spoke, and clears a square that the knight was blocking. Striking the dark is never punished on a tie
  (cards are returned) — heroism shouldn't be a coin-flip loss.
- **Last Stand** — when you would lose a stronghold, you may pour in *any* number of extra cards for a
  one-sided, final heroic reversal. Win and you hold the node *and* push back the tide; lose and the node
  falls and those cards — the ones you needed for next round's Pledge — are gone. It is the game's biggest
  gamble, and you choose its size.

**Make and break bonds (§9).**
- **Swear Oath** — a free, public non-aggression pact with another player.
- **Break Oath** — renounce one (costs an action); the dark marks you for it.

**Help the desperate.**
- **Rescue** — un-break a co-located or adjacent broken ally for 1 card. They pay you 2 Banners in tribute,
  and the act forges an Oath between you. Rescue is a *deal*, not charity.

**Reach the dark without cards.**
- **Parley** — a Herald-only, non-card pushback against the Blight (§8).

**End.**
- **Pass** — stop acting.

---

## 7. Winning and losing

There are two ways to win and two ways for everyone to lose. The check order is fixed and deterministic:
loss is always checked before victory, so the world ending preempts any player's claim to have won it.

### The default win — Territory

Most games end here. There is a fixed, common-knowledge **round cap** (round 14). At the final round's
Dawn, the living player with the **most living production** wins — land you own, with Forges counted triple.
Ties break by a fixed deterministic ladder (most living territory, then fewest ashed tiles next to your
holdings, then most Banners, then earliest seat). No coin flips, ever.

The cap is fixed and public precisely so the leader can't pull a self-timed snapshot to lock in a win — the
clock belongs to the game, not to whoever's ahead.

### The dramatic win — the Crown's Gambit

The bold alternative: take the throne directly. It fires in roughly **one game in six to eight** — rare
enough to be an event, common enough that its *threat* shapes negotiation in every game.

1. **Seize.** During Action, march a force onto the Keystone (only via an Approach).
2. **Named.** If you still hold it at Dawn, the Gambit goes public and the dark **names you** — next THREAT
   it comes for you no matter who's leading. The whole table gets a round to break you: raid you off,
   out-position you, or withhold pledges to feed the dark straight at you.
3. **Win.** Survive holding the Keystone to the *next* Dawn and you win immediately.

It costs exactly two things, deliberately kept few so the play is actually pressable: your pledged cards
count for their *worst* weight (a quarter) while you sit the throne, and your forces are pinned to the
center so you can't firefight the Blight elsewhere — a failed Gambit can let the tide eat your homeland.
While the Keystone is garrisoned the dark *cannot* ash it directly (no instant everyone-loses); it strikes
your neighboring lands instead. The would-be claimant only seizes when they're holding enough cards in
reserve to survive the named round — this "cover-or-don't-jump" gate is what keeps the Gambit from firing
recklessly, and it is the main reason the sealed pledge (§5) exists.

### The two losses (no draws)

- **Doom Complete.** The Blight ashes the Keystone. The world ends; everyone loses (in hidden-traitor mode,
  the traitor wins). This is the dark's main win path.
- **All Broken.** Every living Warlord is Broken at once — a whole-table collapse counts as the dark
  prevailing by attrition, not a draw. It is the dark's *minority* path (~10% of its wins); the assault on
  the Keystone is the main story.

There is no stalemate. Passivity doesn't preserve a draw — the unavoidable Dawn creep means turtling is
just a slow loss for everyone.

---

## 8. The Shadowking — a character, not a deck

The villain is the most-engineered part of the design, because a faceless behavior deck gets solved by hour
two and the cooperative tension deflates with it. So the Shadowking is a **transparent, telegraphed policy**
that reads the live board — deterministic enough to be fair and simulable, reactive enough that it can't be
memorized into irrelevance.

**It hunts by name.** Its target each round, in strict precedence: a live Gambit claimant first, else the
player it most resents (highest **grudge**), else the Crown. Ties break by lowest seat — never by dice.

**Grudge is a public, steerable weapon.** Wounding the dark — killing Death Knights, reclaiming Forges —
raises *your* grudge, shown as a public meter, decaying slowly and capped. So players literally steer the
villain at each other by goading it. The crucial twist that makes this work: the "now it hunts you" tax is
paid **only by the leading one or two seats**. A trailing player can hunt the dark for land and pushback
almost free; the leader who does the same paints the target on their own back. This is what turned
dark-hunting from a thing players never did (zero kills per game in early builds) into a real, ~2-per-game
play — *and* kept "leading is dangerous" honest.

**It remembers betrayal.** That same grudge array is the **Ledger**: breaking an Oath jumps your name up
it, so renouncing a pact is a public provocation the dark notices and answers. The villain is the enforcer
of the table's broken promises.

**It changes the rules as it escalates.** Three acts, advanced by how much of the map has burned (3 ashed
nodes → March; 7 → Reckoning) or by its patience filling:
- **The Whisper** — it mostly threatens and nibbles edge land; small strikes; an ominous voice.
- **The March** — Death Knights make deep raids toward the throne; the Blight spreads faster.
- **The Reckoning** — every round it acts harder; a "Reaping" can hit every exposed border stronghold at
  once; doom accelerates; a visible point of no return.

Each act crossing is meant to be a named, full-screen beat that changes the board's mood, not just a number
ticking up. And the villain *speaks throughout* — barking when it earns a grudge, when a thin pledge lets a
strike through, when a leader falls, when it takes a wound — so it reads as a presence at the table, not an
announcer that talks once and goes quiet.

**The dark can break you directly.** When its strike lands un-averted on its named target, that target takes
wounds (scaled by how much got through). This matters: it means the dark itself, not just your rivals, can
crack a Warlord — which is what gives the rescue economy something to run on, and what makes "leading is
dangerous" actually hurt.

---

## 9. The social layer — Oaths, the Ledger, and no-elimination

The game's late additions all serve one goal the early builds lacked: **persistent, witnessed, betrayable
relationships.** Without them, every interaction was a one-shot transaction that evaporated, and the table
felt mechanically cold even when it was numerically balanced.

**Oaths** are public, breakable, two-player pacts. Swearing one is free — the cost is the risk. While
sworn, the pair cannot raid each other, their Forge tolls are waived, and each draws a small fealty
dividend (1 Banner) at Dawn. An Oath left honored to maturity (after 3 rounds) dissolves cleanly and pays
both a loyalty bonus (2 Banners). **Breaking** one costs an action, hands the breaker a one-time Banner
burst (2) and the freedom to attack — and marks them on the Ledger, so the dark turns toward the
oathbreaker. A typical game sees roughly 6 oaths sworn and 3 broken: a living web of alliances and
betrayals. Oaths are the cooperative spine that the rescue bond and the Forge-toll exemptions both hang
off.

**Broken Court — no elimination, with teeth.** A Warlord who takes enough wounds (6) Breaks: a cracking
shield, not a separate penalty economy. Broken, you act less (1 action) but earn *more* income (a comeback
subsidy of 2 Banners, which decays each round you stay down so it's a ramp, not a home) and you keep **full
Pledge rights** — being beaten never silences you against the dark. You can still raid, strike, and make a
Last Stand. Your *lost* lands turn to ash and feed the front, so beating a rival into the ground hurts the
whole table. You auto-recover after 2 rounds, so no one becomes a permanent kingmaking hostage. And while
Broken you can't be the Crown and your subsidy decays — so self-breaking to dodge the Crown's target is not
a viable strategy.

**Rescue** ties it together: spend a card to un-break an adjacent ally, take their Banner tribute, and forge
an Oath in the act. The Oath's non-aggression *is* the obligation — turning on your rescuer is oathbreaking,
which the dark punishes. Rescue volume is naturally capped near ~1 per game, because you can only rescue
someone the dark or a rival actually broke, and frequent breaks feed the all-broken loss faster than rescues
can offset.

---

## 10. The Herald — the political build (advanced)

Most Warlords fight with steel. A **Herald** trades steel for words. Recruiting one (4 Banners) commits you
to the political stance: **+1 to your hand limit** (more cards to pledge and fight with) but **−1 combat
power** (you're a worse fighter — bodies off the board). It is the hand-vs-board, diplomat-vs-warrior axis.

The Herald is also a **literal, vulnerable piece**: a lone runner that spawns at your Warlord and marches on
its own toward the blighted front, where it can **Parley** — a non-card pushback against the dark. But a
rival Warlord or a Death Knight that catches it captures it at Dawn, and you revert to the martial default
(re-recruitable afterward). It is meant to be a *scene* the table watches — "will the runner make it?" —
escort-and-intercept tension a simple stance flag couldn't deliver. It fires rarely (about 1.4 captures per
game); whether that rare scene actually lands as drama at a human table is UNTESTED.

This is the most advanced single system in the game and the most reasonable one to learn last.

---

## 11. Blood Pact — the hidden-traitor mode (optional)

Blood Pact is a separable mode layered over the standard game; with it off, none of this exists and the core
is fully playable. With it on, **one human player is secretly the traitor**, who wins if and only if the
Keystone is ashed (the world ends) *without* being correctly accused. The AI never holds the Pact.

The traitor's problem is that a single defector's thin pledge can't doom the world alone — so the dark
**burns hotter** when a Pact is at the table (an extra Blight step each Dawn), giving the traitor a real path
to the apocalypse. Their dilemma each round: pledge into the middle tier to **pass as loyal** (which
genuinely helps the table block — the price of hiding) or **suppress** to feed the dark (the detectable
tell). Pledging *nothing* is what reads as suspicious; merely pledging *low* is honest thrift everyone does,
so it isn't evidence.

The loyalists' tools: the pledge reveal shows only the **aggregate** total (the traitor hides in the noise);
a **Suspicion Log** of each player's recent pledge tiers; an **Audit** (spend 2 Banners to expose one
rival's last pledge — buy evidence); and an **Accusation**, which all other living Warlords must agree to.
Correct, and the traitor is exposed (wounded, their win converted, the front pushed back); wrong, and the
accusers pay cards, the innocent is vindicated and rewarded, and a cooldown stops accusation spam. A wrong
call is a real gamble that also gives the true traitor cover.

The sim validates the *incentives* here — a real ~1-in-5 traitor, usually caught (~70%), with skillful
(~70%-accurate) deduction. But the accusation *gamble* and the Audit are things only humans engage with (the
AI doesn't weigh the wrong-call cost or pay for Audits), so whether they create genuine white-knuckle "are
we sure?" tension at the table is UNTESTED.

---

## 12. Player counts — three games in one

The dark's win rate is a **pooled** 18–22% target across counts; the per-count gradient is a feature, not a
defect, because the Pledge's blocking power scales with the number of allies. The locked design names the
three textures rather than flattening them — the only invariant is that the dark stays a *credible* threat
at every count (each per-count rate sits in roughly 16–24%).

| Count | Name | Texture |
|---|---|---|
| **2** | The Duel | A duel against a third party that can win — survival-horror stakes; the dark is a real threat. |
| **3** | The Triumvirate | The balanced middle, and currently the dark's strongest count. |
| **4** | The Carve-up | The rivals are the danger; the dark is weather you weaponize via grudge and steering — its weakest count. |

---

## 13. Design pillars (non-negotiable)

These are commitments, not preferences. Changing one is a redesign, not a tweak.

1. **Doom is the map.** The apocalypse is spatial — spreading ash with a location and a direction — never an
   abstract counter.
2. **Leading is dangerous.** Progress must paint a target on the leader and tax their defense. Catch-up is a
   rule, not a feel.
3. **The Pledge has no veto.** Cooperation against the dark is proportional and partial; one defector can
   hurt but never hold the table hostage.
4. **Broken Court never loses Pledge rights.** A beaten player is always a participant against the dark.
   (This must have automated test coverage.)
5. **The villain is a telegraphed character.** It announces, hunts by name, remembers, and escalates the
   rules — it is never a faceless random deck.
6. **No elimination.** Being beaten is a comeback state with a recovery cap, never a spectator chair.
7. **Total determinism.** The whole game — including every AI decision — is a pure function of the seed.
   Same inputs, same game, always. All randomness flows through `SeededRandom`; `Math.random()` appears
   nowhere.
8. **One core, optional layers.** The competitive game stands alone, fully playable and balanced. Blood Pact
   is a flag on top of it, never woven into it.

---

## 14. Where the numbers live, and what's still unproven

**The numbers.** Every balance value is in [`src/v2/tunables.ts`](../src/v2/tunables.ts) (`DEFAULT_TUNABLES`),
the single source of truth, validated over the real engine and real AI by the deterministic balance sim
(`npm run sim`). The per-stage evidence trail is in
[`archive-V2/stage5-tuning-log.md`](archive-V2/stage5-tuning-log.md). This document quotes those values for
readability; the code is authoritative.

**What the sim proved:** the macro balance (dark win ~20% pooled and credible at every count, ~12-round
sessions, no dominant strategy, free-riding unrewarded) and that every mechanic *fires* in play (oaths,
tolls, DK-hunting, Heralds, rescue-oaths all occur at intended rates).

**What only a human table can prove** (tracked in
[`archive-V2/human-playtest-checklist.md`](archive-V2/human-playtest-checklist.md)): that the sealed Gambit pledge *feels* like a
dilemma; that a 2–4p game actually finishes in 30–45 minutes after the verb count grew; that the Blood Pact
accusation gamble and Audit create real table tension; and that the Herald's lone run reads as a scene. The
sim can measure incentives; it cannot measure fun. These ship **labelled**, not silently assumed.

---

*Design lineage: this game is the v2 ground-up redesign of an earlier build whose post-mortems
(`design-history/REDESIGN-ANALYSIS.md`, `design-history/ML-SYSTEM-ANALYSIS.md`) diagnosed why it failed. The
core was forged across three focus-group rounds and an adversarial stress test (`design-history/`), then
balance-tuned to lock over Phase 5. The next milestone is the human playtest and the v2 frontend.*
