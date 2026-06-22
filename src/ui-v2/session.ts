/**
 * GameSession — the UI's driver over the v2 engine (Stage 3e).
 *
 * Render-from-state contract: the session owns a single `GameState`, and EVERY
 * mutation goes through the one `applyCommand` reducer (ALGORITHM §7). The human
 * occupies seat 0; all other seats are AI, driven by the pure `f(state, seed)`
 * choosers from the engine. The view never mutates state — it calls these
 * methods and re-renders from `session.state`.
 *
 * The session also sequences the phases: it auto-pledges/auto-acts for AI seats
 * and only stops to wait for human input at the human's decision points
 * (the Pledge, and the human's ACTION turn).
 */

import {
  createGame,
  applyCommand,
  choosePledge,
  runAIPledge,
  runAITurn,
  chooseAccusationVote,
  type Command,
  type GameEvent,
  type GameMode,
  type GameState,
} from '../v2/index.js';

/** A short on-screen narration line (villain voice, beats, results). */
export interface Narration {
  readonly text: string;
  readonly kind: 'villain' | 'beat' | 'system';
}

export class GameSession {
  state: GameState;
  readonly humanIndex = 0;
  readonly seed: number;

  /** Called after any state change so the host can re-render. */
  onChange: () => void = () => {};

  /** The most recent reducer events (for one-shot beats / voice lines). */
  recentEvents: GameEvent[] = [];
  /** A rolling narration feed shown in the HUD. */
  narration: Narration[] = [];
  /** Last rejected-input message (e.g. an illegal MARCH), shown then cleared. */
  lastError: string | null = null;

  constructor(playerCount: number, mode: GameMode, seed: number) {
    this.seed = seed;
    // Seat 0 is the lone human; the rest are AI.
    this.state = createGame(playerCount, mode, seed, 1);
  }

  // ─── Core dispatch ──────────────────────────────────────────────

  private dispatch(cmd: Command): void {
    const result = applyCommand(this.state, cmd);
    this.state = result.state;
    this.recentEvents = result.events;
    this.absorbNarration(result.events);
  }

  /** Pull villain lines and notable beats out of the event stream. */
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
      } else if (e.type === 'GAME_OVER') {
        this.narration.unshift({ text: this.describeEnding(), kind: 'system' });
      }
    }
    this.narration = this.narration.slice(0, 8);
  }

  // ─── Phase flow ─────────────────────────────────────────────────

  get phase(): GameState['phase'] { return this.state.phase; }
  get isOver(): boolean { return this.state.gameEndReason !== null; }
  get isHumanTurn(): boolean {
    return this.state.phase === 'ACTION' && this.state.activePlayerIndex === this.humanIndex;
  }

  /** THREAT → PLEDGE. The Shadowking telegraph is set during this step. */
  advanceFromThreat(): void {
    if (this.state.phase !== 'THREAT' || this.isOver) return;
    this.dispatch({ type: 'ADVANCE_PHASE' });
    this.onChange();
  }

  /**
   * Submit the human's pledge, auto-pledge every AI seat, resolve the Pledge,
   * then run AI ACTION turns up to the human's turn (or end of phase).
   */
  submitHumanPledge(amount: number): void {
    if (this.state.phase !== 'PLEDGE' || this.isOver) return;

    this.dispatch({ type: 'SUBMIT_PLEDGE', playerIndex: this.humanIndex, amount });

    // AI seats pledge (concealed in blood_pact, but the engine handles that).
    for (const p of this.state.players) {
      if (p.index === this.humanIndex) continue;
      if (this.state.pledgeBuffer.some(e => e.playerIndex === p.index)) continue;
      this.state = runAIPledge(this.state, p.index, this.seed).state;
    }

    // Resolve PLEDGE → ACTION (the threshold beat).
    this.dispatch({ type: 'ADVANCE_PHASE' });

    this.runAIUntilHumanOrDone();
    this.onChange();
  }

  /** The human's pledge counts at this weight (Crown discount / Gambit surcharge). */
  humanPledgeWeight(): number {
    const p = this.state.players[this.humanIndex];
    if (this.state.gambit?.named && this.state.gambit.claimant === this.humanIndex) return 0.25;
    return p.crownHeld ? 0.5 : 1.0;
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
    if (!this.isHumanTurn) this.runAIUntilHumanOrDone();
    this.onChange();
  }

  /** Run AI ACTION turns until it's the human's turn again, the phase ends, or game over. */
  private runAIUntilHumanOrDone(): void {
    let guard = 0;
    while (!this.isOver && this.state.phase === 'ACTION' && guard < 64) {
      guard++;
      const active = this.state.activePlayerIndex;

      if (active === this.humanIndex && this.state.players[active].actionsRemaining > 0) {
        return; // wait for the human
      }

      if (active !== this.humanIndex && this.state.players[active].actionsRemaining > 0) {
        this.maybeAIAccuse(active);
        if (this.isOver) return;
        this.state = runAITurn(this.state, active, this.seed).state;
        continue;
      }

      // Active player is out of actions. If the whole phase is done, roll to Dawn.
      if (this.state.turnOrderPosition >= this.state.turnOrder.length) {
        this.dispatch({ type: 'ADVANCE_PHASE' }); // ACTION → DAWN → next THREAT
        return;
      }
      // Otherwise nudge: a PASS advances the pointer (defensive).
      this.dispatch({ type: 'PLAYER_ACTION', playerIndex: active, action: { type: 'PASS' } });
    }
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
    this.onChange();
  }

  /** Have every required AI voter weigh in on the open accusation. */
  private resolveAIVotes(): void {
    let guard = 0;
    while (this.state.accusationState && !this.isOver && guard < 8) {
      guard++;
      const acc = this.state.accusationState;
      const pending = this.state.players.find(
        p => p.index !== acc.accused && !acc.votes.some(v => v.playerIndex === p.index),
      );
      if (!pending) break;
      const agree = chooseAccusationVote(this.state, pending.index, this.seed);
      this.dispatch({ type: 'ACCUSATION_VOTE', playerIndex: pending.index, agree });
    }
  }

  /** An AI may open an accusation at the start of its turn (kept conservative). */
  private maybeAIAccuse(_aiIndex: number): void {
    // Engine supports AI-initiated accusations; the UI keeps the human in the
    // driver's seat for the social call, so AI self-initiation is left to the
    // Stage-4 sim. (Hook intentionally a no-op here.)
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
      case 'doom_complete':
        return w === null ? 'The Keystone is ash. Everyone loses.'
          : `The Keystone is ash — the traitor (Player ${w + 1}) wins.`;
      case 'all_broken':
        return 'Every Warlord is Broken. The dark inherits the ashes.';
      default:
        return 'The game continues.';
    }
  }
}
