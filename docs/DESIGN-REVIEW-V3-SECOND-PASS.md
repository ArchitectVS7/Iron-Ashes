# v3 Second-Pass Design Review — 2026-07-01

> **Method:** three isolated-context reviewers, no cross-talk — (1) learnability/complexity, (2)
> engagement/replayability/novelty/fun, (3) a code-vs-design conformance audit of `src/v3` against
> ALGORITHM §13/§12/§7. Run after the build (v3 586 tests green, both modes balance-locked), before the
> V3-6 human playtest and the planned full UI revision. This file is the synthesis of record; the verdicts
> below answer: *quick to learn? engaging? replayable? novel? fun? does the code represent the design?*

---

## The headline (all three reviewers converged)

1. **The roster identity — the reason v3 exists — is underfed at the table.** Only ~4 discovery tokens
   exist, so the median court is a Warlord + ONE retainer; captures (0.35/game) touch a given player once
   every ~6 games; and the conformance audit found retainer **names evaporate** (drawn, shown once in the
   flip event, never stored on `CourtPiece`, absent from the Hold rail). The engagement reviewer's line:
   *"a roster game whose roster verb fires once per three sessions is a territory game with a capture
   cameo."* The modal v3 game is "v2 wearing a v3 jacket."
2. **The true, defensible novelty hook is the villain, not the roster:** a telegraphed, grudge-holding,
   talking antagonist doing diegetic catch-up **in a competitive game** — "the balance system is a
   character." 100% uptime, every round, no genre peer does it. Lead with this.
3. **"Hiding is dangerous" is currently inert.** The wave-1 fix for the doom/attrition inversion zeroed
   `RECKONING_AUTOPRESSURE_NODES`, disarming the stress-test's anti-turtle centering lever. The sim's bots
   don't turtle like humans; expect the playtest to rediscover *build-quietly-and-be-second*.
4. **The Wraith is over-engineered for what it delivers** (~2-round median afterlife, one click/round, in
   the minority of games with an elimination) — the worst rules-weight-to-decision-value ratio in the
   design. The **Bequest** is the beat that earns its keep.
5. **Conformance: MOSTLY FAITHFUL** — an unusually well-documented implementation; every sanctioned
   deviation checks out as logged. Three real drifts (below), one of them *unrecorded* (a first for this
   project).

---

## The five questions

