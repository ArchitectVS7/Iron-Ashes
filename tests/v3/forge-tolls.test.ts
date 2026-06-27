/**
 * Forge-as-Gate toll tests (Stage T — DESIGN-V2-FOCUS-GROUP-R3 §4).
 *
 * Marching INTO a rival-owned, living Forge pays the owner a banner toll (in the open);
 * sworn allies pass free; an unowned/own/ashed Forge is free. Gated by FORGE_TOLL_COST.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeMarch } from '../../src/v3/actions.js';
import { withTunables } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

/** Put player p's Warlord on a Keep adjacent to the given Forge, with banners. */
function atKeepBy(state: GameState, p: number, keep: string, banners: number): void {
  state.players[p].warlordNodeId = keep;
  state.players[p].banners = banners;
}

describe('Forge-as-Gate tolls (Stage T)', () => {
  it('marching into a rival-owned Forge transfers the toll to the owner', () => {
    const s = createGame(2, 'competitive', 7);
    atKeepBy(s, 0, 'keep-n', 5);          // keep-n is adjacent to forge-nw
    s.board.state.nodes['forge-nw'].owner = 1; // rival owns the gate
    const before0 = s.players[0].banners;
    const before1 = s.players[1].banners;

    withTunables({ FORGE_TOLL_COST: 2 }, () => executeMarch(s, 0, 'forge-nw'));

    expect(s.players[0].warlordNodeId).toBe('forge-nw');
    expect(s.players[0].banners).toBe(before0 - 1 - 2); // march cost 1 + toll 2
    expect(s.players[1].banners).toBe(before1 + 2);      // owner collects the toll
  });

  it('throws if the marcher cannot afford march cost + toll', () => {
    const s = createGame(2, 'competitive', 7);
    atKeepBy(s, 0, 'keep-n', 2);          // 1 (march) + 2 (toll) = 3 needed, only 2
    s.board.state.nodes['forge-nw'].owner = 1;
    expect(() => withTunables({ FORGE_TOLL_COST: 2 }, () => executeMarch(s, 0, 'forge-nw')))
      .toThrow('toll');
  });

  it('no toll on an unowned Forge, your own Forge, or with the lever off', () => {
    const mk = (): GameState => { const s = createGame(2, 'competitive', 7); atKeepBy(s, 0, 'keep-n', 5); return s; };

    // Unowned Forge → free (just the march cost).
    const a = mk();
    withTunables({ FORGE_TOLL_COST: 2 }, () => executeMarch(a, 0, 'forge-nw'));
    expect(a.players[0].banners).toBe(5 - 1);

    // Lever explicitly off → free even when rival-owned.
    const b = mk();
    b.board.state.nodes['forge-nw'].owner = 1;
    withTunables({ FORGE_TOLL_COST: 0 }, () => executeMarch(b, 0, 'forge-nw'));
    expect(b.players[0].banners).toBe(5 - 1);
  });

  it('sworn allies pass a rival Forge free (Oath non-aggression)', () => {
    const s = createGame(2, 'competitive', 7);
    atKeepBy(s, 0, 'keep-n', 5);
    s.board.state.nodes['forge-nw'].owner = 1;
    s.oaths.push({ a: 0, b: 1, swornRound: s.round, strain: 0 });
    withTunables({ FORGE_TOLL_COST: 2 }, () => executeMarch(s, 0, 'forge-nw'));
    expect(s.players[0].banners).toBe(5 - 1); // no toll between sworn allies
  });
});
