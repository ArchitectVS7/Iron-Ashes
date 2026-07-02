/**
 * T2-2 — RE-ARM "hiding is dangerous" (§6 / §13 P0-5, backlog T2-2).
 *
 * Two halves:
 *   1. The ENGAGEMENT TALLY — a deterministic cumulative per-seat count of anti-dark
 *      engagement: +1 per card pledged, +1 per card committed to a STRIKE, +1 per card
 *      committed to ASSAULT_HEART, +1 per PARLEY (the card-free verb still counts).
 *   2. The RECKONING BLIGHT PRESSURE (`applyReckoningBlightPressure`) — each Reckoning
 *      Dawn the dark advances RECKONING_AUTOPRESSURE_BLIGHT on the LEAST-ENGAGED living
 *      seat's most-imperiled stronghold (non-Keep first). Land pressure that telegraphs
 *      one Dawn before it ashes — NOT the disarmed instant strip (NODES=0 unchanged).
 *      Suppressed by a live heart assault (P0-6) and once the dark has fallen.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeParley, executeRecruit, executeStrike } from '../../src/v3/actions.js';
import { executeAssaultHeart, spawnHeartAtReckoning } from '../../src/v3/heart.js';
import { applyReckoningBlightPressure } from '../../src/v3/elimination.js';
import { resolvePledgePhase, runThreatPhase, runDawnPhase } from '../../src/v3/sequencer.js';
import { WARLORD_POWER, getTunables, withTunables } from '../../src/v3/tunables.js';
import { SeededRandom } from '../../src/utils/seeded-random.js';
import type { GameState } from '../../src/v3/types.js';

/** Place a player's Warlord on a node (mirrors the on-board piece). */
function placeWarlord(state: GameState, seat: number, nodeId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.owner === seat && p.type === 'warlord'));
  }
  state.players[seat].warlordNodeId = nodeId;
  state.board.state.nodes[nodeId].pieces.push({
    id: `warlord-${seat}`, type: 'warlord', owner: seat, power: WARLORD_POWER, nodeId,
  });
  const cp = state.players[seat].court.find(c => c.archetype === 'warlord');
  if (cp) cp.node = nodeId;
}

// ─── The engagement tally ─────────────────────────────────────────

describe('T2-2 — engagement tally (pledge / STRIKE / heart / PARLEY)', () => {
  it('starts at 0 for every seat', () => {
    const s = createGame(4, 'competitive', 11);
    expect(s.players.map(p => p.engagement)).toEqual([0, 0, 0, 0]);
  });

  it('a pledge adds its card amount (0-pledges add nothing)', () => {
    const s = createGame(2, 'competitive', 7);
    runThreatPhase(s);
    s.players[0].hand = [3, 3, 3];
    s.players[1].hand = [2];
    s.pledgeBuffer = [
      { playerIndex: 0, amount: 2, tier: 'high' },
      { playerIndex: 1, amount: 0, tier: 'none' },
    ];
    resolvePledgePhase(s);
    expect(s.players[0].engagement).toBe(2);
    expect(s.players[1].engagement).toBe(0);
  });

  it('a STRIKE adds the committed card count, win or lose', () => {
    const s = createGame(4, 'competitive', 42);
    const node = 'holding-ne'; // a dark spawn seam — has a DK
    expect(s.board.state.nodes[node].shadowkingForces.length).toBeGreaterThan(0);
    placeWarlordOn(s, 0, node);
    s.players[0].hand = [4, 4];
    executeStrike(s, 0, [4]);
    expect(s.players[0].engagement).toBe(1);
  });

  it('an ASSAULT_HEART adds the committed card count', () => {
    const s = createGame(3, 'competitive', 7);
    s.act = 'RECKONING';
    spawnHeartAtReckoning(s);
    placeWarlord(s, 0, s.board.definition.keystoneId);
    s.players[0].hand = [4, 4, 3];
    executeAssaultHeart(s, 0, [4, 4]);
    expect(s.players[0].engagement).toBe(2);
  });

  it('a PARLEY adds 1 (the card-free verb still counts)', () => {
    const s = createGame(4, 'competitive', 42);
    s.players[0].banners = 5;
    executeRecruit(s, 0); // political stance, Herald at the Warlord's node
    const heraldNode = s.players[0].heraldNodeId!;
    s.board.state.nodes[heraldNode].blightLevel = 1;
    s.board.state.nodes[heraldNode].ashed = false;
    executeParley(s, 0);
    expect(s.players[0].engagement).toBe(1);
  });
});

