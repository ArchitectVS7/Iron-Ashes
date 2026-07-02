/**
 * Stage 3d — Capture & Ransom (ALGORITHM §5.2/§5.3 + §13 P0-1/P0-2/P0-3/P0-10 + §12 #6/#22/#25).
 *
 * The capture economy that replaces the v2 RAID "wounds" outcome:
 *   - a winning RAID ELECTS exactly one of {TAKE_LAND, ROUT_PIECE, CAPTURE_PIECE} (never combined);
 *   - CAPTURE is margin-gated, the threshold RISING with the attacker's standing (military catch-up);
 *   - ROUT is a TEMPO loss — the piece returns next Dawn, capture/rout-immune;
 *   - RANSOM frees a captive, resource-negatively (a destroyed sink), with recapture immunity, and
 *     an ally-ransom may forge an Oath;
 *   - the captive guard cap force-releases over-cap captives at Dawn (lowest pieceId, to owner);
 *   - a captor's death frees its captives to their owners; Whisper protects a last retainer.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  executeRaid,
  executeRansom,
} from '../../src/v3/actions.js';
import {
  canTakeLand,
  capturePiece,
  enforceGuardCap,
  effectiveCaptureMargin,
  freeRetainerCount,
  guardCapacity,
  nearestStronghold,
  returnRoutedPieces,
} from '../../src/v3/index.js';
import { getPlayerPowerAtNode, trailingDefenseBonus, stewardHomeDefenseBonus } from '../../src/v3/combat.js';
import { addCourtPiece } from '../../src/v3/court.js';
import { resolveDeposals } from '../../src/v3/sequencer.js';
import { WARLORD_POWER, RANSOM_BANNERS, RANSOM_SINK_CUT, RECAPTURE_IMMUNE } from '../../src/v3/tunables.js';
import type { Act, GameState } from '../../src/v3/types.js';

const NODE = 'holding-ne';

/**
 * A controlled RAID arena: attacker (0) and defender (1) co-located on a defender-owned Holding,
 * defender hand emptied (no Last Stand noise). Returns the state. `act` defaults to MARCH.
 */
function arena(act: Act = 'MARCH'): GameState {
  const s = createGame(3, 'competitive', 7);
  s.act = act;
  const ns = s.board.state.nodes[NODE];
  ns.pieces = [];
  ns.shadowkingForces = [];
  ns.owner = 1; // defender owns the contested node (a stronghold)
  for (const seat of [0, 1]) {
    s.players[seat].warlordNodeId = NODE;
    s.players[seat].court[0].node = NODE;
    ns.pieces.push({ id: `warlord-${seat}`, type: 'warlord', owner: seat, power: WARLORD_POWER, nodeId: NODE });
  }
  s.players[1].hand = []; // no Last Stand
  return s;
}

describe('Stage 3d — elect exactly one effect (§5.2)', () => {
  it('CAPTURE_PIECE holds the retainer and does NOT take the node (one-effect-per-combat)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    s.players[0].hand = [4, 4, 4];
    const r = executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' });
    expect(r.state.board.state.nodes[NODE].owner).toBe(1); // node NOT transferred
    expect(s.captives).toHaveLength(1);
    expect(s.captives[0]).toMatchObject({ pieceId: 'marshal-1-0', ownerSeat: 1, captorSeat: 0 });
    // The held piece is off-board and flagged captive.
    expect(s.board.state.nodes[NODE].pieces.some(p => p.id === 'marshal-1-0')).toBe(false);
    expect(s.players[1].court.find(c => c.id === 'marshal-1-0')!.captiveOf).toBe(0);
  });

  it('ROUT_PIECE removes the piece from the board but does NOT take the node or capture', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'ROUT_PIECE', targetPieceId: 'marshal-1-0' });
    expect(s.board.state.nodes[NODE].owner).toBe(1);     // node NOT transferred
    expect(s.captives).toHaveLength(0);                  // NOT a capture
    expect(s.board.state.nodes[NODE].pieces.some(p => p.id === 'marshal-1-0')).toBe(false);
    expect(s.players[1].court.find(c => c.id === 'marshal-1-0')!.routedReturnRound).toBe(s.round);
  });

  it('TAKE_LAND (default) transfers the node and leaves the retainer in place', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], []); // default elect
    expect(s.board.state.nodes[NODE].owner).toBe(0);     // node taken
    expect(s.captives).toHaveLength(0);                  // no capture
    expect(s.board.state.nodes[NODE].pieces.some(p => p.id === 'marshal-1-0')).toBe(true); // retainer stays
  });
});

