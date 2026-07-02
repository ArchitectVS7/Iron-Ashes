/**
 * GameSession (v3) — the UI's driver over the v3 engine (Stage 3i-b).
 *
 * Render-from-state contract: the session owns a single `GameState`, and EVERY mutation goes
 * through the one `applyCommand` reducer (ALGORITHM §7). The human occupies seat 0; all other seats
 * are AI, driven by the pure `f(state, seed)` choosers. The view never mutates state — it renders
 * from `session.observable()` (the fog-applied projection, §7 D2) and calls these reducer-routed
 * methods.
 *
 * A single `pump()` sequences the phases: it auto-pledges/auto-acts for AI seats (and for the human
 * once ELIMINATED — spectator/Wraith mode) and stops only at genuine human decision points:
 *   • THREAT      — the human clicks to face the dark (and, as a Wraith, sets its afterlife input).
 *   • PLEDGE      — the living human chooses a pledge.
 *   • ACTION      — the living human's turn.
 *   • BEQUEST     — the human is flagged `deposed` and about to fall: it names its exit beat first.
 *
 * 3i-b adds: every ACTION verb, the RAID capture ELECTION, the Blood-Pact AUDIT/ACCUSE surface, the
 * P0-11 legibility projections (exposure meter, projected combat margin), and the eliminated-human
 * WRAITH input + DEATH BEQUEST — all routed through applyCommand (the last two via the sim-neutral
 * SET_WRAITH_INPUT / SET_BEQUEST override commands).
 */

import {
  createGame,
  applyCommand,
  withDifficulty,
  DEFAULT_DIFFICULTY,
  choosePledge,
  runAIPledge,
  runAITurn,
  chooseAccusationVote,
  getEffectivePledgeWeight,
  observableState,
  TUNABLES,
  getPlayerPowerAtNode,
  getShadowkingPowerAtNode,
  effectiveCaptureMargin,
  trailingDefenseBonus,
  stewardHomeDefenseBonus,
  livingStrongholdCount,
  chooseRaidAttackCommit,
  chooseCombatCommit,
  legalRaidTargets,
  canCapture,
  canTakeLand,
  type Command,
  type GameEvent,
  type GameMode,
  type GameState,
  type ObservableState,
  type BequestChoiceInput,
  type WraithInputKind,
  type Difficulty,
  type PendingLastStand,
} from '../v3/index.js';

/** A short on-screen narration line (villain voice, beats, results). */
export interface Narration {
  readonly text: string;
  readonly kind: 'villain' | 'beat' | 'system';
}

/** A player's legibility exposure level (§13 P0-11). */
export type Exposure = 'safe' | 'can-lose-land' | 'can-be-deposed' | 'deposed' | 'eliminated';

/** The projected outcome of a RAID BEFORE committing (§13 P0-11) — cards are engine-auto (4g). */
export interface RaidProjection {
  readonly atkPower: number;
  readonly defPower: number;
  /** attacker margin: > 0 ⇒ the attacker is projected to win (before any defender Last Stand). */
  readonly margin: number;
  /** The standing-scaled margin a capture needs (§5.2). */
  readonly captureMargin: number;
  /** Whether TAKE_LAND is projected to succeed AND is legal (see `landGated`). */
  readonly takeLand: boolean;
  /** Whether a legal ROUT target is present (and the raid is projected to win). */
  readonly rout: boolean;
  /** Whether CAPTURE is projected legal (margin cleared + a legal, non-immune target). */
  readonly capture: boolean;
  /** TRUE when the Whisper last-stronghold gate forbids TAKE_LAND here (§13 P0-10). */
  readonly landGated: boolean;
  /** Whether ANY legal rout target stands here (margin-independent — a losing rout is legal). */
  readonly routLegal: boolean;
}

export class GameSession {
  state: GameState;
  readonly humanIndex = 0;
  readonly seed: number;
  /** The DARK-STRENGTH difficulty tier (§D1) — its doomCost curve is applied to every engine
   *  step via the getTunables/withDifficulty seam, so the chosen tier actually bites in play. */
  readonly difficulty: Difficulty;

  /** Called after any state change so the host can re-render. */
  onChange: () => void = () => {};

