/**
 * Backlog T1-4 — HUMAN Last Stand control (§5.3): the pause-flow.
 *
 * When a HUMAN defender (player.type === 'human') would lose a stronghold in a RAID, the engine
 * HALTS resolution into `state.pendingLastStand` instead of auto-playing `chooseLastStandCards`;
 * the LAST_STAND_COMMIT command resumes/finishes the resolution exactly as the auto path would
 * with that commit. AI defenders keep the auto path UNTOUCHED (the sim never pauses — the
 * byte-identical balance guard). The RAID path is the ONLY call site of `chooseLastStandCards`
 * today: the dark's RAID_DK strike (§5.6) is blight-only, never a card combat.
 *
 * Covered here: the pause fires for a human defender (engine + reducer command path); resume with
 * 0 / partial / full / partial-below-capture-gate commits; AI defenders never pause; every other
 * command is blocked while paused; a determinism run with a scripted commit; and a jsdom E2E that
 * clicks through the real blocking prompt.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { applyCommand } from '../../src/v3/reducer.js';
import { executeRaid } from '../../src/v3/actions.js';
import { effectiveCaptureMargin, getPlayerPowerAtNode } from '../../src/v3/combat.js';
import { addCourtPiece } from '../../src/v3/court.js';
import { WARLORD_POWER } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

const NODE = 'holding-ne';

/**
 * A controlled RAID arena (mirrors capture.test.ts): attacker seat 1 and defender seat 0
 * co-located on a defender-owned Holding (a stronghold). With `humanCount` 1 the DEFENDER is
 * human (createGame makes seat 0 the human); with 0 every seat is AI. Act = MARCH (past the
 * Whisper last-stronghold gate). Defender hand [5, 4, 1] can fully reverse an 8-margin loss.
 */
function arena(humanCount: 0 | 1 = 1): GameState {
  const s = createGame(3, 'competitive', 7, humanCount);
  s.act = 'MARCH';
  const ns = s.board.state.nodes[NODE];
  ns.pieces = [];
  ns.shadowkingForces = [];
  ns.owner = 0; // the defender owns the contested stronghold
  for (const seat of [0, 1]) {
    s.players[seat].warlordNodeId = NODE;
    s.players[seat].court[0].node = NODE;
    ns.pieces.push({ id: `warlord-${seat}`, type: 'warlord', owner: seat, power: WARLORD_POWER, nodeId: NODE });
  }
  s.players[0].hand = [5, 4, 1];
  s.players[1].hand = [4, 4];
  return s;
}

/** Raid the arena defender for land with [4,4] (margin 8 over an empty first-exchange defense). */
function raidForLand(s: GameState): ReturnType<typeof executeRaid> {
  return executeRaid(s, 1, 0, [4, 4], [], { effect: 'TAKE_LAND' });
}

describe('T1-4 — the pause fires for a HUMAN defender', () => {
  it('HALTS into pendingLastStand instead of auto-playing chooseLastStandCards', () => {
    const s = arena(1);
    expect(s.players[0].type).toBe('human');
    const r = raidForLand(s);

    expect(s.pendingLastStand).toBeDefined();
    expect(s.pendingLastStand).toMatchObject({
      combatType: 'RAID',
      attackerIndex: 1,
      defenderIndex: 0,
      nodeId: NODE,
      attackPower: WARLORD_POWER + 8,
      defensePower: WARLORD_POWER,
      elect: { effect: 'TAKE_LAND' },
    });
    // NOTHING is resolved yet: the node is still the defender's, no cards discarded.
    expect(s.board.state.nodes[NODE].owner).toBe(0);
    expect(s.players[0].hand).toEqual([5, 4, 1]);
    expect(s.players[1].hand).toEqual([4, 4]);
    // The attacker's action IS spent (the combat happened).
    expect(r.actionConsumed).toBe(true);
    // The pause is evented for the UI.
    expect(r.events.some(e => e.type === 'PLAYER_ACTED'
      && (e.details as Record<string, unknown>).lastStandPending === true)).toBe(true);
  });

  it('blocks EVERY other command while paused (the prompt is blocking)', () => {
    const s = arena(1);
    raidForLand(s);
    expect(() => applyCommand(s, { type: 'ADVANCE_PHASE' }))
      .toThrow(/Last Stand is pending/);
    expect(() => applyCommand(s, { type: 'PLAYER_ACTION', playerIndex: 1, action: { type: 'PASS' } }))
      .toThrow(/Last Stand is pending/);
  });

  it('only the pending defender may commit; invalid cards are rejected and the pause survives', () => {
    const s = arena(1);
    raidForLand(s);
    expect(() => applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 1, cardIds: [] }))
      .toThrow(/Only the pending defender/);
    expect(() => applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [9] }))
      .toThrow(/not in hand/);
    expect(s.pendingLastStand).toBeDefined(); // the clone was discarded — still paused, retry-able
  });
});

