/**
 * Stage 3f — Residual Agency: the Death Bequest + the Wraith afterlife.
 *
 * ALGORITHM §5.5 + §13 P0-8 + §7 D6/D8 + §12 #23/#24/#26. Exercises the REAL exit beat and the
 * afterlife sweep through the engine — never a parallel rules path:
 *
 *   - DEATH BEQUEST (§5.5/§7 D8): at elimination the dying Warlord makes ONE final choice —
 *     BEQUEATH a held captive / remaining cards to a STANDING oath ally (forging a POSTHUMOUS Oath
 *     EXEMPT from the eliminated-player dissolve sweep, §12 #23), OR DEATH-CURSE the depersonalized
 *     leader/oathbreaker/beneficiary target (§13 P0-9 / §12 #26).
 *   - WRAITH (§13 P0-8 / §7 D6): each round ONE bounded input per wraith, capped at WRAITH_INPUT_CAP
 *     TOTAL, resolved in ascending ORIGINAL-SEAT order (§12 #24) — grudge NUDGES (on the BOARD
 *     LEADER, the dark's existing precedence; never a personal face) BEFORE the telegraph, strike-
 *     pool CARD-ADDS AFTER, in one fixed sweep.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { resolveDeposals, runThreatPhase } from '../../src/v3/sequencer.js';
import { addCourtPiece } from '../../src/v3/court.js';
import {
  capturePiece,
  decideBequest,
  applyDeathBequest,
  boardLeaderSeat,
  planWraithInputs,
  applyWraithNudges,
  applyWraithCardAdds,
  markStrippedByRival,
} from '../../src/v3/index.js';
import { CURSE_GRUDGE, WRAITH_GRUDGE_NUDGE, withTunables } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

/** Strip every node `seat` owns → zero strongholds → deposable at DAWN (past Whisper). */
function stripSeat(s: GameState, seat: number): void {
  for (const ns of Object.values(s.board.state.nodes)) {
    if (ns.owner === seat) ns.owner = null;
  }
}

/** Give `seat` an extra owned Holding so it is the clear production leader. */
function makeLeader(s: GameState, seat: number): void {
  for (const id of s.board.definition.holdingIds) {
    const ns = s.board.state.nodes[id];
    if (!ns.ashed) { ns.owner = seat; }
  }
}

// ─── Death Bequest (§5.5 / §7 D8 / §12 #23 / §12 #26) ─────────────

describe('Stage 3f — Death Bequest forges an exempt posthumous Oath (§12 #23)', () => {
  it('bequeaths a HELD captive to a standing ally + forges a dissolve-exempt Oath', () => {
    const s = createGame(3, 'competitive', 21);
    s.act = 'MARCH';
    s.oaths.push({ a: 0, b: 2, swornRound: 1, strain: 0 });       // seat 2 stands sworn to ally 0
    addCourtPiece(s, 1, 'marshal', 'holding-ne');                 // owned by seat 1
    capturePiece(s, 2, 1, 'marshal-1-0');                         // seat 2 holds it (captor = 2)

    stripSeat(s, 2);
    resolveDeposals(s);

    // The captive passed to the ally (NOT freed, NOT back to its owner) — captor re-assigned BEFORE
    // the captor-death freeing sweep, so it survives.
    const rec = s.captives.find(r => r.pieceId === 'marshal-1-0');
    expect(rec?.captorSeat).toBe(0);
    expect(s.players[1].court.find(c => c.id === 'marshal-1-0')?.captiveOf).toBe(0);
    // A posthumous Oath (0,2) persists; no NON-bequest oath of the eliminated seat survives.
    expect(s.oaths.some(o => o.a === 0 && o.b === 2 && o.viaBequest === true)).toBe(true);
    expect(s.oaths.some(o => (o.a === 2 || o.b === 2) && !o.viaBequest)).toBe(false);
  });

  it('bequeaths remaining CARDS to a standing ally (not the strike pool) + forges the Oath', () => {
    const s = createGame(3, 'competitive', 22);
    s.act = 'MARCH';
    s.oaths.push({ a: 0, b: 2, swornRound: 1, strain: 0 });
    s.players[2].hand = [4, 5];
    const allyBefore = s.players[0].hand.length;
    const poolBefore = s.shadowking.strikePool.length;

    stripSeat(s, 2);
    resolveDeposals(s);

    expect(s.players[2].hand.length).toBe(0);                      // the hand left the dying player
    expect(s.players[0].hand.length).toBe(allyBefore + 2);         // …to the ally
    expect(s.shadowking.strikePool.length).toBe(poolBefore);       // …NOT to the dark (no free spoils)
    expect(s.oaths.some(o => o.a === 0 && o.b === 2 && o.viaBequest === true)).toBe(true);
  });
});

