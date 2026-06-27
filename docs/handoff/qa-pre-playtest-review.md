# QA Review — Focus-Group Decisions vs. The Shipped Game (pre-human-playtest)

> **Scope:** an independent, skeptical cross-check of every adopted focus-group design decision
> (R1 `design-history/DESIGN-V2-FOCUS-GROUP.md`, R2 `-R2.md`, R3 `-R3.md`, the restored v1 market study, and the
> three lead-designer forks) against what was actually built and tuned in `src/v2/` + `tests/v2/` +
> the Stage-5 sim, up to **but not including** the human playtest (HEAD `fa3f922`, 437 tests green).
> **Date:** 2026-06-24. **Method:** five parallel evidence sweeps over the engine/tests + a doc audit
> of the tuning log, spec, and risk registers. Balance is LOCKED — this review does **not** re-tune.
>
> **Verdict legend:** Honored (built as decided) · Drifted (built differently) · Reversed (decision
> later overturned — ownership checked) · Dropped (decided, never built) · Unverified (claimed done,
> no test/sim evidence).

---

## 0. Headline

**The shipped game is a faithful build of the focus-group design.** Of ~45 discrete adopted
decisions, the overwhelming majority are **Honored** with both code and test citations. Every large
**Reversal** (traitor-at-launch, sealed gambit pledge, DK-army scaling, the rescue-volume cap) is a
**dated, owned decision** recorded in the spec/ROADMAP/tuning-log — none is silent drift.

The audit surfaced **one true design drift**, **one dropped anti-exploit surface**, **two stale-spec
inconsistencies**, and **a cluster of missing-test coverage on load-bearing anti-exploit code**. None
changes balance; all are "fix-or-record" items under the No-Deferred-Debt norm. The single biggest
thing a docs-only reader would find surprising is covered in §5 (the Rescue signature beat).

**Scoreboard:** Honored ≈ 38 · Reversed-owned 5 · Drifted 1 · Dropped 1 · Stale-spec 2 ·
Unverified (correctly labeled human-facing) 5 · **Untested-but-correct code: 7**.

---

## 1. Round-1 core pillars (the "should be" spine)