  /** The most recent reducer events (for one-shot beats / voice lines). */
  recentEvents: GameEvent[] = [];
  /** A rolling narration feed shown in the HUD. */
  narration: Narration[] = [];
  /** Last rejected-input message (e.g. an illegal MARCH), shown then cleared. */
  lastError: string | null = null;

  /** True when the flow has paused for the human to name its Death Bequest (§5.5) before falling. */
  awaitingBequest = false;
  /** The human's in-progress Last Stand card selection (indices into `lastStandRemainingHand()`),
   *  held UI-side so the blocking prompt survives re-renders; cleared on commit (§5.3, T1-4). */
  lastStandSelection: number[] = [];
  /** The human's last-seen exposure — drives the one-shot "the tide has reached you" beat (P0-11). */
  private prevHumanExposure: Exposure | null = null;

  constructor(
    playerCount: number,
    mode: GameMode,
    seed: number,
    difficulty: Difficulty = DEFAULT_DIFFICULTY,
  ) {
    this.seed = seed;
    this.difficulty = difficulty;
    // Seat 0 is the lone human; the rest are AI. The tier's doomCost curve is scoped around setup
    // (harmless — setup never reads doomCost) and every subsequent engine step below.
    this.state = withDifficulty(difficulty, () => createGame(playerCount, mode, seed, 1, difficulty));
    // One-shot round-1 Crown callout (backlog T1-3): setup() tie-breaks seat 0 into the Crown,
    // so a first-time human starts surcharged + hunted — say so before the first pledge.
    // UI-only; zero engine change (the locked balance is untouched).
    const callout = crownCalloutText(this.state, this.humanIndex);
    if (callout !== null) this.narration.unshift({ text: callout, kind: 'system' });
    this.pump();
  }

  /** The fog-applied projection the view renders from (§7 D2) — never leaks hidden tokens/seed. */
  observable(): ObservableState {
    return observableState(this.state, this.humanIndex);
  }

  // ─── Core dispatch ──────────────────────────────────────────────

  private dispatch(cmd: Command): void {
    // Scope the tier's doomCost curve around EVERY reducer step — the Shadowking telegraph (and its
    // doomCost) is computed inside applyCommand's THREAT→PLEDGE advance, so the chosen difficulty
    // must be active here for it to bite. `warlord` scopes the locked reference values (identity).
    const result = withDifficulty(this.difficulty, () => applyCommand(this.state, cmd));
    this.state = result.state;
    this.recentEvents = result.events;
    this.absorbNarration(result.events);
  }