describe('Stage 3f — Death-Curse uses the leader/oathbreaker/beneficiary rule (§13 P0-9 / §12 #26)', () => {
  it('with no standing ally, the curse hits the OATHBREAKER — never the killer or the victim', () => {
    const s = createGame(4, 'competitive', 31);
    s.act = 'MARCH';
    s.players[0].oathbreaker = true;                               // the deserving meta target
    markStrippedByRival(s, 1, 3, s.board.definition.keepIds[1]);   // killer = seat 3 (a rival)

    const choice = decideBequest(s, 1);
    expect(choice.kind).toBe('death_curse');

    applyDeathBequest(s, 1);
    expect(s.shadowking.grudge[0]).toBe(CURSE_GRUDGE);             // the oathbreaker is cursed
    expect(s.shadowking.grudge[3]).toBe(0);                        // NOT the killer
    expect(s.shadowking.grudge[1]).toBe(0);                        // NOT the victim
  });
});

// ─── Wraith afterlife (§13 P0-8 / §7 D6 / §12 #24) ────────────────

describe('Stage 3f — Wraith input cap + original-seat ordering (§12 #24)', () => {
  it('caps total inputs at WRAITH_INPUT_CAP and resolves in ascending original-seat order', () => {
    const s = createGame(4, 'competitive', 41);
    // Push out of seat order to prove the sweep SORTS by original seat.
    s.shadowking.wraiths = [
      { seat: 2, eliminatedRound: 1 },
      { seat: 0, eliminatedRound: 1 },
      { seat: 1, eliminatedRound: 1 },
    ];
    s.shadowking.strikePool = [{ id: 0, power: 4 }];               // a single card of ammo

    const plan = withTunables({ WRAITH_INPUT_CAP: 2 }, () => planWraithInputs(s));

    expect(plan.length).toBe(2);                                  // capped (the seat-2 wraith is dropped)
    expect(plan.map(d => d.seat)).toEqual([0, 1]);                // ascending original-seat order
    expect(plan[0].kind).toBe('card_add');                        // lowest seat spends the one card
    expect(plan[1].kind).toBe('nudge');                           // ammo gone → fall back to a nudge
  });
});

describe('Stage 3f — Wraith nudge intensifies the BOARD LEADER, never a personal pick (§13 P0-8)', () => {
  it('nudges the production leader even when another seat carries higher grudge', () => {
    const s = createGame(4, 'competitive', 51);
    makeLeader(s, 2);                                              // seat 2 is the production leader
    s.shadowking.grudge[1] = 5;                                   // seat 1 = a high-grudge "rival" face
    expect(boardLeaderSeat(s)).toBe(2);

    const plan = [{ seat: 0 as number, kind: 'nudge' as const }];
    applyWraithNudges(s, plan);

    expect(s.shadowking.grudge[2]).toBe(WRAITH_GRUDGE_NUDGE);      // the LEADER is intensified…
    expect(s.shadowking.grudge[1]).toBe(5);                       // …the personal-rival face is untouched
  });
});

describe('Stage 3f — one fixed THREAT sweep: nudges BEFORE telegraph, card-adds AFTER (§12 #24)', () => {
  it('grudge nudges land before the telegraph is computed (the dark targets the intensified leader)', () => {
    const s = createGame(4, 'competitive', 61);
    s.phase = 'THREAT';
    s.shadowking.grudge = [0, 0, 0, 0];
    makeLeader(s, 3);                                              // unique production leader
    s.crownHolder = null;
    s.shadowking.strikePool = [];                                 // no ammo ⇒ both wraiths NUDGE
    s.shadowking.wraiths = [
      { seat: 0, eliminatedRound: 1 },
      { seat: 1, eliminatedRound: 1 },
    ];

    runThreatPhase(s);

    // Two nudges (cap 2) raised the leader's grudge BEFORE the telegraph read it → the dark names it.
    expect(s.shadowking.grudge[3]).toBe(2 * WRAITH_GRUDGE_NUDGE);
    expect(s.shadowking.telegraph?.struckPlayerIndex).toBe(3);
  });

  it('card-adds land after the telegraph: a strike-pool card raises the threshold + is consumed', () => {
    const s = createGame(4, 'competitive', 62);
    s.phase = 'THREAT';
    s.shadowking.strikePool = [{ id: 0, power: 3 }];
    s.shadowking.wraiths = [{ seat: 0, eliminatedRound: 1 }];
    const removedBefore = s.removed.length;

    runThreatPhase(s);

    expect(s.shadowking.telegraph?.wraithStrikeBonus).toBe(3);    // committed to THIS round's strike
    expect(s.shadowking.strikePool.length).toBe(0);              // the card was consumed…
    expect(s.removed.length).toBe(removedBefore + 1);            // …removed-from-game (conservation)
  });

  it('applyWraithCardAdds is a no-op without a telegraph (sweep order safety)', () => {
    const s = createGame(4, 'competitive', 63);
    s.shadowking.telegraph = null;
    s.shadowking.strikePool = [{ id: 0, power: 2 }];
    const events = applyWraithCardAdds(s, [{ seat: 0, kind: 'card_add' }]);
    expect(events.length).toBe(0);
    expect(s.shadowking.strikePool.length).toBe(1);              // untouched — no telegraph to feed
  });
});