describe('Stage 5e — loosened co-location: capture a retainer with NO owner Warlord present (§5.2)', () => {
  it('a winning, margin-clearing RAID CAPTURES an unguarded retainer whose Warlord is elsewhere', () => {
    const s = arena();
    // The defender's retainer sits at NODE, but its Warlord marches OFF the node entirely.
    addCourtPiece(s, 1, 'marshal', NODE);
    const ns = s.board.state.nodes[NODE];
    ns.pieces = ns.pieces.filter(p => p.id !== 'warlord-1'); // pull the defender Warlord off
    s.players[1].warlordNodeId = 'keep-1';
    s.players[1].court[0].node = 'keep-1';
    expect(s.players[1].warlordNodeId).not.toBe(NODE);

    s.players[0].hand = [4, 4, 4];
    const r = executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' });
    // The unguarded retainer is taken even though its Warlord was absent.
    expect(s.captives.map(c => c.pieceId)).toEqual(['marshal-1-0']);
    expect(r.state.board.state.nodes[NODE].pieces.some(p => p.id === 'marshal-1-0')).toBe(false);
    expect(s.players[1].court.find(c => c.id === 'marshal-1-0')!.captiveOf).toBe(0);
  });

  it('a RAID against a seat with NO force at the node is still illegal (Warlord never directly capturable)', () => {
    const s = arena();
    const ns = s.board.state.nodes[NODE];
    // Defender has neither Warlord nor retainer here.
    ns.pieces = ns.pieces.filter(p => p.owner !== 1);
    s.players[1].warlordNodeId = 'keep-1';
    s.players[1].court[0].node = 'keep-1';
    s.players[0].hand = [4, 4, 4];
    expect(() => executeRaid(s, 0, 1, [4, 4, 4], [])).toThrow(/has no force at/);
  });
});

describe('Stage 3d — capture margin gate rises with standing (§5.2/§13 P0-2)', () => {
  it('the production leader needs a strictly larger margin than a trailing seat', () => {
    const s = createGame(4, 'competitive', 11);
    // Seat 0 leads (most production), give seat 3 the least → leader margin > trailing margin.
    s.board.state.nodes['holding-ne'].owner = 0;
    s.board.state.nodes['holding-nw'].owner = 0;
    const leaderMargin = effectiveCaptureMargin(s, 0);
    const trailMargin = effectiveCaptureMargin(s, 3);
    expect(leaderMargin).toBeGreaterThan(trailMargin);
  });

  it('a win below the standing-scaled margin cannot CAPTURE (it throws)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    const need = effectiveCaptureMargin(s, 0);
    const defPow = getPlayerPowerAtNode(s, 1, NODE)
      + trailingDefenseBonus(s, 0, 1) + stewardHomeDefenseBonus(s, 1, NODE);
    const atkBase = getPlayerPowerAtNode(s, 0, NODE);
    // Win by exactly need-1 → below the gate.
    const card = defPow + (need - 1) - atkBase;
    s.players[0].hand = [card];
    expect(() => executeRaid(s, 0, 1, [card], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' }))
      .toThrow(/Cannot CAPTURE/);
    expect(s.captives).toHaveLength(0);
  });

  it('a win at/above the margin DOES capture', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    const need = effectiveCaptureMargin(s, 0);
    const defPow = getPlayerPowerAtNode(s, 1, NODE)
      + trailingDefenseBonus(s, 0, 1) + stewardHomeDefenseBonus(s, 1, NODE);
    const atkBase = getPlayerPowerAtNode(s, 0, NODE);
    const card = defPow + need - atkBase; // win by exactly `need`
    s.players[0].hand = [card];
    executeRaid(s, 0, 1, [card], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' });
    expect(s.captives).toHaveLength(1);
  });
});

describe('Stage 3d — ROUT is a tempo loss, returns next Dawn (§13 P0-1)', () => {
  it('a routed piece returns to its owner\'s nearest stronghold, capture/rout-immune', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'ROUT_PIECE', targetPieceId: 'marshal-1-0' });
    const cp = s.players[1].court.find(c => c.id === 'marshal-1-0')!;
    expect(cp.routedReturnRound).toBe(s.round);

    // The Dawn that follows returns the piece (same-round Dawn = the "next Dawn").
    const events = returnRoutedPieces(s);
    expect(cp.routedReturnRound).toBeNull();
    expect(cp.recaptureImmuneUntil).toBe(s.round + RECAPTURE_IMMUNE);
    expect(cp.node).toBe(nearestStronghold(s, 1));
    expect(s.board.state.nodes[cp.node].pieces.some(p => p.id === 'marshal-1-0')).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it('an immune piece cannot be captured (recapture pump is dead, §5.3)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    const cp = s.players[1].court.find(c => c.id === 'marshal-1-0')!;
    cp.recaptureImmuneUntil = s.round + 5; // freshly returned / ransomed
    s.players[0].hand = [4, 4, 4];
    expect(() => executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' }))
      .toThrow(/Cannot CAPTURE/);
  });
});

