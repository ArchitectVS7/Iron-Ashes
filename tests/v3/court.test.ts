/**
 * Stage 3b — The Court (ALGORITHM §2).
 *
 * The court is four archetypes with distinct power / verb / passive:
 *   warlord — leader; high power; its deposal = elimination (§6).
 *   marshal — the muscle; high combat; may declare Last Stand.
 *   steward — the economy; low combat; +STEWARD_INCOME Banners at its node each Dawn.
 *   herald  — the political reach; never fights; +HERALD_HAND_BONUS hand + PARLEY.
 *
 * Coverage: the court structure, each archetype's distinct effect, and that the
 * Warlord's deposal (and only the Warlord's) eliminates.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import {
  addCourtPiece,
  archetypePower,
  canLastStand,
  stewardIncome,
} from '../../src/v3/court.js';
import { getPlayerPowerAtNode } from '../../src/v3/combat.js';
import { generateBannersForPlayer, resolveDeposals } from '../../src/v3/sequencer.js';
import { executeRecruit } from '../../src/v3/actions.js';
import {
  HERALD_HAND_BONUS,
  MARSHAL_POWER,
  STEWARD_INCOME,
  STEWARD_POWER,
  WARLORD_POWER,
} from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

function game(): GameState {
  return createGame(2, 'competitive', 42);
}

describe('Stage 3b — the court structure (§2)', () => {
  it('every player starts with exactly one Warlord in their court, at their keep', () => {
    const s = game();
    for (const p of s.players) {
      expect(p.court).toHaveLength(1);
      expect(p.court[0].archetype).toBe('warlord');
      expect(p.court[0].node).toBe(p.warlordNodeId);
      expect(p.court[0].captiveOf).toBeNull();
    }
  });

  it('archetypePower gives each archetype a distinct combat grade (§2)', () => {
    expect(archetypePower('warlord')).toBe(WARLORD_POWER);
    expect(archetypePower('marshal')).toBe(MARSHAL_POWER);
    expect(archetypePower('steward')).toBe(STEWARD_POWER);
    expect(archetypePower('herald')).toBe(0); // never fights
    // The fighters out-grade the support pieces.
    expect(archetypePower('marshal')).toBeGreaterThan(archetypePower('steward'));
    expect(archetypePower('warlord')).toBeGreaterThan(archetypePower('herald'));
  });

  it('addCourtPiece adds the roster entry AND its on-board mirror (§2)', () => {
    const s = game();
    addCourtPiece(s, 0, 'steward', 'holding-ne');
    const cp = s.players[0].court.find(c => c.archetype === 'steward');
    expect(cp).toBeDefined();
    expect(cp!.node).toBe('holding-ne');
    const onBoard = s.board.state.nodes['holding-ne'].pieces.find(p => p.id === cp!.id);
    expect(onBoard).toBeDefined();
    expect(onBoard!.type).toBe('steward');
    expect(onBoard!.power).toBe(STEWARD_POWER);
  });
});

describe('Stage 3b — Steward income (§2/§4.4)', () => {
  it('a free Steward adds STEWARD_INCOME to its owner\'s Dawn banners', () => {
    const s = game();
    const before = generateBannersForPlayer(s, 0);
    addCourtPiece(s, 0, 'steward', 'holding-ne');
    const after = generateBannersForPlayer(s, 0);
    expect(after).toBe(before + STEWARD_INCOME);
    expect(stewardIncome(s, 0)).toBe(STEWARD_INCOME);
  });

  it('two Stewards stack; a captured Steward funds no one (§12 #7)', () => {
    const s = game();
    addCourtPiece(s, 0, 'steward', 'holding-ne');
    addCourtPiece(s, 0, 'steward', 'holding-nw');
    expect(stewardIncome(s, 0)).toBe(2 * STEWARD_INCOME);
    // Hostage placeholder (3d): a held Steward produces nothing.
    s.players[0].court.find(c => c.archetype === 'steward')!.captiveOf = 1;
    expect(stewardIncome(s, 0)).toBe(STEWARD_INCOME);
  });

  it('a court with no Steward yields zero Steward income', () => {
    const s = game();
    expect(stewardIncome(s, 0)).toBe(0);
  });
});

describe('Stage 3b — Marshal combat (§2)', () => {
  it('a Marshal raises its owner\'s combat power at its node by MARSHAL_POWER', () => {
    const s = game();
    const before = getPlayerPowerAtNode(s, 0, 'holding-ne'); // no piece here yet
    expect(before).toBe(0);
    addCourtPiece(s, 0, 'marshal', 'holding-ne');
    expect(getPlayerPowerAtNode(s, 0, 'holding-ne')).toBe(MARSHAL_POWER);
  });

  it('the muscle (Warlord or Marshal) may Last Stand; a Steward alone may not (§2/§5.3)', () => {
    const s = game();
    // Warlord on its keep → can stand.
    expect(canLastStand(s, 0, s.players[0].warlordNodeId)).toBe(true);
    // A Steward sitting alone on a node → cannot stand.
    addCourtPiece(s, 0, 'steward', 'holding-ne');
    expect(canLastStand(s, 0, 'holding-ne')).toBe(false);
    // Add a Marshal there → now the muscle is present.
    addCourtPiece(s, 0, 'marshal', 'holding-ne');
    expect(canLastStand(s, 0, 'holding-ne')).toBe(true);
  });
});

describe('Stage 3b — Herald hand / parley (§2, generalized from v2)', () => {
  it('recruiting a Herald deepens the hand and joins the court; it never fights', () => {
    const s = game();
    s.players[0].banners = 5;
    const handBefore = s.players[0].handLimit;
    executeRecruit(s, 0);
    expect(s.players[0].handLimit).toBe(handBefore + HERALD_HAND_BONUS);
    const herald = s.players[0].court.find(c => c.archetype === 'herald');
    expect(herald).toBeDefined();
    // The Herald is a courier — zero combat power on the board (§2).
    const node = s.players[0].heraldNodeId!;
    const onBoard = s.board.state.nodes[node].pieces.find(p => p.type === 'herald' && p.owner === 0);
    expect(onBoard!.power).toBe(0);
  });
});

describe('Stage 3b — Warlord deposal = elimination (§2/§6)', () => {
  it('a Warlord that loses its last stronghold is eliminated at Dawn (post-Whisper)', () => {
    const s = game();
    s.act = 'MARCH'; // Whisper protects against hopelessness (§12 #13)
    const keep1 = s.players[1].warlordNodeId;
    // Strip player 1 of its only stronghold → zero living strongholds.
    s.board.state.nodes[keep1].owner = null;

    const events = resolveDeposals(s);
    expect(s.players[1].isEliminated).toBe(true);
    expect(events.some(e => e.type === 'PLAYER_ELIMINATED' && e.playerIndex === 1)).toBe(true);
    // The other Warlord survives — only the Warlord's loss ends a player.
    expect(s.players[0].isEliminated).toBe(false);
    // The eliminated player's court is still headed by the Warlord archetype.
    expect(s.players[1].court[0].archetype).toBe('warlord');
  });

  it('Whisper shields the Warlord — no deposal can resolve pre-March', () => {
    const s = game();
    s.act = 'WHISPER';
    s.board.state.nodes[s.players[1].warlordNodeId].owner = null;
    resolveDeposals(s);
    expect(s.players[1].isEliminated).toBe(false);
  });
});
