/**
 * Stage 3f — spec-parity mechanics tests.
 *
 * Real end-to-end coverage for the mechanics that the pre-Stage-4 review found
 * stubbed/dead/missing: the anti-free-rider reward (§4.2 step 5), the Gambit
 * Keystone guardrail (§6), Last Stand wired into live combat (§5.3), the
 * Shadowking effect table (§5.6), and the warlord-power / FORGE_WEIGHT bug fixes.
 * These exercise the REAL behaviour, not isolated predicates.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import {
  spreadShieldedOnSpoke,
  advanceBlightOnNode,
  applyShadowkingStrike,
  isKeystoneGarrisoned,
  chooseShadowkingIntent,
  chooseLastStandCards,
  computeTerritoryWinner,
  getPlayerPowerAtNode,
  executeRaid,
} from '../../src/v3/index.js';
import {
  WARLORD_POWER,
  FORGE_WEIGHT,
  PLEDGE_FAVOR_GRUDGE_REDUCTION,
  PLEDGE_SHIELD_AMOUNT,
  withTunables,
} from '../../src/v3/tunables.js';
import type { Command } from '../../src/v3/commands.js';
import type { GameState, ShadowkingTelegraph } from '../../src/v3/types.js';
import { stripStartingRetainers } from './fixtures.js';

function apply(state: GameState, cmd: Command): GameState {
  return applyCommand(state, cmd).state;
}

/** Move a player's Warlord to a node (test fixture). */
function placeWarlord(state: GameState, idx: number, nodeId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.owner === idx && p.type === 'warlord'));
  }
  state.players[idx].warlordNodeId = nodeId;
  state.board.state.nodes[nodeId].pieces.push({
    id: `warlord-${idx}`, type: 'warlord', owner: idx, power: WARLORD_POWER, nodeId,
  });
}

function totalBlight(state: GameState): number {
  return Object.values(state.board.state.nodes).reduce((s, n) => s + n.blightLevel, 0);
}

// ─── Bug fixes ────────────────────────────────────────────────────

describe('warlord power consistency (bug fix)', () => {
  it('a Warlord has the same power before and after marching', () => {
    let state = stripStartingRetainers(createGame(4, 'competitive', 42)); // bare Warlord (T2-1)
    state = apply(state, { type: 'ADVANCE_PHASE' });
    for (const p of state.players) state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: 0 });
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → ACTION

    const me = state.activePlayerIndex;
    const from = state.players[me].warlordNodeId;
    const powerBefore = getPlayerPowerAtNode(state, me, from);
    expect(powerBefore).toBe(WARLORD_POWER);

    const to = state.board.definition.nodes[from].connections[0];
    state.players[me].banners = 3;
    state = apply(state, { type: 'PLAYER_ACTION', playerIndex: me, action: { type: 'MARCH', targetNodeId: to } });

    expect(getPlayerPowerAtNode(state, me, to)).toBe(WARLORD_POWER); // not silently 2
  });
});

describe('FORGE_WEIGHT single source of truth (bug fix)', () => {
  it('territory victory weights a Forge by FORGE_WEIGHT, matching Crown computation', () => {
    const state = createGame(2, 'competitive', 42);
    // Clear everyone's lands, then give P0 one Forge and P1 (FORGE_WEIGHT-1) Holdings.
    for (const ns of Object.values(state.board.state.nodes)) ns.owner = null;
    state.board.state.nodes[state.board.definition.forgeIds[0]].owner = 0;
    for (let i = 0; i < FORGE_WEIGHT - 1; i++) {
      state.board.state.nodes[state.board.definition.holdingIds[i]].owner = 1;
    }
    // P0's single Forge (=FORGE_WEIGHT) must outscore P1's FORGE_WEIGHT-1 Holdings.
    expect(computeTerritoryWinner(state)).toBe(0);
  });
});

// ─── Anti-free-rider reward (§4.2 step 5) ─────────────────────────

describe('anti-free-rider reward (§4.2 step 5)', () => {
  it('a contributor earns a FAVOR (grudge reduction); a free-rider does not', () => {
    let state = createGame(4, 'competitive', 42);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE (decays grudge)
    state.shadowking.grudge[0] = 5; // contributor
    state.shadowking.grudge[1] = 5; // free-rider
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 0, amount: 2 });
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 1, amount: 0 });
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 2, amount: 1 });
    state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: 3, amount: 1 });
    state = apply(state, { type: 'ADVANCE_PHASE' }); // resolve PLEDGE

    expect(state.shadowking.grudge[0]).toBe(5 - PLEDGE_FAVOR_GRUDGE_REDUCTION); // rewarded
    expect(state.shadowking.grudge[1]).toBe(5); // free-rider unchanged
  });

  it('a contributor\'s own frontier land is shielded from the strike', () => {
    const make = (): GameState => {
      const s = createGame(4, 'competitive', 42);
      // Ash the two outer Holdings on quadrant 0's spoke so the frontier is keep-n (P0-owned).
      const keep = s.board.definition.keepIds[0];
      for (const c of s.board.definition.nodes[keep].connections) {
        if (s.board.definition.nodes[c].tier === 'holding') s.board.state.nodes[c].ashed = true;
      }
      return s;
    };
    const shielded = make();
    spreadShieldedOnSpoke(shielded, 0, 2, new Set([0])); // P0 pledged → shielded
    const unshielded = make();
    spreadShieldedOnSpoke(unshielded, 0, 2, new Set()); // no pledgers

    const keep = shielded.board.definition.keepIds[0];
    expect(shielded.board.state.nodes[keep].blightLevel)
      .toBe(unshielded.board.state.nodes[keep].blightLevel - PLEDGE_SHIELD_AMOUNT);
  });
});