describe('Stage 3d — RANSOM: resource-negative + immunity (§5.3)', () => {
  it('self-ransom destroys the sink, frees the piece, and sets immunity', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0'); // captor = 0, owner = 1
    s.players[1].banners = 10;
    s.players[1].hand = [2, 3];
    const totalBefore = s.players.reduce((sum, p) => sum + p.banners, 0);
    const captorBefore = s.players[0].banners;

    executeRansom(s, 1, 'marshal-1-0'); // owner ransoms its own piece

    // Resource-negative to the pair: exactly RANSOM_SINK_CUT banners leave the game.
    const totalAfter = s.players.reduce((sum, p) => sum + p.banners, 0);
    expect(totalAfter).toBe(totalBefore - RANSOM_SINK_CUT);
    // Captor receives RANSOM_BANNERS minus the sink.
    expect(s.players[0].banners).toBe(captorBefore + RANSOM_BANNERS - RANSOM_SINK_CUT);
    // Freed: off the captive ledger, back on board, immune.
    expect(s.captives).toHaveLength(0);
    const cp = s.players[1].court.find(c => c.id === 'marshal-1-0')!;
    expect(cp.captiveOf).toBeNull();
    expect(cp.recaptureImmuneUntil).toBe(s.round + RECAPTURE_IMMUNE);
    expect(s.board.state.nodes[cp.node].pieces.some(p => p.id === 'marshal-1-0')).toBe(true);
  });

  it('an ally-ransom by a consenting, oath-free pair forges an Oath (§5.3/§M)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0'); // captor 0, owner 1
    // Ally 2 stands at the captor's hold and pays the ransom.
    s.players[2].warlordNodeId = s.players[0].warlordNodeId;
    s.players[2].banners = 10;
    s.players[2].hand = [2, 3];

    executeRansom(s, 2, 'marshal-1-0', true);
    expect(s.captives).toHaveLength(0);
    expect(s.oaths.some(o => o.a === 1 && o.b === 2)).toBe(true);
  });

  it('a self-ransom never forges an Oath; an ally-ransom without consent does not either', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0');
    s.players[2].warlordNodeId = s.players[0].warlordNodeId;
    s.players[2].banners = 10;
    s.players[2].hand = [2, 3];
    executeRansom(s, 2, 'marshal-1-0', false); // no consent
    expect(s.oaths).toHaveLength(0);
  });
});

describe('Stage 3d — captive guard cap (§5.3/§12 #25)', () => {
  it('over-cap captives are force-released at Dawn (lowest pieceId, to original owner)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    addCourtPiece(s, 1, 'steward', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0');
    capturePiece(s, 0, 1, 'steward-1-0');
    expect(s.captives).toHaveLength(2);
    // Captor 0 has 0 marshals + 1 stronghold → capacity 1 (CAPTIVE_GUARD_CAP=1).
    expect(guardCapacity(s, 0)).toBe(1);

    enforceGuardCap(s);
    // Lowest pieceId ('marshal-1-0' < 'steward-1-0') released → only the steward stays held.
    expect(s.captives.map(r => r.pieceId)).toEqual(['steward-1-0']);
    const marshal = s.players[1].court.find(c => c.id === 'marshal-1-0')!;
    expect(marshal.captiveOf).toBeNull();
    expect(s.board.state.nodes[marshal.node].pieces.some(p => p.id === 'marshal-1-0')).toBe(true);
  });
});

describe('Stage 3d — captive on captor / owner death (§12 #6/#22)', () => {
  it('a captor\'s death FREES its captives to their original owners (§12 #6)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0'); // captor 0
    // Depose captor 0: strip its only stronghold (its Keep) — holding-ne is owned by 1.
    s.board.state.nodes[s.board.definition.keepIds[0]].owner = null;

    resolveDeposals(s);
    expect(s.players[0].isEliminated).toBe(true);
    expect(s.captives).toHaveLength(0);
    const cp = s.players[1].court.find(c => c.id === 'marshal-1-0')!;
    expect(cp.captiveOf).toBeNull();
    expect(s.board.state.nodes[cp.node].pieces.some(p => p.id === 'marshal-1-0')).toBe(true);
  });

  it('an eliminated owner\'s captive is removed-from-game (§12 #22)', () => {
    const s = arena();
    addCourtPiece(s, 1, 'marshal', NODE);
    capturePiece(s, 0, 1, 'marshal-1-0'); // owner 1, captor 0 (alive)
    // Depose owner 1: strip its strongholds (keep-1 and holding-ne).
    s.board.state.nodes[s.board.definition.keepIds[1]].owner = null;
    s.board.state.nodes[NODE].owner = null;

    resolveDeposals(s);
    expect(s.players[1].isEliminated).toBe(true);
    expect(s.captives).toHaveLength(0);
    // The captive piece is gone from the game (no return for a dead owner).
    expect(s.players[1].court.some(c => c.id === 'marshal-1-0')).toBe(false);
  });
});

