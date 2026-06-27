/**
 * Pre-balance hardening tests (Stage 4g).
 *
 * Locks in the fidelity + logic fixes that make the sweep data trustworthy:
 * value-aware combat commits (not hand[0]), pledge-spends-lowest-value, Death
 * Knight respawn on escalation, and AI Gambit contestation.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { chooseCombatCommit } from '../../src/v3/combat.js';
import { respawnDeathKnights } from '../../src/v3/shadowking-effects.js';
import { chooseAction } from '../../src/v3/ai-player.js';
import { ARCHETYPES } from '../../src/v3/sim/archetypes.js';
import { WARLORD_POWER } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';
import type { Command } from '../../src/v3/commands.js';

const apply = (s: GameState, c: Command): GameState => applyCommand(s, c).state;

function placeWarlord(state: GameState, idx: number, nodeId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.owner === idx && p.type === 'warlord'));
  }
  state.players[idx].warlordNodeId = nodeId;
  state.board.state.nodes[nodeId].pieces.push({ id: `warlord-${idx}`, type: 'warlord', owner: idx, power: WARLORD_POWER, nodeId });
}

describe('value-aware combat commit (P0 fidelity)', () => {
  it('commits the fewest best cards to win — not an arbitrary hand[0]', () => {
    // base 3 vs target 4 → need 2; best single card (4) wins.
    expect(chooseCombatCommit([4, 1, 2], 3, 4, 3)).toEqual([4]);
  });
  it('stacks cards when no single card wins', () => {
    expect(chooseCombatCommit([1, 1], 3, 4, 3)).toEqual([1, 1]); // need 2 → two 1s
  });
  it('commits nothing when already winning on base power', () => {
    expect(chooseCombatCommit([2, 3], 5, 3, 3)).toEqual([]);
  });
  it('commits the single best card when it cannot win (puts up a fight, no dump)', () => {
    expect(chooseCombatCommit([1], 3, 9, 3)).toEqual([1]);
  });
});

describe('pledge spends lowest-value cards (P0 fidelity)', () => {
  it('keeps the best cards for combat', () => {
    let state = createGame(4, 'competitive', 42);
    state = apply(state, { type: 'ADVANCE_PHASE' }); // → PLEDGE
    state.players[0].hand = [4, 1, 3, 2];
    for (const p of state.players) {
      state = apply(state, { type: 'SUBMIT_PLEDGE', playerIndex: p.index, amount: p.index === 0 ? 2 : 0 });
    }
    state = apply(state, { type: 'ADVANCE_PHASE' }); // resolve
    // The two lowest (1, 2) were spent; the two highest remain.
    expect(state.players[0].hand).toEqual([4, 3]);
  });
});

describe('Death Knight respawn (P1a)', () => {
  it('refills Death Knights up to the target at non-ashed seams', () => {
    const state = createGame(4, 'competitive', 42);
    // Kill all DKs.
    state.shadowking.forces = [];
    for (const ns of Object.values(state.board.state.nodes)) ns.shadowkingForces = [];
    respawnDeathKnights(state, 2);
    expect(state.shadowking.forces.filter(f => f.type === 'death_knight').length).toBe(2);
    const onBoard = Object.values(state.board.state.nodes).reduce((s, n) => s + n.shadowkingForces.length, 0);
    expect(onBoard).toBe(2);
  });
});

describe('AI contests a live rival Gambit (contestation)', () => {
  it('marches toward the Keystone to break a rival Gambit', () => {
    const state = createGame(4, 'competitive', 42);
    placeWarlord(state, 0, 'keep-n');
    state.players[0].banners = 5;
    // Player 1 holds a live, named Gambit.
    state.gambit = { claimant: 1, declaredRound: 1, named: true };
    const policy = { ...ARCHETYPES.aggressor.policy, gambitContest: 1 };
    const action = chooseAction(state, 0, 7, policy);
    expect(action.type).toBe('MARCH');
    // The step heads toward the Keystone (a neighbour of keep-n on that path).
    expect(state.board.definition.nodes['keep-n'].connections).toContain(action.targetNodeId);
  });
});