// ─── Gambit Keystone guardrail (§6) ───────────────────────────────

describe('Gambit Keystone guardrail (§6)', () => {
  function garrisonedGame(): GameState {
    const state = createGame(4, 'competitive', 42);
    const ks = state.board.definition.keystoneId;
    placeWarlord(state, 0, ks);
    state.gambit = { claimant: 0, declaredRound: 1, named: true };
    return state;
  }

  it('a garrisoned Keystone cannot be blighted or ashed by any source', () => {
    const state = garrisonedGame();
    expect(isKeystoneGarrisoned(state)).toBe(true);
    const ks = state.board.definition.keystoneId;
    advanceBlightOnNode(state, ks, 99, 'strike');
    expect(state.board.state.nodes[ks].blightLevel).toBe(0);
    expect(state.board.state.nodes[ks].ashed).toBe(false);
  });

  it('the strike redirects to the keystone-adjacent ring instead of the Keystone', () => {
    const state = garrisonedGame();
    const ks = state.board.definition.keystoneId;
    const telegraph: ShadowkingTelegraph = {
      effect: 'SPREAD', targetNodeId: ks, doomCost: 3,
      struckPlayerIndex: 0, steerQuadrant: 0, firstPersonLine: 'x',
    };
    const before = totalBlight(state);
    applyShadowkingStrike(state, telegraph, 0); // fully un-averted
    expect(state.board.state.nodes[ks].blightLevel).toBe(0); // Keystone untouched
    // An Approach (keystone-adjacent) took the hit instead.
    const approachBlight = state.board.definition.approachIds
      .reduce((s, a) => s + state.board.state.nodes[a].blightLevel, 0);
    expect(approachBlight).toBeGreaterThan(0);
    expect(totalBlight(state)).toBeGreaterThan(before);
  });
});

// ─── Last Stand wired into live combat (§5.3) ─────────────────────

describe('Last Stand in live combat (§5.3)', () => {
  it('a defender reverses a losing RAID and holds the node', () => {
    const state = createGame(2, 'competitive', 42);
    const node = state.board.definition.holdingIds[0];
    state.board.state.nodes[node].owner = 1; // defender owns it
    placeWarlord(state, 0, node); // attacker
    placeWarlord(state, 1, node); // defender co-located
    state.players[0].hand = [4];     // attacker commits 4 → atk = 3+4 = 7
    state.players[1].hand = [1, 5];  // defender commits 1 (def=4), Last-Stands the 5

    const res = executeRaid(state, 0, 1, [4], [1]);

    expect(res.state.board.state.nodes[node].owner).toBe(1); // held via Last Stand
    expect(res.state.players[1].hand).not.toContain(5); // the Last Stand card was spent
  });

  it('chooseLastStandCards commits nothing when the stand cannot win', () => {
    const state = createGame(2, 'competitive', 42);
    state.players[1].hand = [1, 1];
    // Needs +10 but only holds 1s → hopeless, commit nothing.
    expect(chooseLastStandCards(state, 1, 15, 3, [])).toEqual([]);
  });
});

// ─── Shadowking effect table (§5.6) ───────────────────────────────

describe('Shadowking effect table (§5.6)', () => {
  function telegraph(effect: string, steer = 0, struck = 0): ShadowkingTelegraph {
    return { effect, targetNodeId: 'keystone', doomCost: 3, struckPlayerIndex: struck, steerQuadrant: steer, firstPersonLine: 'x' };
  }

  it('SURGE spreads more Blight than SPREAD', () => {
    // Pin a small spread base so the SURGE ×2 multiplier stays observable below
    // the per-node ash cap (the Stage-5c default SPREAD_AMOUNT_BASE=5 saturates
    // every steered node for both effects, masking the multiplier).
    withTunables({ SPREAD_AMOUNT_BASE: 1 }, () => {
      const a = createGame(4, 'competitive', 42);
      applyShadowkingStrike(a, telegraph('SPREAD'), 0);
      const b = createGame(4, 'competitive', 42);
      applyShadowkingStrike(b, telegraph('SURGE'), 0);
      expect(totalBlight(b)).toBeGreaterThan(totalBlight(a));
    });
  });

  it('MARCH_DK actually maneuvers a Death Knight toward the target', () => {
    const state = createGame(4, 'competitive', 42);
    const before = state.shadowking.forces.map(f => f.nodeId);
    applyShadowkingStrike(state, telegraph('MARCH_DK', 0, 0), 0);
    const after = state.shadowking.forces.map(f => f.nodeId);
    expect(after).not.toEqual(before); // at least one DK moved
  });

  it('REAP blights an exposed border stronghold', () => {
    const state = createGame(4, 'competitive', 42);
    const keep = state.board.definition.keepIds[0]; // owned by P0
    // Ash a neighbor so the keep is an exposed border.
    const neighbor = state.board.definition.nodes[keep].connections[0];
    state.board.state.nodes[neighbor].ashed = true;
    applyShadowkingStrike(state, telegraph('REAP'), 0);
    expect(state.board.state.nodes[keep].blightLevel).toBeGreaterThan(0);
  });

  it('the front steers toward the CROWN quadrant even when a different player is struck', () => {
    const state = createGame(4, 'competitive', 42);
    state.crownHolder = 2;            // leader sits in quadrant 2 (keep-s)
    state.shadowking.grudge[1] = 5;   // but grudge names player 1
    const intent = chooseShadowkingIntent(state);
    expect(intent.struckPlayerIndex).toBe(1); // named target = grudge
    expect(intent.steerQuadrant).toBe(2);     // steer = Crown's quadrant
  });
});

// Rescue → Oath tests removed (§8/§M): RESCUE is retired with the Broken Court. The
// ally-RANSOM-forges-an-Oath path returns with capture/ransom in 3d (§5.3).