describe('T1-4 — LAST_STAND_COMMIT resumes exactly as the auto path would', () => {
  it('a ZERO commit yields: the attacker takes the land, committed cards discard as usual', () => {
    const s = arena(1);
    raidForLand(s);
    const { state: after } = applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [] });

    expect(after.pendingLastStand).toBeUndefined();
    expect(after.board.state.nodes[NODE].owner).toBe(1);      // land taken
    expect(after.players[1].hand).toEqual([]);                // attacker's [4,4] discarded
    expect(after.players[0].hand).toEqual([5, 4, 1]);         // defender spent nothing
  });

  it('a PARTIAL (non-reversing) commit still falls — and the committed cards are destroyed', () => {
    const s = arena(1);
    raidForLand(s);
    const { state: after } = applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [5] });

    expect(after.pendingLastStand).toBeUndefined();
    expect(after.board.state.nodes[NODE].owner).toBe(1);      // 5 < 8 — the stronghold falls
    expect(after.players[0].hand).toEqual([4, 1]);            // the 5 is destroyed anyway
  });

  it('a FULL (reversing) commit HOLDS: node kept, stand cards destroyed, pushback applied', () => {
    const s = arena(1);
    raidForLand(s);
    const { state: after, events } = applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [5, 4] });

    expect(after.pendingLastStand).toBeUndefined();
    expect(after.board.state.nodes[NODE].owner).toBe(0);      // 9 ≥ 8 — the defender holds
    expect(after.players[0].hand).toEqual([1]);               // [5,4] destroyed
    expect(after.players[1].hand).toEqual([]);                // attacker's commit still discards
    expect(events.some(e => e.type === 'PLAYER_ACTED'
      && (e.details as Record<string, unknown>).lastStand === true
      && (e.details as Record<string, unknown>).held === true)).toBe(true);
  });

  it('a partial stand can shrink a CAPTURE below its margin gate — the capture FIZZLES, never a throw', () => {
    const s = arena(1);
    addCourtPiece(s, 0, 'marshal', NODE); // a legal capture target (and +MARSHAL_POWER defense)
    const need = effectiveCaptureMargin(s, 1);
    expect(need).toBeGreaterThanOrEqual(2);
    const atkBase = getPlayerPowerAtNode(s, 1, NODE);
    const defBase = getPlayerPowerAtNode(s, 0, NODE);
    // Size the attack for a pre-stand margin of exactly need+1 (clears the gate by 1); a stand of
    // `need` then undercuts the gate (final margin 1 < need) WITHOUT reversing (need < need+1).
    const atkCommit = defBase + need + 1 - atkBase;
    s.players[1].hand = [atkCommit];
    s.players[0].hand = [need];
    executeRaid(s, 1, 0, [atkCommit], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-0-0' });
    expect(s.pendingLastStand).toBeDefined();

    const { state: after, events } = applyCommand(s, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [need] });
    expect(after.pendingLastStand).toBeUndefined();
    expect(after.captives).toHaveLength(0);                   // the abduction is denied
    expect(after.board.state.nodes[NODE].owner).toBe(0);      // capture was elected — land never at stake
    expect(events.some(e => e.type === 'PLAYER_ACTED'
      && (e.details as Record<string, unknown>).captureFizzled === true)).toBe(true);
  });

  it('an ILLEGAL capture elect still fails atomically AT the pause (pre-stand margin below the gate)', () => {
    const s = arena(1);
    addCourtPiece(s, 0, 'marshal', NODE);
    const atkBase = getPlayerPowerAtNode(s, 1, NODE);
    const defBase = getPlayerPowerAtNode(s, 0, NODE);
    // A margin-1 win can never clear the ≥2 gate — the RAID must throw as the auto path would.
    const atkCommit = defBase + 1 - atkBase;
    s.players[1].hand = [atkCommit];
    expect(() => executeRaid(s, 1, 0, [atkCommit], [], { effect: 'CAPTURE_PIECE', targetPieceId: 'marshal-0-0' }))
      .toThrow(/Cannot CAPTURE/);
    expect(s.pendingLastStand).toBeUndefined();
  });
});