/** Stand player `p`'s Warlord on `node` as a real piece (so it has combat power there). */
function placeWarlordOn(state: GameState, p: number, node: string): void {
  const ns = state.board.state.nodes[node];
  ns.pieces.push({ id: `warlord-${p}`, type: 'warlord', owner: p, power: WARLORD_POWER, nodeId: node });
  state.players[p].warlordNodeId = node;
}

// ─── The Reckoning blight pressure ────────────────────────────────

describe('T2-2 — Reckoning blight pressure (applyReckoningBlightPressure)', () => {
  it('blights the LEAST-ENGAGED seat\'s land (non-Keep first) — a telegraph, not an instant strip', () => {
    const s = createGame(3, 'competitive', 5);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 1; // seat 1 holds a HOARD (2+ non-Keep nodes)
    s.board.state.nodes[h[1]].owner = 1;
    s.players[0].engagement = 5;
    s.players[1].engagement = 0; // the hider
    s.players[2].engagement = 3;

    const events = applyReckoningBlightPressure(s);

    const amt = getTunables().RECKONING_AUTOPRESSURE_BLIGHT;
    expect(amt).toBeGreaterThan(0); // the shipped lever is ARMED (the T2-2 objective)
    expect(s.board.state.nodes[h[0]].blightLevel).toBe(amt); // a holding, NOT the Keep
    expect(s.board.state.nodes[s.players[1].warlordNodeId].blightLevel).toBe(0);
    expect(s.board.state.nodes[h[0]].ashed).toBe(false); // telegraphs before it ashes
    expect(events.some(e => e.type === 'BLIGHT_ADVANCED' && e.source === 'autopressure')).toBe(true);
    expect(events.some(e => e.type === 'SK_VOICE_LINE')).toBe(true);
  });

  it('ties on engagement break toward MOST production, then lowest seat', () => {
    const s = createGame(3, 'competitive', 5);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 2; // seat 2 = biggest hoard, all engagements tied at 0
    s.board.state.nodes[h[1]].owner = 2;

    applyReckoningBlightPressure(s);

    const blighted = [h[0], h[1]].filter(id => s.board.state.nodes[id].blightLevel > 0);
    expect(blighted.length).toBe(1); // exactly one of the hoarder's holdings pressured
    expect(s.board.state.nodes[s.players[0].warlordNodeId].blightLevel).toBe(0);
    expect(s.board.state.nodes[s.players[1].warlordNodeId].blightLevel).toBe(0);
  });

  it('re-targets whoever ENGAGES least — pressure moves off a seat that steps up', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 0;
    s.board.state.nodes[h[1]].owner = 0;
    s.board.state.nodes[h[2]].owner = 1;
    s.board.state.nodes[h[3]].owner = 1;
    s.players[0].engagement = 0;
    s.players[1].engagement = 4;
    s.players[2].engagement = 8;
    applyReckoningBlightPressure(s);
    const seat0Blight = s.board.state.nodes[h[0]].blightLevel + s.board.state.nodes[h[1]].blightLevel;
    expect(seat0Blight).toBeGreaterThan(0); // seat 0 pressured

    s.players[0].engagement = 9; // seat 0 stepped up — now seat 1 hides
    applyReckoningBlightPressure(s);
    const seat1Blight = s.board.state.nodes[h[2]].blightLevel + s.board.state.nodes[h[3]].blightLevel;
    expect(seat1Blight).toBeGreaterThan(0); // pressure moved
  });

  it('skips eliminated seats — the gaze only weighs the LIVING', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 2; // the eliminated seat still "owns" land on the map
    s.board.state.nodes[h[1]].owner = 2;
    s.board.state.nodes[h[2]].owner = 1;
    s.board.state.nodes[h[3]].owner = 1;
    s.players[2].isEliminated = true;    // dead + engagement 0 — but never targeted
    s.players[0].engagement = 4;
    s.players[1].engagement = 6;

    applyReckoningBlightPressure(s);

    expect(s.board.state.nodes[h[0]].blightLevel + s.board.state.nodes[h[1]].blightLevel).toBe(0);
    expect(s.board.state.nodes[h[2]].blightLevel + s.board.state.nodes[h[3]].blightLevel)
      .toBeGreaterThan(0); // the quietest LIVING hoard is pressured, the dead seat's land spared
  });

  it('does NOTHING outside Reckoning / when the dark has fallen / at magnitude 0', () => {
    const s = createGame(2, 'competitive', 5);
    s.act = 'MARCH';
    expect(applyReckoningBlightPressure(s)).toEqual([]);

    s.act = 'RECKONING';
    s.shadowking.darkDefeated = true;
    expect(applyReckoningBlightPressure(s)).toEqual([]);

    s.shadowking.darkDefeated = false;
    withTunables({ RECKONING_AUTOPRESSURE_BLIGHT: 0 }, () => {
      expect(applyReckoningBlightPressure(s)).toEqual([]);
    });
  });

  it('is SUPPRESSED by a live heart assault (P0-6 — engaging the heart IS engagement)', () => {
    const s = createGame(2, 'competitive', 5);
    s.act = 'RECKONING';
    s.shadowking.heartAssaultLiveThisRound = true;
    expect(applyReckoningBlightPressure(s)).toEqual([]);
  });

  it('NEVER targets a Keep — a keep-only seat is skipped for the next quietest HOARD', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    // Seat 0 = quietest but holds ONLY its Keep; seat 1 engaged more but hoards two holdings.
    s.board.state.nodes[h[0]].owner = 1;
    s.board.state.nodes[h[1]].owner = 1;
    s.players[0].engagement = 0;
    s.players[1].engagement = 5;
    s.players[2].engagement = 9;

    applyReckoningBlightPressure(s);

    expect(s.board.state.nodes[s.board.definition.keepIds[0]].blightLevel).toBe(0); // Keep spared
    expect(s.board.state.nodes[h[0]].blightLevel + s.board.state.nodes[h[1]].blightLevel)
      .toBeGreaterThan(0); // the next quietest HOARD is pressured
    expect(s.players.every(p => !p.deposed)).toBe(true); // pressure in LAND, not deposals
  });

  it('SPARES THE BROKEN — a seat down to ONE productive node is never pressured', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING';
    const h = s.board.definition.holdingIds;
    s.board.state.nodes[h[0]].owner = 0; // seat 0: quietest, but only ONE non-Keep node left
    s.board.state.nodes[h[1]].owner = 1; // seat 1: a 2-node hoard, engaged more
    s.board.state.nodes[h[2]].owner = 1;
    s.players[0].engagement = 0;
    s.players[1].engagement = 5;
    s.players[2].engagement = 9;

    applyReckoningBlightPressure(s);

    expect(s.board.state.nodes[h[0]].blightLevel).toBe(0); // the shrunken seat is spared
    expect(s.board.state.nodes[h[1]].blightLevel + s.board.state.nodes[h[2]].blightLevel)
      .toBeGreaterThan(0); // the pressure moves to the next quietest HOARD
  });

  it('is a NO-OP when every living seat is keep-only (nothing to pressure but Keeps)', () => {
    const s = createGame(3, 'competitive', 9);
    s.act = 'RECKONING'; // default start: every seat holds only its Keep
    expect(applyReckoningBlightPressure(s)).toEqual([]);
  });

  it('runs in the Dawn phase and is deterministic (same seed ⇒ same board + events)', () => {
    const run = (): { s: GameState; pressured: boolean } => {
      const s = createGame(3, 'competitive', 21);
      s.act = 'RECKONING';
      s.board.state.nodes[s.board.definition.holdingIds[0]].owner = 0; // a 2-node hoard
      s.board.state.nodes[s.board.definition.holdingIds[1]].owner = 0; // (the pressure floor)
      s.players[2].engagement = 7;
      const { state, events } = runDawnPhase(s, new SeededRandom(21));
      return {
        s: state,
        pressured: events.some(e => e.type === 'BLIGHT_ADVANCED' && e.source === 'autopressure'),
      };
    };
    const a = run();
    const b = run();
    expect(JSON.stringify(a.s.board.state)).toBe(JSON.stringify(b.s.board.state));
    expect(a.pressured).toBe(b.pressured);
    expect(a.pressured).toBe(true); // no heart assault ran in this bare fixture — it fires
  });
});
