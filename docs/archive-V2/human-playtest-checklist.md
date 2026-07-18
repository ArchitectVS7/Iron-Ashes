# Human-playtest checklist — assumptions the SIM can't validate

The deterministic Monte-Carlo sim validates *incentives and balance* (does a mechanic move the
numbers the way we intend?). It cannot validate *felt experience* — drama, tension, table-talk,
"was that fun?". This file lists the shipped mechanics whose VALUE rests on a human claim the sim
can't reach. Per the No-Deferred-Debt norm (CLAUDE.md), these ship LABELLED, not silently assumed.

> How to use: when a real human playtest happens, walk this list and record the verdict (kept /
> changed / cut) back into the relevant `DESIGN-V2-*.md` + `docs/handoff/state.json` openRisks.

## 1. Sealed-pledge "volunteer's dilemma" (Stage S + B) — PARTIALLY validated

- **The claim:** sealing the Gambit claimant's pledge makes covering the dark a tense *volunteer's
  dilemma* for the rivals — "do I spend my cards to bail out the player who might then WIN, not
  knowing if someone else already has?"
- **Sim verdict (Stage B, validated):** with the bail-out AI active, sealing MEASURABLY shifts the
  Gambit outcome — claimant win rate −7pp, gambit fire 26%→18% (into band), SK-win +3pp vs open.
  So the *incentive* channel is real: sealing makes the gambit a genuine bet and curbs over-firing.
- **What only a human can confirm:** that the hidden pledge actually FEELS like a dilemma at the
  table (the held breath, the "did anyone cover?" reveal), not just a number. Watch for: do players
  hesitate? does the reveal land as a beat? does anyone get burned by assuming a rival would cover?
- **If it falls flat with humans:** the balance fix (the GAMBIT_SELF_COVER_CARDS seize gate +
  bailoutTrust dynamics) stands on its own — sealing could be cut without breaking balance.

## 2. Session length — 30–45 min target (instrumented C2, not yet felt)

- **The proxy:** C2 added `decisionsPerGame` / `actionsPerRound` to the sim report (~82 decisions /
  ~6.9 per round at the locked config). That's a density proxy, not wall-clock minutes.
- **What only a human can confirm:** that a real 2–4p table finishes in 30–45 min after the R3
  verb-count growth (Oaths, tolls, Parley, Herald). Watch for: analysis-paralysis on the Pledge,
  turn length creep, whether the per-round verb menu feels rich or bloated.

## 3. Blood Pact — the accusation gamble + the Audit (Stage 5e) — sim-inert, human-real

- **The claim:** accusing is a real GAMBLE — a wrong call costs the accuser cards
  (`ACCUSATION_WRONG_PENALTY=2`), vindicates (rewards) the innocent, and gives the real traitor cover
  ("we cried wolf"). And the **Audit** (spend banners to reveal one rival's last pledge) lets you BUY
  evidence to de-risk the gamble.
- **Why the sim can't judge it:** the AI doesn't weigh the wrong-penalty when deciding to accuse, and
  it reads the Suspicion Log directly (so it never needs to pay for an Audit). Both are sim-inert —
  the balance came from the cover bluff + the evidence bar + the dark bonus, NOT these.
- **What only humans can confirm:** that the wrong-accusation cost actually creates "are we SURE?"
  hesitation at the table; that the Audit feels worth its banners as a pre-accusation investment; and
  that the traitor's cover-vs-sabotage choice (pass as loyal vs feed the dark) lands as a genuine
  white-knuckle dilemma. Watch: do loyalists Audit before accusing, or accuse on a hunch and get burned?

## 4. The literal Herald lone-runner (Stage HL) — table drama

- **The claim:** a single vulnerable Herald crossing the blight to Parley is a *scene* the table
  watches ("will he make it?") — escort/intercept tension a stance flag can't deliver.
- **What only a human can confirm:** that the runner's journey actually generates that tension and
  table-talk, and that intercepting an enemy Herald feels like a coup rather than bookkeeping.