describe('T1-4 — AI defenders NEVER pause (the auto path is untouched)', () => {
  it('the identical arena with an AI defender resolves inline: the AI stands [5,4] and holds', () => {
    const s = arena(0);
    expect(s.players[0].type).toBe('ai');
    raidForLand(s);

    expect(s.pendingLastStand).toBeUndefined();               // no pause, ever
    expect(s.board.state.nodes[NODE].owner).toBe(0);          // the deterministic chooser reversed it
    expect(s.players[0].hand).toEqual([1]);                   // [5,4] auto-committed + destroyed
  });

  it('the human path with the SAME full commit reproduces the AI outcome byte-identically (minus the pause log)', () => {
    // Auto path (AI defender).
    const ai = arena(0);
    raidForLand(ai);

    // Pause path (human defender) resumed with the same [5,4] the AI chose.
    const human = arena(1);
    raidForLand(human);
    const { state: resumed } = applyCommand(human, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [5, 4] });

    // The board, hands, and captives converge exactly (players[].type and the pause event differ by design).
    expect(resumed.board.state).toEqual(ai.board.state);
    expect(resumed.players.map(p => p.hand)).toEqual(ai.players.map(p => p.hand));
    expect(resumed.captives).toEqual(ai.captives);
  });
});

describe('T1-4 — the full reducer command path + determinism', () => {
  /** Drive the pause through PLAYER_ACTION (the reducer's own commit sizing). */
  function pauseViaReducer(): GameState {
    const s = arena(1);
    s.players[1].hand = [9, 9]; // ample — the reducer's value-aware sizing will clear the defense
    s.phase = 'ACTION';
    s.activePlayerIndex = 1;
    s.turnOrderPosition = s.turnOrder.indexOf(1);
    s.players[1].actionsRemaining = 2;
    const { state } = applyCommand(s, {
      type: 'PLAYER_ACTION',
      playerIndex: 1,
      action: { type: 'RAID', targetPlayerIndex: 0, raidEffect: 'TAKE_LAND' },
    });
    return state;
  }

  it('a RAID command against a human stronghold pauses; the commit resumes and unblocks the flow', () => {
    const paused = pauseViaReducer();
    expect(paused.pendingLastStand).toBeDefined();
    expect(paused.pendingLastStand!.defenderIndex).toBe(0);
    // The reducer's value-aware sizing committed the defender's best single card ([5]) to the
    // first exchange — the stand may only spend the REMAINING [4, 1].
    expect(paused.pendingLastStand!.defenderCards).toEqual([5]);

    const { state: after } = applyCommand(paused, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [] });
    expect(after.pendingLastStand).toBeUndefined();
    // The flow is unblocked — the attacker's remaining action proceeds normally.
    expect(() => applyCommand(after, { type: 'PLAYER_ACTION', playerIndex: after.activePlayerIndex, action: { type: 'PASS' } }))
      .not.toThrow();
  });

  it('cards already committed to the first exchange are NOT spendable in the stand', () => {
    const paused = pauseViaReducer();
    expect(() => applyCommand(paused, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [5] }))
      .toThrow(/not in hand beyond the cards already in this combat/);
  });

  it('determinism (§7): the same seed + the same scripted commit ⇒ byte-identical states', () => {
    const run = (): string => {
      const paused = pauseViaReducer();
      const { state } = applyCommand(paused, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [4, 1] });
      return JSON.stringify(state);
    };
    expect(run()).toBe(run());
  });

  it('different scripted commits diverge (the choice is real, not cosmetic)', () => {
    const paused = pauseViaReducer();
    // margin is 4 ((3+9) vs (3+5)); [4,1] = 5 ≥ 4 reverses it, an empty commit yields.
    const yielded = applyCommand(paused, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [] }).state;
    const held = applyCommand(paused, { type: 'LAST_STAND_COMMIT', playerIndex: 0, cardIds: [4, 1] }).state;
    expect(yielded.board.state.nodes[NODE].owner).toBe(1);
    expect(held.board.state.nodes[NODE].owner).toBe(0);
  });
});

