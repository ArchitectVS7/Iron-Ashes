/**
 * Stage 3e — elimination machinery (§5.5/§6, §13 P0-4/P0-5/P0-9, §7 D7).
 *
 * The load-bearing layer the 3a skeleton stubbed:
 *   - strikePool: feed (to the DARK, never the eliminator), cap+decay, Σ(power), lowest-id-first
 *     consumption, and the conservation invariant |hands|+|strikePool|+|removed| (§13 P0-4/§7 D7).
 *   - Reckoning AUTO-PRESSURE: deposes the most-production/least-engaged seat first; Reckoning-only;
 *     suppressed by a live heart assault; protects the Keep until last (§13 P0-5/P0-6, §12 #14).
 *   - Death-Curse targeting: leader/oathbreaker, NEVER the killer; dark-caused → beneficiary (§12 #26).
 *   - Ordering: simultaneous deposals → attrition; frozen pledge counts; bequest-oath exemption.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  resolveDeposals,
  runDawnPhase,
  runThreatPhase,
} from '../../src/v3/sequencer.js';
import {
  applyReckoningAutoPressure,
  cardsAccountedFor,
  consumeStrikePower,
  deathCurseTarget,
  decayStrikePool,
  feedHandToStrikePool,
  markStrippedByDark,
  markStrippedByRival,
  nearestClaimant,
  strikePoolPower,
} from '../../src/v3/elimination.js';
import { livingStrongholdCount } from '../../src/v3/combat.js';
import { withTunables } from '../../src/v3/tunables.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import type { GameState } from '../../src/v3/types.js';

/** Strip a single seat of all owned nodes (→ zero living strongholds). */
function stripSeat(state: GameState, seat: number): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    if (ns.owner === seat) ns.owner = null;
  }
}

// ─── strikePool: conservation, order, cap, decay (§13 P0-4 / §7 D7) ──

describe('Stage 3e — strikePool semantics + conservation (§13 P0-4, §7 D7)', () => {
  it('feeds an eliminated hand into the pool with Σ(power), preserving conservation', () => {
    const s = createGame(2, 'competitive', 1);
    s.players[0].hand = [1, 2, 3];
    s.players[1].hand = [4];
    const before = cardsAccountedFor(s);

    feedHandToStrikePool(s, 0);

    expect(s.players[0].hand.length).toBe(0);
    expect(strikePoolPower(s)).toBe(6);          // 1+2+3
    expect(cardsAccountedFor(s)).toBe(before);   // nothing created/destroyed
  });

  it('caps the pool at STRIKEPOOL_CAP, removing the OLDEST overflow from the game', () => {
    withTunables({ STRIKEPOOL_CAP: 2 }, () => {
      const s = createGame(2, 'competitive', 1);
      s.players[0].hand = [5, 6, 7, 8];           // fed in this order ⇒ ids 0..3 (5 oldest)
      const before = cardsAccountedFor(s);

      feedHandToStrikePool(s, 0);

      expect(s.shadowking.strikePool.map(c => c.power)).toEqual([7, 8]); // newest kept
      expect(s.removed).toEqual([5, 6]);                                 // oldest removed
      expect(cardsAccountedFor(s)).toBe(before);
    });
  });

  it('a strike consumes LOWEST-card-id cards first → a terminal removed set', () => {
    const s = createGame(2, 'competitive', 1);
    s.players[0].hand = [3, 1, 2];                // ids 0:3, 1:1, 2:2
    feedHandToStrikePool(s, 0);
    const before = cardsAccountedFor(s);

    const drawn = consumeStrikePower(s, 4);

    expect(drawn).toBe(4);                        // id0(3)+id1(1) = 4 ≥ 4, stop
    expect(s.removed).toEqual([3, 1]);           // consumed in id order
    expect(s.shadowking.strikePool.map(c => c.power)).toEqual([2]); // id2 survives
    expect(cardsAccountedFor(s)).toBe(before);
  });

  it('decay removes the OLDEST card each Dawn (conservation preserved)', () => {
    const s = createGame(2, 'competitive', 1);
    s.players[0].hand = [1, 2, 3];
    feedHandToStrikePool(s, 0);
    const before = cardsAccountedFor(s);

    decayStrikePool(s);

    expect(s.removed).toEqual([1]);                                  // oldest (id0)
    expect(s.shadowking.strikePool.map(c => c.power)).toEqual([2, 3]);
    expect(cardsAccountedFor(s)).toBe(before);
  });

  it('consuming more than the pool holds drains it without going negative', () => {
    const s = createGame(2, 'competitive', 1);
    s.players[0].hand = [2, 2];
    feedHandToStrikePool(s, 0);
    const drawn = consumeStrikePower(s, 999);
    expect(drawn).toBe(4);
    expect(s.shadowking.strikePool.length).toBe(0);
  });
});