| Question | Verdict |
|---|---|
| **Quick to learn?** | **Conditional.** The opening (THREAT→PLEDGE) is genre-best at 8 concepts; the full load is ~35 concepts — "a 90-minute game's teach in a 40-minute box." Becomes a real 6–8-min teach with: Herald default-OFF, end-conditions compressed to 3 taught sentences, and the already-staged act structure formalized as the official progressive-disclosure onboarding. Watch the **round-1 Crown landmine** (seat-0 human named Crown + surcharged + hunted before understanding any of it). |
| **Engaging?** | **Every round, yes — via the inherited core** (Pledge staredown, the villain's voice, oath betrayal at 6.0/3.5 per game = the highest-frequency interpersonal drama). The v3-specific content lives in 10–35%-fire branches; the modal (territory-ending) game's mid-rounds thin out once land is claimed (~R4): reposition, hit DKs, churn oaths. |
| **Replayable?** | **Thin — ~8–12 plays** for an engaged group. Drivers: seeded tokens (small space), archetype mix, tiers (which don't bite at 2p), Blood Pact (the strongest second wind), the reactive villain. Missing vs peers (Root/Dune/Cosmic): **asymmetric Warlords** (cheapest big win — one passive/verb per faction on existing tech), Shadowking *aspects* (2–3 policy presets), variable token setup. |
| **Novel?** | **One genuinely distinctive hook:** the villain-as-balance-system (above). The Pledge is strong semi-novel (anti-veto proportional co-op at 40-min scale). Doom-is-the-map, hidden traitor, capture courts, the two-act ending = well-executed heritage/known patterns (the two-act is deliberately Shadowlord 1983). |
| **Fun?** | **Best bet to delight:** the villain+Pledge loop, and the heart assault when it fires (properly staged climax, ~1-in-4.5 games). **Biggest risk to disappoint:** the court — the marquee — because courts barely exist and hostages are nameless ids. The elimination *threat* works (exposure meter + round-9 timing, dead-time healthy); the Wraith machinery mostly won't be seen. |

## Does the code represent the design intention?

**Mostly yes — a faithful build.** All §13 P0s except one half of P0-10 are genuinely implemented (not
stubbed), the §12 table is systematically coded with direct tests, and every ROADMAP §8 sanctioned
deviation is exactly as logged. The real drifts:

| # | Drift | Severity |
|---|---|---|
| **D5** | **Retainer names evaporate** — no `name` on `CourtPiece`; Hold rail shows `marshal-2-1`. Kills the attachment thesis the playtest is meant to measure. | High for the playtest, trivial to fix |
| **D1** | **The Whisper "Rally" (P0-10 second half) silently dropped** — no code, no test, and (uniquely) **no decision-log entry**: the project's first unrecorded dropped mandate. | Moderate mech / high procedural |
| **stub** | **Human Last Stand is auto-played** — `handleLastStandCommit` is cosmetic; the one interactive heroic verb the spec grants never reaches the human ("the engine held my Keep for me"). | High for felt experience |
| **D3** | Whisper blocks the *deposal* but not *taking the last stronghold* → a player zeroed in Whisper is auto-eliminated at the first March Dawn with no recourse. Reading unrecorded. | Moderate |
| **D4** | The core AI takes full `GameState` ("a promise not to look" — verified it doesn't, but nothing *enforces* the fog contract; one edit could rot it silently). | Latent |
| **D2** | Auto-pressure dead at default (sanctioned, but ALGORITHM §6/§13 P0-5 still describe it as live — annotate). | Doc honesty |
| minor | Ransom destroys all cards (more brake than spec); freed-piece "rallied" bonus unbuilt; ally-ransom consent one-sided; flip-spawned DKs can't be maneuvered by the dark ("acts next THREAT" ≈ never acts); Herald outside the hostage economy (deliberate §HL carry). | Low |

---

## The consolidated fix list (ranked, costed)

**Tier 1 — before the playtest (cheap, protects the playtest's validity):**
1. **Persist + surface retainer names** (D5) — name on `CourtPiece`, in the court panel / Hold rail /
   capture+ransom beats; add the one-line identity. *(small)*
2. **Resolve the Rally** (D1) — build it, or record its removal in ROADMAP §8 + annotate §13 P0-10; while
   there, decide+record the Whisper last-stronghold reading (D3). *(small either way)*
3. **Round-1 Crown fix** — no Crown until first Dawn, or an in-context callout. *(trivial–small)*
4. **Doc annotations** — §13 P0-5 (auto-pressure zeroed) + the teach-script/progressive-disclosure notes
   + compress taught end-conditions to 3 sentences. *(trivial)*
5. **Human Last Stand control** — the engine pause-flow (the known 6a-class gap); or explicitly record
   auto-play as intended for the functional build. *(medium / trivial-to-record)*

**Tier 2 — design calls (reopen balance; decide, then one re-balance wave):**
6. **Feed the court** — more token-Holdings and/or a starting retainer + recruit trickle; target courts of
   3–4 by March. The single change that makes the game match its own pitch; raises captures toward
   ~1/game without touching the brakes. *(medium — the engagement reviewer's #1)*
7. **Re-arm "hiding is dangerous"** in a currency that doesn't re-break doom/attrition (e.g. steer *blight*
   toward the least-engaged quadrant, or a hoard-tax on the Pledge) + a real passivity metric. *(medium)*
8. **Herald default-OFF** (3-archetype default; Herald an advanced toggle) — the learnability reviewer's #1;
   needs one re-validation sweep. *(small–medium)*
9. **Right-size the Wraith** — cut to Bequest-only, or give it one banked "manifestation" payoff; decide at
   the playtest, don't ship the middle. *(low to cut)*

**Tier 3 — post-playtest / replayability roadmap:** asymmetric Warlord passives; Shadowking aspects;
variable token setup; type-enforce the fog contract (D4 → `ObservableState` in AI signatures); a 2p-specific
difficulty lever; move the heart off the Keystone **only if** the playtest confirms checklist-#7 confusion.

---

*Verdicts feed `docs/human-playtest-checklist-v3.md` (items 1–3 now double as tests of the Tier-2 calls) and
the planned full-UI revision (the progressive-disclosure teach script is now a UI requirement, not a nicety).*