// ─── jsdom E2E — click through the REAL blocking prompt ────────────

describe('T1-4 — jsdom E2E: the blocking Last Stand prompt', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  const click = (el: Element): void => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  /** A session frozen on a real engine pause (same arena, driven through executeRaid). */
  function pausedSession(): GameSession {
    const session = new GameSession(3, 'competitive', 7);
    const s = arena(1);
    raidForLand(s);
    session.state = s;               // adopt the paused state (same setup params/seed)
    session.lastStandSelection = [];
    mountView(root, session);
    return session;
  }

  it('renders the blocking prompt with every remaining card, the totals, and the Pledge warning', () => {
    pausedSession();
    const panel = root.querySelector('.panel.laststand.blocking');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('LAST STAND');
    expect(panel!.textContent).toContain(`${WARLORD_POWER + 8}`);       // the attacker total
    expect(panel!.textContent).toContain("next round's Pledge cards");  // the warning
    expect(root.querySelectorAll('[data-action^="laststand-toggle:"]')).toHaveLength(3); // 0..hand
    expect(root.querySelector('[data-action="laststand-commit"]')!.textContent).toContain('Yield');
  });

  it('toggling cards updates the projection; committing a HOLDING stand resumes the game', () => {
    const session = pausedSession();
    // Select the 5 and the 4 (indices 0 and 1 of the remaining hand [5,4,1]).
    click(root.querySelector('[data-action="laststand-toggle:0"]')!);
    click(root.querySelector('[data-action="laststand-toggle:1"]')!);
    expect(root.querySelector('.ls-projection')!.textContent).toContain('HOLD');
    expect(root.querySelector('[data-action="laststand-commit"]')!.textContent).toContain('Commit 2 cards');

    click(root.querySelector('[data-action="laststand-commit"]')!);
    expect(session.state.pendingLastStand).toBeUndefined();
    expect(session.state.board.state.nodes[NODE].owner).toBe(0); // held
    expect(session.state.players[0].hand).toEqual([1]);
    expect(root.querySelector('.panel.laststand')).toBeNull();   // the prompt is gone
    expect(session.lastError).toBeNull();
  });

  it('committing NOTHING yields the stronghold and the flow moves on', () => {
    const session = pausedSession();
    click(root.querySelector('[data-action="laststand-commit"]')!);
    expect(session.state.pendingLastStand).toBeUndefined();
    expect(session.state.board.state.nodes[NODE].owner).toBe(1); // fallen
    expect(root.querySelector('.panel.laststand')).toBeNull();
  });
});