// ─── Elimination feeds the DARK, not the eliminator (§5.5 / §12 #4) ──

describe('Stage 3e — elimination feeds the dark + the wraith afterlife (§5.5, §12 #4)', () => {
  it('an eliminated hand → strikePool (never the eliminator) + the Warlord joins as a Wraith', () => {
    const s = createGame(2, 'competitive', 3);
    s.act = 'MARCH';                              // depose unlocked past Whisper (§12 #13)
    s.players[1].hand = [2, 3];
    const eliminatorHandBefore = [...s.players[0].hand];

    stripSeat(s, 1);
    resolveDeposals(s);

    expect(s.players[1].isEliminated).toBe(true);
    expect(s.players[1].hand.length).toBe(0);                  // hand left the player
    expect(strikePoolPower(s)).toBe(5);                        // 2+3 fed to the dark
    expect(s.players[0].hand).toEqual(eliminatorHandBefore);   // NO inheritance (§12 #4)
    expect(s.shadowking.wraiths.some(w => w.seat === 1)).toBe(true);
  });

  it('simultaneous last-two deposals feed BOTH hands + both wraiths, then attrition (§12 #1/#2)', () => {
    const s = createGame(2, 'competitive', 99);
    s.act = 'RECKONING';
    s.players[0].hand = [4];
    s.players[1].hand = [1, 1];
    s.shadowking.heartAssaultLiveThisRound = true; // suppress auto-pressure to isolate the manual strip
    for (const ns of Object.values(s.board.state.nodes)) ns.owner = null; // strip everyone

    const { state: after } = runDawnPhase(s, new SeededRandom(99));

    expect(after.players.every(p => p.isEliminated)).toBe(true);
    expect(after.gameEndReason).toBe('attrition');
    expect(after.shadowking.wraiths.map(w => w.seat).sort()).toEqual([0, 1]);
    // Both hands were fed; the pool decays by STRIKEPOOL_DECAY at Dawn, so power ≤ the fed total.
    expect(strikePoolPower(after)).toBeGreaterThan(0);
  });
});

// ─── Reckoning auto-pressure (§6 / §13 P0-5/P0-6) ─────────────────

describe('Stage 3e — Reckoning auto-pressure targeting (§13 P0-5/P0-6)', () => {
  it('strips the MOST-PRODUCTION seat first (a non-Keep stronghold), marking it dark-caused', () => {
    const s = createGame(3, 'competitive', 5);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 1;          // seat 1 → leader (keep + 2 holdings)
    s.board.state.nodes[h[1]].owner = 1;
    const before = livingStrongholdCount(s, 1);

    const events = applyReckoningAutoPressure(s);

    expect(livingStrongholdCount(s, 1)).toBe(before - 1);     // one holding ashed
    expect(s.players[1].lastStripByDark).toBe(true);
    expect(livingStrongholdCount(s, 0)).toBe(1);             // others untouched
    expect(livingStrongholdCount(s, 2)).toBe(1);
    expect(events.some(e => e.type === 'NODE_ASHED')).toBe(true);
  });

  it('does NOTHING outside Reckoning', () => {
    const s = createGame(2, 'competitive', 5);
    s.act = 'MARCH';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 0;
    expect(applyReckoningAutoPressure(s)).toEqual([]);
    expect(livingStrongholdCount(s, 0)).toBe(2);
  });

  it('is SUPPRESSED by a live heart assault (§13 P0-6)', () => {
    const s = createGame(2, 'competitive', 5);
    s.act = 'RECKONING';
    s.shadowking.heartAssaultLiveThisRound = true;
    expect(applyReckoningAutoPressure(s)).toEqual([]);
    expect(livingStrongholdCount(s, 0)).toBe(1);
  });

  it('deposes the turtle DIRECTLY when only the Keep remains (Keep-ashing rule §2/§12 #14)', () => {
    const s = createGame(2, 'competitive', 9);
    s.act = 'RECKONING';
    // Both hold only their Keep (tie on production + grudge) → lowest seat 0 is targeted.
    applyReckoningAutoPressure(s);
    expect(s.players[0].deposed).toBe(true);
    expect(s.players[0].lastStripByDark).toBe(true);
    // The Keep is NOT ashed yet — that happens at resolveDeposals once the seat is eliminated.
    expect(s.board.state.nodes[s.players[0].warlordNodeId].ashed).toBe(false);
  });

  it('the Reckoning DAWN auto-pressure + deposal restores the attrition executioner', () => {
    const s = createGame(2, 'competitive', 21);
    s.act = 'RECKONING';
    // Reduce both to only their Keep so a single Dawn of pressure + the zero-stronghold rule bites.
    const { state: after } = runDawnPhase(s, new SeededRandom(21));
    // At least one seat is pressured/eliminated this Dawn (deterministic; the exact end may be
    // last_standing or attrition depending on seat order, but the dark is now a credible executioner).
    expect(after.players.some(p => p.isEliminated || p.deposed)).toBe(true);
  });
});