| Decision (R1) | Verdict | Evidence |
|---|---|---|
| Kill unanimity → threshold Pledge, **proportional** block, one defector can't veto | **Honored** | `ratio = min(effective/C,1)` `sequencer.ts:167`; ceil-spread `blight.ts:312`; tests `blight.test.ts:263/272/282` |
| Crown's pledged cards count for **less** (`CROWN_PLEDGE_DISCOUNT<1`) | **Honored** | `=0.5` `tunables.ts:59`, applied `sequencer.ts:144`/`gambit.ts:206` |
| **Anti-free-rider** (shield pledger's lands + persistent favor) | **Honored** (mechanic) — spec text **stale**, see §6-③ | shield `blight.ts:325`, favor `sequencer.ts:160`; tests `mechanics-3f.test.ts:96/111`; sim guard "free-riding NOT rewarded" PASSES every sweep (tuning-log 5a→5f); `PLEDGE_SHIELD_AMOUNT` load-bearing/validated (§C2) |
| **Patience ratchet** — cooperation angers the dark / forces escalation | **Honored** | `sequencer.ts:221`, cap-forces-Act `347`; test `gambit.test.ts:268` |
| Villain is a **CHARACTER** — telegraph (target+effect+first-person), grudge, 3 acts, voice | **Honored** | telegraph `shadowking-policy.ts:411`; in-round `SK_VOICE_LINE` reducer events `sequencer.ts:206`, `combat.ts:412/485`, `actions.ts:672`; acts `ACT_ORDER`; tests `shadowking-policy.test.ts:162/202` |
| Target precedence Gambit > grudge > Crown; ties lowest seat, **no RNG** | **Honored** | `chooseTarget` `shadowking-policy.ts:118`; tests `shadowking-policy.test.ts:34-65` |
| Grudge public, **decays**, **capped** | **Honored** | cap=10 `addGrudge:54`, `decayGrudge:81`; ↳ but "heroic decays faster" **Drifted** — see §6-① |
| **Leading is dangerous** — Crown = win + SK-priority + defense surcharge | **Honored** | three-in-one: win path §6, priority `shadowking-policy.ts:138`, surcharge `0.5` |
| **Doom IS the map** — Blight burns nodes to permanent ash; board shrinks | **Honored** | `blight.ts`; ash on `BLIGHT_TO_ASH`; loss = Keystone ashed `doom_complete` |
| **Escalation changes rules** (Whisper/March/Reckoning unlock behavior) | **Honored** | `chooseEffect` switches per act `shadowking-policy.ts:165`; advance `sequencer.ts:344` |
| **No-elimination with teeth** — Broken = comeback engine, recovery cap, lost lands feed front | **Honored** | actions `sequencer.ts:254`, income `535`, recovery `actions.ts:807`, lost-lands-ash `combat.ts:490` |
| **Last Stand** opt-in heroic gamble (commit cards for reversal) | **Honored** (mechanic) / **Unverified** (player *choice*) | `resolveLastStand`/`chooseLastStandCards` `actions.ts:463`; **but the commit is engine-auto (`LAST_STAND_COMMIT` stub)** — R1's "variance you *choose*" is not yet a human decision. Recorded: state.json openRisks + ROADMAP §277. See §6-⑦ |
| Map ~15–18 nodes, symmetric | **Honored** | 17-node Closing Ring `board.ts`, `setup.test.ts` |
| Turn order THREAT→PLEDGE→ACTION→DAWN, one rotating pointer | **Honored** | `PHASE_ORDER` `sequencer.ts:62` |
| Deterministic from seed (no `Math.random`/`Date.now`) | **Honored** | `determinism.test.ts`; invariant enforced |

---

## 2. The three lead-designer forks (R1 §5)

| Fork | Choice | Verdict |
|---|---|---|
| Doom model | **Doom IS the map** | **Honored** (see §1) |
| Pledge feel (open vs sealed) | **Open in core, sealed in Blood Pact** → **AMENDED:** Gambit claimant also sealed in competitive | **Reversed-owned.** `SEALED_CORE_PLEDGE='gambit_claimant'` `tunables.ts:149`; reversal recorded ALGORITHM §0/§4.2/§11, ROADMAP §2/§353, tuning-log §S. Sealing is a sim no-op alone; validated as a real volunteer's-dilemma via the bail-out channel (§B: claimant Gambit-win −7pp). |
| Traitor | R1 said **defer** → v2 ships **full hidden-role mode at launch** (separable flag) | **Reversed-owned** — and consistent with the v1 market signal ("Blood Pact ships at launch"). ALGORITHM §0, ROADMAP §48. Layer A byte-identical when flag absent (verified, §4). |

---

## 3. Round-2 — the dark-engagement fixes (the "dead Grudge" patch)

R2's whole point: the dark was dormant (DK-kills **0.00**/game) because engagement was paid in the
wrong currency. The patch is the most consequential post-R1 work.

| R2 prescription | Verdict | Evidence |
|---|---|---|
| **Add the Hunt verb** (AI paths *toward* a DK, not just swings on contact) | **Honored** | `bestStepTowardHuntableDK` BFS `ai-player.ts:305`, HUNT step `773`, cards-aware `canStrikeWin:290`; test `dark-engagement.test.ts:104`. Result: DK-kills 0.00→**2.05**/game (tuning-log §5-dark). |
| **Pay the kill in win-currency** (claim the DK's node; DK blocks claim) | **Honored** | auto-claim `combat.ts:383`, block `actions.ts:323`; tests `dark-engagement.test.ts:34-58` |
| **Asymmetric grudge Mark** — tax only the leading seats (`GRUDGE_MARK_TOP_N`) | **Honored** | `territoryRank<2` gate `combat.ts:402`; tests `dark-engagement.test.ts:61-100` |
| The **Ledger** — dark hunts oathbreakers | **Honored** | `BREAK_OATH +GRUDGE_OATHBREAK` `actions.ts:671`; test `oaths.test.ts:75` |
| **Scale DK army with player count** (`DK_PER_PLAYER>0`) | **Reversed-owned** | Probed 0→1, **REFUTED** by the retune (bigger army feeds players; 4p SK-win went *up*). Reverted to 0. Recorded DARK-ENGAGEMENT §2.4/§2.5, tuning-log §5-dark "DK-army scaling BACKFIRES once kills pay." |
| **DKs march inward toward the Keystone autonomously** (a 2nd front) | **Dropped-owned** | Not built — DKs only chase the *targeted player's Warlord* on the MARCH act (`shadowking-effects.ts:184`). Explicitly deferred: DARK-ENGAGEMENT §4 "Autonomous inward DK march + corridor blight — high balance blast radius; hold until §2 is measured." Engagement instead delivered by the four levers above. |
| "Paint the Crown" steerable grudge-at-a-rival | **Dropped-owned** | DARK-ENGAGEMENT §4 — asymmetric Mark delivers most of the intent; revisit if engagement stays leader-punishing. |
| Per-count fork → **A (accept + name the tiers)** | **Honored** | 2p Duel / 3p Triumvirate / 4p Carve-up, ALGORITHM §9.1; chosen on post-patch data, tuning-log §"Per-count A/B fork". |
| Rescue paid in win-currency | **Honored** (then absorbed by Oaths — see §4/§5) | `RESCUE_TRIBUTE_BANNERS` `actions.ts:558` |

---

## 4. Round-3 — the passion spine (Oaths) + identity + the two levers

| R3 decision | Verdict | Evidence |
|---|---|---|
| **Oaths spine** — public breakable two-player bond | **Honored** | `state.oaths[]`, SWEAR/BREAK actions; sim ~6.4 sworn / ~3.2 broken/game (tuning-log §R2) |
| Keep Oaths **OFF the card economy** (free to swear; cost is the break) | **Honored** | `SWEAR_OATH` `actionConsumed:false` `actions.ts:640`; test `oaths.test.ts:22` |
| Sworn = non-aggression + Forge-toll waiver + Dawn fealty dividend | **Honored** | RAID-block `actions.ts:425`, toll-waiver `126`, dividend `687`; tests `oaths.test.ts:46/51` (toll-waiver path has **no dedicated test** — §6-⑧) |
| **Welching legal but loud** — BREAK costs an action + grudge + banner burst | **Honored** | `actions.ts:662/671/674`; test `oaths.test.ts:75` |
| **Rescue ABSORBED into one Oath** (rescue-debt retired) | **Honored** | `RESCUE_DEBT_MIN_PLEDGE` fully removed from `tunables.ts` (not vestigial); rescue forges an Oath `actions.ts:576`; tuning-log §M; test `oaths.test.ts:90` |
| Oaths **dissolve** when a member breaks (review fix) | **Honored** (code) / **Untested** | `combat.ts:473` filters the breaker's oaths — but **no test asserts it** (§6-⑤) |
| **Herald — keep but adapt; build as a PIECE** | **Honored** | literal `'herald'` piece, independent march, capture-at-Dawn `resolveHeraldCaptures` `actions.ts:259`, called `sequencer.ts:318`; tuning-log §HL |
| Herald→hand-capacity **rejected**; adapt to political/martial **stance** | **Honored** | `+HERALD_HAND_BONUS`/`−HERALD_COMBAT_PENALTY` `actions.ts:728`; raw "more heralds = bigger hand" not built |
| Vassal/binding **rejected standalone; soul absorbed by Oaths** | **Honored** | no vassal system; Oaths = voluntary binding, Rescue = earned binding |
| **Sealed core Pledge** (judge headline; reverses R1) | **Reversed-owned** | see §2 fork table |
| **Forge-as-Gate tolls** (contestable, capped, sworn pass free) | **Honored** | `FORGE_TOLL_COST=1` flat/non-stackable, `!areSworn` waiver `actions.ts:122`; tests `forge-tolls.test.ts:21-58`; ~0.8 tolls/game |

**Blood Pact (Layer B / §10 + 5e) — fully Honored:** one *human* holder, AI never holds (`setup.ts:172`,
test `setup.test.ts:208`); aggregate-only reveal (`PLEDGE_COMMITTED`, test `blood-pact.test.ts:57`);
Audit (`blood-pact.ts:69`), Suspicion Log bounded (`:54`), unanimous accusation w/ lockout (`:219`),
"can't pay = 0 + public" (`sequencer.ts:107`). 5e levers all present (`SABOTEUR_COVER=0.745`,
`ACCUSE_MIN_SCORE=4`, `BLOOD_PACT_SPREAD_BONUS=1`, `ACCUSATION_WRONG_PENALTY=2`); suspicion sharpened to
**'none'-only** (`blood-pact.ts:290`, test `blood-pact-5e.test.ts:46`). **Byte-identical guard verified:**
every BP behavior is `mode==='blood_pact'`-gated and adds +0 in competitive (`blight.ts:311/368`, test
`blood-pact-5e.test.ts:58`). The "wrong-penalty + Audit are sim-inert/human-facing" claim is **honest** —
grep confirms zero references in `ai-player.ts`/`sim/` (chooser uses `suspicionScore` only,
`blood-pact.ts:323`).

---

## 5. The restored v1 market study — the Rescue signature beat (the one surprise)

**Decision (v1 FOCUS-GROUP.md):** Rescue at **2.8 activations/game** was "the standout finding of the
entire study," named by 5 personas, "the sentence the game exists to produce," and listed among the
**three things that must ship at launch** (rescue-moment production value).

**Shipped reality:** rescue fires **~0.72/game**, **structurally capped near ~1** by the all_broken<5%
guardrail (tuning-log §5d).

**Verdict: Reversed-owned — the *beat* was preserved but RELOCATED, not dropped.** This is the item a
docs-only reader (of the v1 study alone) would find most surprising, so it is called out prominently —
but it is thoroughly owned:
- The v1 numbers are flagged **untrusted** (broken v1 engine) in the handoff brief itself.
- R3 explicitly decided **Oaths absorb Rescue**: the "witnessed bilateral debt" feeling now fires
  **~6×/game via Oaths** (a renewable verb), with Rescue demoted to **the rare dramatic peak** (rescue
  auto-forges an Oath). FOCUS-GROUP-R3 §2.
- The cap itself was escalated to the user **three times** (5d, §A, §9 band), who chose the
  **all-broken→Shadowking-win ending over the rescue claw-back**. Band re-stated 2–4 → **0.5–4**
  (labeled capped) in ALGORITHM §9 + state.json openRisks.

Other v1 signals: **Blood Pact at launch** → Honored (§2). **Asymmetric factions deferred to a later
version** → Honored (symmetric Closing Ring). **Herald-as-doom-relief** (Raj's actionable) → Honored,
realized as the non-card **PARLEY** pushback. **No elimination** → Honored.

---

## 6. Findings that need triage (fix-or-record)

None move balance. Ordered by severity.

**① DRIFT + un-owned deferral — "heroic grudge decays faster than SK-wound grudge."**
ALGORITHM §5.6 asserts this as a folded-in P0-4/P1 stress-test hardening fix ("so occasional heroism is
safe and only sustained provocation makes you the target"). In code it is **unbuilt**:
`GRUDGE_HEROIC_DECAY_RATE=2` is a **dead constant** (declared `tunables.ts:227`, re-exported `:567`,
**never read**); `decayGrudge` applies one flat rate to all grudge, with a deferral that lives **only in
a code comment** (`shadowking-policy.ts:77` "deferred to Stage 3b+"). Per CLAUDE.md, "a deferral that
lives only in a code comment does not exist — surface it." *Mitigant:* the functional intent (the most
helpful player isn't punished into a permanent victim) is largely covered by the asymmetric grudge Mark
(`GRUDGE_MARK_TOP_N`) + decay + cap. **Recommend:** soften ALGORITHM §5.6 to describe what ships, and
either delete the dead constant or record a dated deferral in ROADMAP §6 + state.json openRisks.

**② DROPPED anti-exploit surface — Pledge capacity transparency (`publish(maxPledge[p]=|hand|)`).**
ALGORITHM §4.2 specifies this as a P0/§10 anti-fake-poverty broadcast ("in every mode"). It has **zero
footprint** — no event, no projection, no UI, no test (grep: nothing in `src/` or ROADMAP). The data
exists in `state.players[].hand`; nothing surfaces it as the public signal the spec requires. (Blood
Pact's "can't pay = 0 + public" *is* built via tier `'none'`, but the general capacity broadcast is
not.) **Recommend:** record as a Phase-6 (6b/UI) item with an owner, or implement a pledge-open event —
do not leave it as an asserted-but-absent mechanic.

**③ STALE SPEC — anti-free-rider still labeled "Candidate / [TUNABLE / ML-VALIDATE]."**
ALGORITHM §4.2 step 5 reads as an unbuilt prototype and "the primary thing the Stage-5 sim must prove
solved." It **is** built (shield + favor, §1) **and** sim-validated (the free-rider guard PASSES in every
sweep 5a→5f; `PLEDGE_SHIELD_AMOUNT` confirmed load-bearing/in-band, tuning-log §C2). **Recommend:**
update the spec to "built + validated," citing the guard + §C2.

**④ STALE/INCONSISTENT SPEC — anti-turtle Dawn advance.** ALGORITHM §6 says the front advances every
Dawn "**unless** the round's collective Pledge met threshold," but §5.1 step (3) and the code
(`blight.ts:353`, `applyDawnBlightAdvance`) make the Dawn advance **unconditional**. (Safe direction —
more anti-turtle pressure — but the two spec sections contradict each other.) **Recommend:** reconcile
§6 wording to match §5.1/code.

**⑤–⑦ Missing tests on load-bearing code (correct in code, a regression would pass the suite):**
- ⑤ **Oath dissolution on Broken** (`combat.ts:473`) — anti-exploit, **no asserting test**.
- ⑥ **Broken income-subsidy DECAY** (`sequencer.ts:536`, `BROKEN_INCOME_BONUS - brokenRoundsConsecutive+1`)
  — the anti-self-break-exploit; Crown-forfeit half is tested, the decay half is **not**. A flat-bonus
  regression would pass.
- ⑦ **Herald DARK-capture branch** (`resolveHeraldCaptures`, the `by:'dark'` path `actions.ts:268`) —
  only the rival-Warlord branch is tested (`herald-piece.test.ts:60`); the Death-Knight capture is
  uncovered despite being the headline drama.

**⑧ Minor coverage gaps** (lower stakes): isolated assertion of the 0.5 Crown weight; the
patience-increment-on-full-block path (only the cap→escalation path is tested); a Broken player actually
pledging; a positive "Broken can still RAID" test (rests on absence-of-guard); the simultaneous
break+recover=survival edge; the sworn-ally Forge-toll-free path.

---

## 7. Known residuals — verified honestly recorded (no new action)

These are accepted tradeoffs from the brief; confirmed each is owned with dated evidence:
- **Rescue ~0.7/game** (target 2–4) — §5 above; capped, user chose the SK-win ending. ✔ recorded.
- **BP win↔exposure jointly tight** (~20/~70, seed-2 +0.3/+1.1pp over) — the sabotage-gated decouple
  was built + tested in §5f and was *strictly worse*; flat-bonus frontier accepted. ✔ recorded ALGORITHM §9/§10.
- **Per-count ladder shape moves per mechanic** — invariant guarded ("credible at every count 16–24%"),
  not a fixed ordering. ✔ ALGORITHM §9.1.
- **Sealed pledge / wrong-penalty / Audit are sim-inert/human-facing** — ✔ human-playtest-checklist §1/§3,
  validated in-sim where possible (§B bail-out channel).
- **Combat-commit + Last Stand engine-auto** — ✔ state.json openRisks + ROADMAP §277 (and §6-⑦/⑦ above).

The 2026-06-23 3-lens review's four fixes (gambit §9 check, rescue band re-statement, oath-while-Broken
dissolution, free-rider guard) all remain in place (confirmed in code this audit).

---

## 8. Recommendation

Triage the §6 list. Suggested dispositions (all small, none balance-affecting):
**①** record + soften spec (or delete dead constant); **②** record as 6b/UI item or implement the event;
**③④** one-paragraph spec edits; **⑤⑥⑦** add three targeted tests (high value — they guard anti-exploit
code); **⑧** optional. Then proceed to the human playtest (`npm run dev` + human-playtest-checklist.md).
