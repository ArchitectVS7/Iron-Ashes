/**
 * T2-3 — Herald default-OFF (backlog T2-3, the learnability review's #1).
 *
 * The Herald archetype (+ its verbs RECRUIT / PARLEY / Herald-MARCH) is an ADVANCED setup
 * toggle, default OFF: the default game is the 3-archetype court (Warlord / Marshal / Steward —
 * protect/fight/earn). This suite covers BOTH flag states:
 *   - createGame defaults the flag off and stores an explicit opt-in;
 *   - all three herald verbs are rejected with the honest "disabled" reason when off;
 *   - the AI never proposes a herald verb when off (a herald-hungry table recruits nothing,
 *     and — because the flag LEADS each AI herald branch — no RNG draw is even made);
 *   - the sim driver defaults off and plumbs the opt-in through (SweepConfig → GameRunConfig);
 *   - determinism (§7): the flag is part of the key — same (config, flag) ⇒ byte-identical,
 *     and the ON variant genuinely diverges from the OFF default on a herald-active seed.
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeHeraldMarch, executeParley, executeRecruit } from '../../src/v3/actions.js';
import { playHeadlessGame } from '../../src/v3/sim/driver.js';
import { computeMetrics } from '../../src/v3/sim/metrics.js';
import { policyOf } from '../../src/v3/sim/archetypes.js';
import { sessionTunables, withSessionTunables } from '../../src/v3/difficulty.js';
import { getTunables, HERALD_OFF_REBALANCE } from '../../src/v3/tunables.js';
import { withHeraldEnabled } from './fixtures.js';

// A herald-hungry table: every seat is the cooperator (heraldAffinity 0.6, parleyBias 0.7) —
// with the flag ON these seats reliably recruit; with it OFF they must never.
const HERALD_HUNGRY = [
  policyOf('cooperator'), policyOf('cooperator'), policyOf('cooperator'), policyOf('cooperator'),
];

describe('T2-3 — the Herald is an ADVANCED setup toggle, DEFAULT OFF', () => {
  it('createGame defaults heraldEnabled to false — the 3-archetype default game', () => {
    const s = createGame(4, 'competitive', 42);
    expect(s.heraldEnabled).toBe(false);
  });

  it('an explicit opt-in is stored on the state', () => {
    const s = createGame(4, 'competitive', 42, 1, 'warlord', true);
    expect(s.heraldEnabled).toBe(true);
  });

  it('RECRUIT is rejected when the toggle is off (with the honest reason)', () => {
    const s = createGame(2, 'competitive', 7);
    s.players[0].banners = 9;
    expect(() => executeRecruit(s, 0)).toThrow(/Herald is disabled this session/);
    expect(s.players[0].stance).toBe('martial');
    expect(s.players[0].banners).toBe(9); // nothing spent
  });

  it('PARLEY is rejected when the toggle is off — before any stance reasoning', () => {
    const s = createGame(2, 'competitive', 7);
    expect(() => executeParley(s, 0)).toThrow(/Herald is disabled this session/);
  });

  it('Herald MARCH is rejected when the toggle is off', () => {
    const s = createGame(2, 'competitive', 7);
    expect(() => executeHeraldMarch(s, 0, 'anywhere')).toThrow(/Herald is disabled this session/);
  });

  it('with the toggle ON the verbs work exactly as before (the advanced variant)', () => {
    const s = withHeraldEnabled(createGame(2, 'competitive', 7));
    s.players[0].banners = 9;
    executeRecruit(s, 0);
    expect(s.players[0].stance).toBe('political');
    expect(s.players[0].heraldNodeId).not.toBeNull();
    expect(s.players[0].court.some(c => c.archetype === 'herald')).toBe(true);
  });
});

describe('T2-3 — the AI and the sim both respect the flag', () => {
  it('a herald-hungry AI table with the flag OFF recruits no Herald and never PARLEYs', () => {
    const run = playHeadlessGame({
      seed: 11, playerCount: 4, mode: 'competitive',
      seatPolicies: HERALD_HUNGRY, heraldEnabled: false,
    });
    const m = computeMetrics(run.finalState);
    expect(m.heraldsRecruited).toBe(0);
    expect(m.parleyCount).toBe(0);
    expect(m.heraldCaptures).toBe(0);
    for (const p of run.finalState.players) {
      expect(p.stance).toBe('martial');
      expect(p.heraldNodeId).toBeNull();
      expect(p.court.some(c => c.archetype === 'herald')).toBe(false);
    }
  });

  it('the same table with the flag ON recruits Heralds — the advanced variant lives', () => {
    // A herald-hungry table across a handful of seeds: at least one game recruits.
    let recruited = 0;
    for (const seed of [11, 12, 13]) {
      const run = playHeadlessGame({
        seed, playerCount: 4, mode: 'competitive',
        seatPolicies: HERALD_HUNGRY, heraldEnabled: true,
      });
      expect(run.finalState.heraldEnabled).toBe(true);
      recruited += computeMetrics(run.finalState).heraldsRecruited;
    }
    expect(recruited).toBeGreaterThan(0);
  });

  it('the sim driver defaults to OFF — the default sweep IS the default game', () => {
    const run = playHeadlessGame({ seed: 11, playerCount: 3, mode: 'competitive' });
    expect(run.finalState.heraldEnabled).toBe(false);
  });

  it('the herald-OFF re-lock overlay scopes the default game; herald-ON gets NO overlay', () => {
    // OFF (the default): HERALD_OFF_REBALANCE is live under the tier.
    withSessionTunables('warlord', false, () => {
      expect(getTunables().BLIGHT_TO_ASH).toBe(HERALD_OFF_REBALANCE.BLIGHT_TO_ASH);
      expect(getTunables().DOOM_COST_MARCH).toBe(HERALD_OFF_REBALANCE.DOOM_COST_MARCH);
      expect(getTunables().DK_PER_PLAYER).toBe(HERALD_OFF_REBALANCE.DK_PER_PLAYER);
    });
    // ON: the locked reference values, byte-identical (no overlay key applies).
    withSessionTunables('warlord', true, () => {
      expect(getTunables().BLIGHT_TO_ASH).toBe(2);
      expect(getTunables().DOOM_COST_MARCH).toBe(11);
      expect(getTunables().DK_PER_PLAYER).toBe(0);
    });
    // A non-default tier layers OVER the overlay: its doomCost curve wins, the overlay's
    // non-doomCost pacing keys still apply.
    const knightOff = sessionTunables('knight', false);
    expect(knightOff.DOOM_COST_MARCH).toBe(2); // the tier's calibrated value, not 14
    expect(knightOff.BLIGHT_TO_ASH).toBe(HERALD_OFF_REBALANCE.BLIGHT_TO_ASH);
  });

  it('determinism (§7): the flag is part of the key — same (config, flag) ⇒ byte-identical', () => {
    const cfg = {
      seed: 11, playerCount: 4, mode: 'competitive' as const, seatPolicies: HERALD_HUNGRY,
    };
    const offA = playHeadlessGame({ ...cfg, heraldEnabled: false });
    const offB = playHeadlessGame({ ...cfg, heraldEnabled: false });
    const onA = playHeadlessGame({ ...cfg, heraldEnabled: true });
    const onB = playHeadlessGame({ ...cfg, heraldEnabled: true });
    expect(JSON.stringify(offA.finalState)).toBe(JSON.stringify(offB.finalState));
    expect(JSON.stringify(onA.finalState)).toBe(JSON.stringify(onB.finalState));
    // The two flag states are DIFFERENT games (beyond the stored flag itself) whenever the
    // table is herald-active — the action logs must have genuinely diverged.
    expect(JSON.stringify(offA.finalState.actionLog))
      .not.toBe(JSON.stringify(onA.finalState.actionLog));
  });
});