// ─── Death-Curse targeting (§13 P0-9 / §12 #26) ───────────────────

describe('Stage 3e — Death-Curse targeting rule (§13 P0-9, §12 #26)', () => {
  it('rival-caused: targets the board LEADER, NEVER the killer', () => {
    const s = createGame(3, 'competitive', 2);
    markStrippedByRival(s, 1, 2, 'someNode');     // seat 2 stripped seat 1
    // Eligible = living \ {victim 1, killer 2} = {0}. Leader among them = 0. Never the killer (2).
    expect(deathCurseTarget(s, 1)).toBe(0);
  });

  it('rival-caused: prefers an OATHBREAKER over the bare leader', () => {
    const s = createGame(4, 'competitive', 2);
    markStrippedByRival(s, 1, 2, 'n');
    s.players[3].oathbreaker = true;              // 3 is the deserving target
    expect(deathCurseTarget(s, 1)).toBe(3);
  });

  it('dark-caused: redirects to the living BENEFICIARY (nearest claimant of the ashed land)', () => {
    const s = createGame(3, 'competitive', 2);
    const def = s.board.definition;
    const node = def.holdingIds[0];
    for (const ns of Object.values(s.board.state.nodes)) ns.owner = null; // no closer claimant
    s.board.state.nodes[node].ashed = true;
    const nbr = def.nodes[node].connections[0];
    s.board.state.nodes[nbr].owner = 2;           // seat 2 = nearest claimant
    markStrippedByDark(s, 1, node);

    expect(nearestClaimant(s, node, 1)).toBe(2);
    expect(deathCurseTarget(s, 1)).toBe(2);
  });

  it('dark-caused with NO living claimant falls through to the meta target (leader)', () => {
    const s = createGame(3, 'competitive', 2);
    for (const ns of Object.values(s.board.state.nodes)) ns.owner = null;
    markStrippedByDark(s, 1, s.board.definition.holdingIds[0]);
    // No beneficiary → meta target among {0,2} (killer is null for a dark kill) → leader = seat 0.
    expect(deathCurseTarget(s, 1)).toBe(0);
  });
});

// ─── Ordering / determinism (§7 D5/D7, §12 #11/#23) ───────────────

describe('Stage 3e — ordering + determinism (§7, §12)', () => {
  it('THREAT resets heartAssaultLiveThisRound to false (§13 P0-6)', () => {
    const s = createGame(2, 'competitive', 4);
    s.shadowking.heartAssaultLiveThisRound = true;
    s.phase = 'THREAT';
    runThreatPhase(s);
    expect(s.shadowking.heartAssaultLiveThisRound).toBe(false);
  });

  it('a bequest-oath survives the eliminated-player oath-dissolve sweep (§12 #23 hook)', () => {
    const s = createGame(3, 'competitive', 8);
    s.act = 'MARCH';
    s.oaths.push({ a: 1, b: 2, swornRound: 1, strain: 0 });                  // normal oath
    s.oaths.push({ a: 0, b: 2, swornRound: 1, strain: 0, viaBequest: true }); // bequest oath
    stripSeat(s, 2);
    resolveDeposals(s);
    // The normal oath involving the eliminated seat 2 dissolves; the bequest oath persists.
    expect(s.oaths.some(o => o.a === 1 && o.b === 2)).toBe(false);
    expect(s.oaths.some(o => o.viaBequest === true)).toBe(true);
  });

  it('stronghold definition: a seat holding ANY living production node is NOT deposed (§12 #14)', () => {
    const s = createGame(2, 'competitive', 6);
    s.act = 'RECKONING';
    s.shadowking.heartAssaultLiveThisRound = true; // suppress auto-pressure for a clean check
    stripSeat(s, 1);
    s.board.state.nodes[s.board.definition.holdingIds[0]].owner = 1; // one Holding = a stronghold
    resolveDeposals(s);
    expect(s.players[1].isEliminated).toBe(false);
  });

  it('feed + consume are deterministic (byte-identical pool/removed across two runs)', () => {
    const run = (): string => {
      const s = createGame(2, 'competitive', 1);
      s.players[0].hand = [4, 1, 3, 2];
      feedHandToStrikePool(s, 0);
      consumeStrikePower(s, 5);
      decayStrikePool(s);
      return JSON.stringify({ pool: s.shadowking.strikePool, removed: s.removed, seq: s.shadowking.strikePoolSeq });
    };
    expect(run()).toBe(run());
  });
});
