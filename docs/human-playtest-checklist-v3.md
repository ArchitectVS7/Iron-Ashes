# v3 Human-playtest checklist — what the SIM can't validate

The deterministic sim validates *incentives and balance* (do the numbers move as intended?). It cannot
validate *felt experience* — drama, tension, attachment, table-talk, "was that fun?". This file lists the
v3 mechanics whose VALUE rests on a human claim the sim can't reach. Per the No-Deferred-Debt norm
(CLAUDE.md), they ship LABELLED, not silently assumed.

> **How to run:** `npm run dev`, open `/index-v3.html`. It's the FUNCTIONAL (unstyled) build — judge the
> *mechanics and legibility*, not the looks (the styled pass follows this playtest).
> **How to use:** walk each item, record the verdict (kept / changed / cut) back into
> `docs/DESIGN-V3-ALGORITHM.md` + `docs/ROADMAP-V3.md §8`. Items 1–2 are the two the stress-test flagged as
> the biggest risks — weight them heavily.

---

## 1. Elimination stakes + the Exposure meter — the core new tension

- **The claim:** real knockout (retire Broken Court) makes the game *matter* — but it's survivable because
  the court is stripped piece-by-piece (a visible siege), elimination is gated to The March+, and the
  **Exposure meter** (SAFE / can-lose-land / can-be-DEPOSED) + a one-shot "the tide has reached you" beat
  warn you before it's live.
- **Sim verdict:** dead-time proxy ~69% (most deaths late), early-death <7-round flag ~8.7%, **zero Whisper
  deposals** — the opening protection holds; deaths cluster in Reckoning.
- **What only a human can confirm:** that being ground toward elimination feels *fair and telegraphed*, not
  arbitrary — that you can SEE it coming on the Exposure meter and fight it, and that the Whisper "you can't
  die yet" opening reads as breathing room, not a lull. Watch: does anyone die feeling they had no warning?
- **If it falls flat:** the severity ramp / opening rule are tunable; the Exposure legibility (§13 P0-11) is
  the load-bearing part — if it doesn't read, elimination feels like a surprise death.

## 2. Spectator dead-time + the Wraith — the stress-test's #1 UX risk

- **The claim:** an eliminated player isn't benched — they become a **Wraith** serving the dark (one bounded
  input per round: steer the dark's target/intensity or add a strike card) and get a **Death Bequest** at the
  moment of death (bequeath to a standing ally, or Death-Curse). Agency, not a hallway.
