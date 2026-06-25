/**
 * Stage HL — the literal Herald lone-runner piece.
 *
 * RECRUIT spawns a Herald at the Warlord's node; it MARCHes independently; PARLEY fires
 * from the RUNNER's node (so it must reach the front); and a rival Warlord or the dark
 * co-located with it CAPTURES it (the interception drama), reverting the political bonuses.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v2/setup.js';
import {
  executeRecruit,
  executeHeraldMarch,
  executeParley,
  resolveHeraldCaptures,
} from '../../src/v2/actions.js';
import { HERALD_HAND_BONUS } from '../../src/v2/tunables.js';
import type { GameState } from '../../src/v2/types.js';

function recruited(): GameState {
  const state = createGame(4, 'competitive', 42);
  state.players[0].banners = 5;
  executeRecruit(state, 0);
  return state;
}

describe('Stage HL — literal Herald piece', () => {
  it('RECRUIT spawns a Herald at the Warlord\'s node', () => {
    const state = recruited();
    const p = state.players[0];
    expect(p.stance).toBe('political');
    expect(p.heraldNodeId).toBe(p.warlordNodeId);
    expect(state.board.state.nodes[p.heraldNodeId!].pieces.some(pc => pc.type === 'herald' && pc.owner === 0)).toBe(true);
  });

  it('the Herald MARCHes independently of the Warlord', () => {
    const state = recruited();
    const p = state.players[0];
    const from = p.heraldNodeId!;
    const step = state.board.definition.nodes[from].connections[0];
    executeHeraldMarch(state, 0, step);
    expect(p.heraldNodeId).toBe(step);
    expect(p.warlordNodeId).toBe(from); // the Warlord did NOT move
    expect(state.board.state.nodes[step].pieces.some(pc => pc.type === 'herald' && pc.owner === 0)).toBe(true);
    expect(state.board.state.nodes[from].pieces.some(pc => pc.type === 'herald')).toBe(false);
  });

  it('PARLEY requires the Herald to stand at a blighted front', () => {
    const state = recruited();
    const p = state.players[0];
    // Clear any blight near the spawn so PARLEY has no target.
    for (const ns of Object.values(state.board.state.nodes)) ns.blightLevel = 0;
    expect(() => executeParley(state, 0)).toThrow(/no blighted front/i);
    // Blight the Herald's own node → now it can parley.
    state.board.state.nodes[p.heraldNodeId!].blightLevel = 2;
    state.board.state.nodes[p.heraldNodeId!].ashed = false;
    expect(() => executeParley(state, 0)).not.toThrow();
  });

  it('a rival Warlord co-located with the Herald CAPTURES it (stance reverts)', () => {
    const state = recruited();
    const p = state.players[0];
    const base = HERALD_HAND_BONUS;
    const handBefore = p.handLimit;
    // Park rival player 1's Warlord on the Herald's node.
    state.players[1].warlordNodeId = p.heraldNodeId!;
    const events = resolveHeraldCaptures(state);
    expect(p.heraldNodeId).toBeNull();
    expect(p.stance).toBe('martial');
    expect(p.handLimit).toBe(handBefore - base);
    expect(events.some(e => e.type === 'PLAYER_ACTED' && e.details?.heraldCaptured === true)).toBe(true);
  });

  it('a Death Knight co-located with the Herald CAPTURES it (by: dark, stance reverts)', () => {
    const state = recruited();
    const p = state.players[0];
    const handBefore = p.handLimit;
    const node = p.heraldNodeId!;
    // No rival Warlord on this node — instead a Death Knight moves onto the lone runner.
    state.board.state.nodes[node].shadowkingForces.push({
      id: 'dk-capture', type: 'death_knight', power: 4, nodeId: node,
    });
    const events = resolveHeraldCaptures(state);
    expect(p.heraldNodeId).toBeNull();
    expect(p.stance).toBe('martial');
    expect(p.handLimit).toBe(handBefore - HERALD_HAND_BONUS);
    expect(
      events.some(
        e => e.type === 'PLAYER_ACTED' && e.details?.heraldCaptured === true && e.details?.by === 'dark',
      ),
    ).toBe(true);
  });
});