describe('W2/T1-2 — Whisper protects the last stronghold from TAKE_LAND (§5.2/§12 #13, §13 P0-10)', () => {
  /** Make NODE the defender's LAST living stronghold (strip their pre-claimed Keep). */
  function lastStrongholdArena(act: Act = 'WHISPER'): GameState {
    const s = arena(act);
    s.board.state.nodes[s.board.definition.keepIds[1]].owner = null;
    return s;
  }

  it('canTakeLand is FALSE for a last stronghold in Whisper, TRUE past Whisper / for a non-last one', () => {
    const s = lastStrongholdArena('WHISPER');
    expect(canTakeLand(s, 1, NODE)).toBe(false);
    s.act = 'MARCH';
    expect(canTakeLand(s, 1, NODE)).toBe(true);
    // Give the keep back → NODE is no longer the last stronghold.
    s.act = 'WHISPER';
    s.board.state.nodes[s.board.definition.keepIds[1]].owner = 1;
    expect(canTakeLand(s, 1, NODE)).toBe(true);
  });

  it('a TAKE_LAND raid on a LAST living stronghold in Whisper is rejected BEFORE cards are spent', () => {
    const s = lastStrongholdArena('WHISPER');
    s.players[0].hand = [4, 4, 4];
    expect(() => executeRaid(s, 0, 1, [4, 4, 4], [])).toThrow(/last stronghold cannot be taken in Whisper/);
    expect(s.board.state.nodes[NODE].owner).toBe(1);   // node NOT transferred
    expect(s.players[0].hand).toEqual([4, 4, 4]);      // fail-fast: no cards spent
    expect(s.players[1].deposed).toBe(false);
  });

  it('the SAME node in MARCH is takeable — and taking a last stronghold flags the deposal', () => {
    const s = lastStrongholdArena('MARCH');
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], []);
    expect(s.board.state.nodes[NODE].owner).toBe(0);
    expect(s.players[1].deposed).toBe(true);
  });

  it('a NON-last stronghold in Whisper is still takeable (only the LAST is protected)', () => {
    const s = arena('WHISPER'); // defender still holds their Keep → NODE is not the last
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], []);
    expect(s.board.state.nodes[NODE].owner).toBe(0);
    expect(s.players[1].deposed).toBe(false);
  });

  it('a ROUT elect at the protected node stays legal in Whisper (only TAKE_LAND is gated)', () => {
    const s = lastStrongholdArena('WHISPER');
    addCourtPiece(s, 1, 'marshal', NODE);
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'ROUT_PIECE', targetPieceId: 'marshal-1-0' });
    expect(s.board.state.nodes[NODE].owner).toBe(1);   // land untouched
    expect(s.players[1].court.find(c => c.id === 'marshal-1-0')!.routedReturnRound).toBe(s.round);
  });
});

describe('Stage 3d — Whisper protects the last retainer (§13 P0-10)', () => {
  it('a player\'s LAST retainer cannot be captured in Whisper', () => {
    const s = arena('WHISPER');
    addCourtPiece(s, 1, 'marshal', NODE); // defender's only retainer
    expect(freeRetainerCount(s, 1)).toBe(1);
    s.players[0].hand = [4, 4, 4];
    expect(() => executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' }))
      .toThrow(/Cannot CAPTURE/);
    expect(s.captives).toHaveLength(0);
  });

  it('a non-last retainer CAN be captured in Whisper (severity ramp allows ≤1)', () => {
    const s = arena('WHISPER');
    addCourtPiece(s, 1, 'marshal', NODE);
    addCourtPiece(s, 1, 'steward', NODE); // now two retainers → capturing one is legal
    expect(freeRetainerCount(s, 1)).toBe(2);
    s.players[0].hand = [4, 4, 4];
    executeRaid(s, 0, 1, [4, 4, 4], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-1-0' });
    expect(s.captives.map(r => r.pieceId)).toEqual(['marshal-1-0']);
  });
});