- **Why the sim can't judge it:** it can measure *when* you die, never whether the afterlife is *fun*.
- **What only a human can confirm:** that a dead player stays engaged and *courted* by the living ("don't
  aim the dark at me"), that "serve the dark that beat you" is satisfying rather than a chore, and that ONE
  input per round is enough to not feel 90% idle. Watch: does the eliminated player lean in or check out?
  Does the Wraith feel like power or a consolation prize? Does the Bequest land as a final beat?
- **If it falls flat:** this is the most likely thing to need a redesign — more Wraith touchpoints, or lean
  harder on the Bequest as the real payoff. Flag it hard if the dead player is bored.

## 3. Capture-as-scene + the "Hold" rail — the Shadowlord-soul mechanic

- **The claim:** "they took my Marshal" is a *grudge with an address* — capture converts combat into a
  serialized story (attachment → loss → the ransom-back arc), with every hostage visible all game on the
  **Hold rail**.
- **Sim verdict:** captures ~0.35/game (rare-but-dramatic by design, per your call) — an event, not a loop.
- **What only a human can confirm:** that losing a *named* retainer actually stings, that capturing one
  feels like a coup (not bookkeeping), that the Hold rail makes hostages a live negotiation, and that the
  full arc — *meet a named retainer (Discovery) → lose her → bleed cards to ransom her back* — happens and
  lands. Watch: do players say the retainer's NAME? Do they scheme to get one back?
- **If it falls flat:** captures may be too rare to build attachment (loosen further), or the retainers need
  stronger identity (names/lines) to be mourned.

## 4. The two-act "Kill the Dark" ending — catharsis vs. anticlimax

- **The claim:** you can finally *defeat* the dark (v2 could only delay it) — then the survivors fight for
  the throne in a single named Dawn. The raid-leader is disadvantaged (spent force), and the villain's dying
  bark telegraphs the betrayal so the pivot is a *foretold turn*.
- **Sim verdict:** Kill-the-Dark fires ~10–22% (a rare climax whose threat shapes play).
- **What only a human can confirm:** that slaying the dark is earned catharsis, and — the DM's flagged risk
  — that the "now betray each other" pivot lands as a bitter turn rather than "that felt pointless." Watch:
  when the dark dies, does the table light up? Does the raid-leader losing the scramble feel like tragedy or
  a rug-pull? Does the single-Dawn coda feel sharp or tacked-on?
- **If it falls flat:** collapse the coda further, or bank a "Dragonslayer" edge so the hero contests.

## 5. Discovery — meeting named retainers + the fog

- **The claim:** you grow your court by *exploring* — CLAIM flips a face-down token and you *meet* a named
  retainer (or hit a risk); a partial back-sigil makes it press-your-luck, not blind.
- **What only a human can confirm:** that flipping feels like meeting a character (attachment starts here),
  that the fog reads clearly (you genuinely can't see unflipped tokens), and that a bad flip (Blight seed /
  Death Knight) feels like a *fair gamble you chose* — not a feel-bad that punishes exploring. Watch: do
  players explore eagerly or turtle to avoid bad flips?
- **If it falls flat:** the risk mix / the sigil telegraph are tunable; a bad flip must always leave agency.

## 6. The Pledge staredown + "coordinate or the dark eats you"

- **The claim:** committing cards against the dark's telegraphed strike is a tense, open staredown; and the
  noise finding proved fallible tables genuinely lose more to the dark — so poor coordination is *punished*.
- **What only a human can confirm:** that the Pledge feels like a real staredown (watching the leader sweat,
  the "did we block it?" reveal) and that the coordination pressure is felt, not just true in the numbers.
  Watch: analysis-paralysis on the Pledge? does the table actually negotiate over who pledges?

## 7. The Crown's Gambit + its heart win-gate — legibility

- **The claim:** the Gambit is a rare, telegraphed throne-grab; the new rule "you can't claim the throne
  while the dark's heart sits the Keystone" removed the accidental heart-assaulter wins.
- **What only a human can confirm:** that the gambit's *threat* shapes negotiation even when it doesn't fire,
  and that the heart-vs-throne distinction reads intuitively at the table rather than as a confusing edge
  rule. Watch: does anyone try to gambit and get surprised by the heart-exposed block?

## 8. Blood-Pact — the accusation gamble, the Audit, and the Wraith-traitor

- **The claim (carried from v2, sim-inert):** accusing is a real gamble (a wrong call costs cards, vindicates
  the innocent, gives the traitor cover); the Audit lets you *buy* evidence. **v3 twist:** an eliminated
  traitor STILL wins on doom, and as a Wraith they actively steer the dark toward the Keystone.
- **Why the sim can't judge it:** the AI doesn't weigh the wrong-accusation cost and reads suspicion directly
  (never pays for an Audit) — both sim-inert.
- **What only a human can confirm:** that the wrong-call cost creates "are we SURE?" hesitation; that the
  Audit feels worth its banners; and that "the traitor we *eliminated* is still working against us as a
  Wraith" lands as a great late-game dread rather than feels-bad. Watch: do loyalists Audit before accusing?
  Does killing the traitor feel hollow when their Wraith keeps pushing doom?

## 9. Session length + turn-time with 4 archetypes

- **The claim/risk:** the UX lens warned the RAID elect-chain (raid → resolve → elect {land/rout/capture} →
  pick piece) × 4 archetypes could inflate turn-time and blow the 30–45 min target.
- **What only a human can confirm:** that a 2–4p game finishes in ~30–45 min, and that the richer verb menu +
  the capture election read as *decisions*, not bookkeeping / analysis-paralysis. Watch: turn-length creep;
  whether the capture prompt is a fun choice or a chore; whether 4 archetypes is one too many (Herald was
  flagged as the droppable one).

## 10. The Shadowking as a character (the voice)

- **What only a human can confirm:** that the villain reads as a *presence* — barking when you capture its
  Death Knight, on a ransom, when a rival eliminates a player, on the march to its heart — rather than an
  announcer. Watch: does the dark feel like an antagonist you're arguing with, or a rules engine?

## 11. Difficulty tiers — which should be the default? (once the selector lands)

- **The finding:** balance is locked at *flawless* play (dark ~21%); the dark gets harder as tables err
  (~+0.5pp/1% error), so the default (Hard/reference) tier will feel ~24–27% to a casual table. The
  difficulty selector ships 3 tiers.
- **What only a human can confirm — and this playtest is how we PICK the default:** does the Hard/default
  tier feel too punishing for a first casual game (→ ship an easier default), or is "the dark is brutal if
  you're sloppy" the intended flavor (→ keep it)? Play the same table on two tiers and compare the felt
  threat. Record which tier should be the shipped default.

## 12. The Last Stand prompt — the heroic verb under pressure (T1-4)

- **The claim:** when a rival is taking your stronghold, the game STOPS and hands YOU the decision — how
  many cards to pour into the stand, seeing the projected totals and knowing those cards are next round's
  Pledge ammunition. The mechanics (pause/resume, totals, ties-to-defender) are jsdom-tested; the *feel* is
  not.
- **What only a human can confirm:** that the interruption lands as a dramatic beat, not a modal chore;
  that the "these are next round's Pledge cards" warning makes the trade-off legible in the moment (hold
  MY keep vs. hold the TABLE's line); and that yielding on purpose reads as a valid choice rather than a
  loss screen. Watch: does anyone over-commit their whole hand the first time and feel robbed at the next
  Pledge?
- **If it falls flat:** the prompt copy/projection is UI-only (freely tunable); the engine pause seam stays.