  /** Pull villain lines and notable beats out of the event stream (villain-voice / scene beats). */
  private absorbNarration(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'SK_VOICE_LINE') {
        this.narration.unshift({ text: e.line, kind: 'villain' });
      } else if (e.type === 'PLEDGE_RESOLVED') {
        this.narration.unshift({
          text: e.averted
            ? `The strike is held — the table met the threshold (${e.effective.toFixed(1)}/${e.threshold}).`
            : `The strike lands at ${Math.round((1 - e.ratio) * 100)}% — only ${e.effective.toFixed(1)}/${e.threshold} pledged.`,
          kind: 'beat',
        });
      } else if (e.type === 'NODE_ASHED') {
        this.narration.unshift({ text: `A node falls to ash.`, kind: 'beat' });
      } else if (e.type === 'PLAYER_ELIMINATED') {
        this.narration.unshift({ text: `Player ${e.playerIndex + 1} is eliminated — a Wraith joins the dark.`, kind: 'system' });
      } else if (e.type === 'ACCUSATION_RESOLVED') {
        this.narration.unshift({
          text:
            e.outcome === 'correct'
              ? `The accusation lands — the traitor is exposed!`
              : e.outcome === 'wrong'
                ? `Wrong! Player ${e.accused + 1} is vindicated; the accusers pay.`
                : `The accusation fizzles — no consensus.`,
          kind: 'system',
        });
      } else if (e.type === 'ACT_ESCALATED') {
        this.narration.unshift({
          text: e.newAct === 'MARCH'
            ? `The war deepens — the Act turns to MARCH. The last stronghold is no longer safe; the dark can now DEPOSE.`
            : `The war deepens — the Act turns to ${e.newAct}.`,
          kind: 'beat',
        });
      } else if (e.type === 'CROWN_CHANGED') {
        this.narration.unshift({
          text:
            e.newHolder === null
              ? `The Crown falls — no one wears it.`
              : `The Crown passes to Player ${e.newHolder + 1} — and with it, the target on their back.`,
          kind: 'beat',
        });
      } else if (e.type === 'DISCOVERY_FLIPPED' && e.kind === 'recruit' && e.retainerName !== null) {
        // The attachment beat (§2 — names are state): the flip introduces a NAMED retainer.
        this.narration.unshift({
          text: `✦ ${e.retainerName} joins Player ${e.playerIndex + 1}'s court.`,
          kind: 'beat',
        });
      } else if (e.type === 'PLAYER_ACTED') {
        this.absorbActBeat(e);
      } else if (e.type === 'GAME_OVER') {
        this.narration.unshift({ text: this.describeEnding(), kind: 'system' });
      }
    }
    this.narration = this.narration.slice(0, 10);
  }

  /** Stage CAPTURE / RANSOM / KILL-THE-DARK as scene beats out of the PLAYER_ACTED detail bag
   *  (§13 P0-11) — by NAME where the event carries one (§2: names drive attachment). */
  private absorbActBeat(e: Extract<GameEvent, { type: 'PLAYER_ACTED' }>): void {
    const d = (e.details ?? {}) as Record<string, unknown>;
    if (e.action === 'RAID' && d.capture !== undefined) {
      const who = typeof d.name === 'string' ? d.name : "a rival's retainer";
      this.narration.unshift({
        text: `⛓ CAPTURE — Player ${e.playerIndex + 1} drags ${who} into their hold.`,
        kind: 'beat',
      });
    } else if (e.action === 'RANSOM') {
      const who = typeof d.name === 'string' ? d.name : 'a captive';
      this.narration.unshift({
        text: `🔓 RANSOM — Player ${e.playerIndex + 1} buys ${who} free from Player ${Number(d.captor) + 1}.`,
        kind: 'beat',
      });
    } else if (e.action === 'ASSAULT_HEART') {
      const hp = Number(d.heartHp ?? 0);
      const hit = Number(d.hit ?? 0);
      this.narration.unshift({
        text: hp <= 0
          ? `☀ THE HEART BREAKS — Player ${e.playerIndex + 1} lands the blow that shatters the dark's heart!`
          : `⚔ Player ${e.playerIndex + 1} strikes the dark's heart (${hit} damage · ♥${hp} left).`,
        kind: 'beat',
      });
    } else if (e.action === 'PASS' && d.lastStandPending !== undefined) {
      this.narration.unshift({
        text: `⚔ Player ${Number(d.attacker) + 1} is taking ${String(d.nodeId)} (${Number(d.attackPower)} vs ${Number(d.defensePower)}) — LAST STAND?`,
        kind: 'beat',
      });
    } else if (e.action === 'PASS' && d.lastStand !== undefined && d.cards !== undefined) {
      this.narration.unshift({
        text: d.held === true
          ? `🛡 LAST STAND — Player ${e.playerIndex + 1} pours ${Number(d.cards)} card${Number(d.cards) === 1 ? '' : 's'} in and HOLDS.`
          : `🛡 Last Stand — Player ${e.playerIndex + 1} commits ${Number(d.cards)} card${Number(d.cards) === 1 ? '' : 's'}, but the stronghold falls.`,
        kind: 'beat',
      });
    } else if (e.action === 'PASS' && d.captureFizzled !== undefined) {
      this.narration.unshift({
        text: `⛓ The capture slips — the stand cut the margin to ${Number(d.margin)} (needed ${Number(d.needed)}).`,
        kind: 'beat',
      });
    } else if (e.action === 'PASS' && d.bequest !== undefined) {
      const gift = d.bequest === 'captive'
        ? (typeof d.pieceName === 'string' ? `the captive ${d.pieceName}` : 'a captive')
        : 'their cards';
      this.narration.unshift({
        text: d.bequest === 'curse'
          ? `A dying curse — Player ${e.playerIndex + 1} marks a hated rival for the dark.`
          : `A final gift — Player ${e.playerIndex + 1} bequeaths ${gift} to an ally, sealing a posthumous Oath.`,
        kind: 'beat',
      });
    }
  }

  // ─── Phase flow ─────────────────────────────────────────────────

  get phase(): GameState['phase'] { return this.state.phase; }
  get isOver(): boolean { return this.state.gameEndReason !== null; }
  get isHumanAlive(): boolean { return !this.state.players[this.humanIndex].isEliminated; }

  /** The human has a live ACTION turn with actions left (the action panel renders). */
  get isHumanTurn(): boolean {
    const human = this.state.players[this.humanIndex];
    return this.state.phase === 'ACTION'
      && this.state.activePlayerIndex === this.humanIndex
      && !human.isEliminated
      && human.actionsRemaining > 0;
  }

  /** The human is an eliminated Wraith and it's the THREAT window to set its afterlife input (§5.5). */
  get isWraithWindow(): boolean {
    return !this.isHumanAlive
      && this.state.phase === 'THREAT'
      && this.state.shadowking.wraiths.some(w => w.seat === this.humanIndex)
      && !this.isOver;
  }

  /**
   * The single flow driver: advance the game as far as it can WITHOUT a human decision, resolving AI
   * pledges/turns (and, once the human is eliminated, everything but the THREAT click). Stops at the
   * human's decision points. Idempotent-safe via a guard.
   */
  private pump(): void {
    let guard = 0;
    while (!this.isOver && guard < 512) {
      guard++;
      // A HALTED combat (§5.3, T1-4): a rival's winning RAID on the human's stronghold has paused
      // for the human's Last Stand — a BLOCKING decision point (every other command is rejected).
      if (this.state.pendingLastStand !== undefined) {
        this.updateExposureBeat();
        return;
      }
      switch (this.state.phase) {
        case 'THREAT':
          // Always human-gated: the human clicks to face the dark (its Wraith input, if any, is set
          // beforehand). advanceFromThreat() drives the THREAT→PLEDGE step.
          this.updateExposureBeat();
          return;

        case 'PLEDGE': {
          if (this.isHumanAlive) { this.updateExposureBeat(); return; } // wait for the human pledge
          // Human eliminated — auto-pledge every living AI seat, then resolve.
          this.autoPledgeAI();
          this.dispatch({ type: 'ADVANCE_PHASE' });
          continue;
        }

        case 'ACTION': {
          const active = this.state.activePlayerIndex;
          const p = this.state.players[active];
          if (active === this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
            this.updateExposureBeat();
            return; // the human's turn
          }
          if (active !== this.humanIndex && !p.isEliminated && p.actionsRemaining > 0) {
            this.state = withDifficulty(this.difficulty, () => runAITurn(this.state, active, this.seed).state);
            continue;
          }
          // Active seat is exhausted or eliminated.
          if (this.state.turnOrderPosition >= this.state.turnOrder.length) {
            // ACTION phase is complete — the next step is DAWN, where deposals resolve. If the human
            // is flagged to fall this Dawn, pause for its Death Bequest first (P0-11 scene beat).
            const me = this.state.players[this.humanIndex];
            if (me.deposed && !me.isEliminated && this.state.pendingBequests?.[this.humanIndex] === undefined) {
              this.awaitingBequest = true;
              this.updateExposureBeat();
              return;
            }
            this.dispatch({ type: 'ADVANCE_PHASE' }); // ACTION → DAWN → next round's THREAT
            continue;
          }
          // Defensive nudge (a 0-action/eliminated non-terminal seat): PASS to advance the pointer.
          this.dispatch({ type: 'PLAYER_ACTION', playerIndex: active, action: { type: 'PASS' } });
          continue;
        }

        case 'DAWN':
          this.dispatch({ type: 'ADVANCE_PHASE' });
          continue;
      }
    }
  }

  /** Auto-pledge every living AI seat that hasn't pledged this round (the pure chooser). */
  private autoPledgeAI(): void {
    for (const p of this.state.players) {
      if (p.index === this.humanIndex || p.isEliminated) continue;
      if (this.state.pledgeBuffer.some(e => e.playerIndex === p.index)) continue;
      this.state = withDifficulty(this.difficulty, () => runAIPledge(this.state, p.index, this.seed).state);
    }
  }

  /** THREAT → PLEDGE. Runs the Shadowking telegraph + the Wraith sweep (consuming any human input). */
  advanceFromThreat(): void {
    if (this.state.phase !== 'THREAT' || this.isOver) return;
    this.dispatch({ type: 'ADVANCE_PHASE' });
    this.pump();
    this.onChange();
  }

  /**
   * Submit the LIVING human's pledge, auto-pledge every AI seat, resolve the Pledge, then run the
   * flow up to the human's next decision point.
   */
  submitHumanPledge(amount: number): void {
    if (this.state.phase !== 'PLEDGE' || this.isOver || !this.isHumanAlive) return;
    this.lastError = null;
    try {
      this.dispatch({ type: 'SUBMIT_PLEDGE', playerIndex: this.humanIndex, amount });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.autoPledgeAI();
    this.dispatch({ type: 'ADVANCE_PHASE' }); // PLEDGE → ACTION (the threshold beat)
    this.pump();
    this.onChange();
  }

  /** The human's pledge counts at this weight (Crown discount / Gambit surcharge). */
  humanPledgeWeight(): number {
    return getEffectivePledgeWeight(this.state, this.humanIndex, TUNABLES.CROWN_PLEDGE_DISCOUNT);
  }

  /** What the engine's AI would pledge for the human (a hint, not binding). */
  suggestedHumanPledge(): number {
    return choosePledge(this.state, this.humanIndex, this.seed);
  }

  /** Apply a human ACTION; then advance AI seats / phase as needed. */
  humanAction(cmd: Command): void {
    if (!this.isHumanTurn || this.isOver) return;
    this.lastError = null;
    try {
      this.dispatch(cmd);
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.pump();
    this.onChange();
  }

  // ─── Last Stand (§5.3, backlog T1-4) ─────────────────────────────

  /** The HALTED combat awaiting the human's Last Stand, or null. */
  get pendingLastStand(): PendingLastStand | null {
    return this.state.pendingLastStand ?? null;
  }

  /** The cards the human may still commit: hand MINUS the first-exchange commit. */
  lastStandRemainingHand(): number[] {
    const pending = this.state.pendingLastStand;
    if (!pending) return [];
    const remaining = [...this.state.players[pending.defenderIndex].hand];
    for (const c of pending.defenderCards) {
      const i = remaining.indexOf(c);
      if (i !== -1) remaining.splice(i, 1);
    }
    return remaining;
  }

  /** The card VALUES currently selected for the stand (mapped from the selection indices). */
  lastStandSelectedValues(): number[] {
    const remaining = this.lastStandRemainingHand();
    return this.lastStandSelection.filter(i => i >= 0 && i < remaining.length).map(i => remaining[i]);
  }

  /** Toggle one card (by its index in `lastStandRemainingHand()`) in/out of the stand. */
  toggleLastStandCard(index: number): void {
    if (this.state.pendingLastStand === undefined) return;
    const at = this.lastStandSelection.indexOf(index);
    if (at === -1) this.lastStandSelection.push(index);
    else this.lastStandSelection.splice(at, 1);
    this.onChange();
  }

  /** Commit the selected cards (empty selection ⇒ yield the stronghold) and resume the flow. */
  commitLastStand(): void {
    const pending = this.state.pendingLastStand;
    if (pending === undefined || this.isOver) return;
    this.lastError = null;
    const cardIds = this.lastStandSelectedValues();
    try {
      this.dispatch({ type: 'LAST_STAND_COMMIT', playerIndex: pending.defenderIndex, cardIds });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.lastStandSelection = [];
    this.pump();
    this.onChange();
  }

  // ─── Blood Pact: accusation / audit ─────────────────────────────

  /** Human opens an accusation; AI seats then vote via the pure chooser. */
  humanAccuse(accused: number): void {
    if (this.state.mode !== 'blood_pact' || this.isOver) return;
    this.lastError = null;
    try {
      this.dispatch({ type: 'INITIATE_ACCUSATION', accuserIndex: this.humanIndex, accusedIndex: accused });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    this.resolveAIVotes();
    this.pump();
    this.onChange();
  }

  /** Have every required AI voter weigh in on the open accusation. */
  private resolveAIVotes(): void {
    let guard = 0;
    while (this.state.accusationState && !this.isOver && guard < 8) {
      guard++;
      const acc = this.state.accusationState;
      const pending = this.state.players.find(
        p => p.index !== acc.accused && !p.isEliminated && !acc.votes.some(v => v.playerIndex === p.index),
      );
      if (!pending) break;
      const agree = chooseAccusationVote(this.state, pending.index, this.seed);
      this.dispatch({ type: 'ACCUSATION_VOTE', playerIndex: pending.index, agree });
    }
  }

  // ─── Wraith input + Death Bequest (§5.5, §13 P0-11) ──────────────

  /** The human Wraith names its ONE bounded afterlife input for the coming strike (routed as a cmd). */
  setWraithInput(kind: WraithInputKind): void {
    this.lastError = null;
    try {
      this.dispatch({ type: 'SET_WRAITH_INPUT', playerIndex: this.humanIndex, kind });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
    }
    this.onChange();
  }

  /** The human names (or updates) its Death Bequest. If the flow was paused for it, resume. */
  setBequest(choice: BequestChoiceInput): void {
    this.lastError = null;
    try {
      this.dispatch({ type: 'SET_BEQUEST', playerIndex: this.humanIndex, choice });
    } catch (e: unknown) {
      this.lastError = (e as Error).message;
      this.onChange();
      return;
    }
    if (this.awaitingBequest) {
      this.awaitingBequest = false;
      this.pump();
    }
    this.onChange();
  }

  /** The human's currently-recorded Wraith input for this round, or null. */
  wraithInput(): WraithInputKind | null {
    return this.state.wraithInputs?.[this.humanIndex] ?? null;
  }

  /** The human's currently-recorded Death Bequest, or null. */
  pendingBequest(): BequestChoiceInput | null {
    return this.state.pendingBequests?.[this.humanIndex] ?? null;
  }

  // ─── Legibility projections (§13 P0-11) ──────────────────────────

  /** A player's exposure meter (§13 P0-11): SAFE → can-lose-land → can-be-DEPOSED → deposed. */
  exposure(seat: number): Exposure {
    const p = this.state.players[seat];
    if (p.isEliminated) return 'eliminated';
    if (p.deposed) return 'deposed';
    const strongholds = livingStrongholdCount(this.state, seat);
    // Whisper protects the last stronghold (§12 #13) — the dark cannot depose yet.
    if (this.state.act === 'WHISPER') return strongholds >= 2 ? 'can-lose-land' : 'safe';
    if (strongholds <= 1) return 'can-be-deposed';
    return 'can-lose-land';
  }

  /** Push the one-shot "the tide has reached you" beat when the human first becomes depose-eligible. */
  private updateExposureBeat(): void {
    const now = this.exposure(this.humanIndex);
    const prev = this.prevHumanExposure;
    if (now === 'can-be-deposed' && prev !== 'can-be-deposed' && prev !== 'deposed' && prev !== 'eliminated') {
      this.narration.unshift({
        text: 'The tide has reached you. One more lost stronghold and you fall — the dark can DEPOSE you now.',
        kind: 'system',
      });
    }
    this.prevHumanExposure = now;
  }

  /** Project a RAID's outcome BEFORE committing (§13 P0-11). Cards are engine-auto (4g note). */
  raidProjection(defenderIndex: number): RaidProjection {
    const node = this.state.players[this.humanIndex].warlordNodeId;
    const atkBase = getPlayerPowerAtNode(this.state, this.humanIndex, node);
    const defBase = getPlayerPowerAtNode(this.state, defenderIndex, node);
    const defenseBonus =
      trailingDefenseBonus(this.state, this.humanIndex, defenderIndex) +
      stewardHomeDefenseBonus(this.state, defenderIndex, node);
    const defCards = chooseCombatCommit(this.state.players[defenderIndex].hand, defBase, atkBase, 1);
    const defPower = defBase + sum(defCards) + defenseBonus;

    // TAKE_LAND / ROUT are sized thin; CAPTURE sizes up to clear the margin — project each honestly.
    const landCards = chooseRaidAttackCommit(this.state, this.humanIndex, defenderIndex, node, false);
    const landPower = atkBase + sum(landCards);
    const landMargin = landPower - defPower;

    const capCards = chooseRaidAttackCommit(this.state, this.humanIndex, defenderIndex, node, true);
    const capPower = atkBase + sum(capCards);
    const capMarginVal = capPower - defPower;
    const captureMargin = effectiveCaptureMargin(this.state, this.humanIndex);

    const targets = legalRaidTargets(this.state, defenderIndex, node);
    const routTarget = targets.length > 0;
    const captureLegal = targets.some(id => canCapture(this.state, defenderIndex, node, id));
    // Whisper last-stronghold gate (§13 P0-10): TAKE_LAND is illegal pre-March vs a last stronghold.
    const landGated = !canTakeLand(this.state, defenderIndex, node);

    return {
      atkPower: landPower,
      defPower,
      margin: landMargin,
      captureMargin,
      takeLand: landMargin > 0 && !landGated,
      rout: landMargin > 0 && routTarget,
      capture: capMarginVal > 0 && capMarginVal >= captureMargin && captureLegal,
      landGated,
      routLegal: routTarget,
    };
  }

  /** Project a STRIKE vs the dark here (§13 P0-11). */
  strikeProjection(): { atkPower: number; skPower: number; margin: number } {
    const node = this.state.players[this.humanIndex].warlordNodeId;
    const base = getPlayerPowerAtNode(this.state, this.humanIndex, node);
    const skPower = getShadowkingPowerAtNode(this.state, node);
    const cards = chooseCombatCommit(this.state.players[this.humanIndex].hand, base, skPower, TUNABLES.COMBAT_COMMIT_MAX);
    const atkPower = base + sum(cards);
    return { atkPower, skPower, margin: atkPower - skPower };
  }

  /** Project an ASSAULT_HEART commit (§13 P0-11) — cards, and the heart HP it would face. */
  heartProjection(): { commit: number; hp: number } | null {
    const heart = this.state.shadowking.heart;
    if (!heart) return null;
    const hand = [...this.state.players[this.humanIndex].hand].sort((a, b) => b - a);
    const commit = sum(hand.slice(0, Math.min(hand.length, TUNABLES.COMBAT_COMMIT_MAX)));
    return { commit, hp: heart.hp };
  }

  // ─── Helpers for the view ───────────────────────────────────────

  describeEnding(): string {
    const reason = this.state.gameEndReason;
    const w = this.state.winner;
    switch (reason) {
      case 'territory_victory':
        return w === null ? 'The realm endures — a contested draw at the Last Dawn.'
          : `Player ${w + 1} wins on territory at the Last Dawn.`;
      case 'gambit_victory':
        return `Player ${(w ?? 0) + 1} seizes the throne — the Crown's Gambit pays off!`;
      case 'last_standing':
        return `Player ${(w ?? 0) + 1} is the last Warlord standing — the realm is theirs.`;
      case 'doom_complete':
        return w === null ? 'The Keystone is ash. Everyone loses.'
          : `The Keystone is ash — the traitor (Player ${w + 1}) wins.`;
      case 'attrition':
        return 'Every Warlord has fallen. The dark inherits the ashes.';
      default:
        return 'The game continues.';
    }
  }
}

/** Sum a list of card powers. */
function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/**
 * The round-1 Crown landmine callout (backlog T1-3, learnability #4) — pure, testable in both
 * polarities. Non-null ONLY when the game is at round 1 and the human seat holds the Crown:
 * the one-line beat that explains the surcharge + the hunt before the first pledge.
 */
export function crownCalloutText(state: GameState, humanIndex: number): string | null {
  if (state.round !== 1) return null;
  if (!state.players[humanIndex]?.crownHeld) return null;
  return '♛ You start with the Crown — you hold the most land, so the dark hunts YOU, ' +
    'and your pledged cards count for less. The Crown moves when the land does.';
}
