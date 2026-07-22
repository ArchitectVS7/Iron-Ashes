// @vitest-environment jsdom
/**
 * Affordances (T-304) — legal glow, illegal shake.
 *
 * Proves the acceptance clauses:
 *   1. The legality mirror (`marchLegality`) is a truthful, PURE reading of the FOGGED projection —
 *      and a spot parity check against the real reducer proves it does not drift from the engine.
 *   2. Glow is CLASS-driven: `renderBoard(s, legality)` stamps `is-legal` / `is-illegal`, and the
 *      affordance-free call still emits the exact same board (no classes, no data attributes).
 *   3. Shake is PRESET-driven behind a compile-gated `Record<ShakeKind, ShakePreset>`, and instant-
 *      mode SPIES confirm an illegal interaction dispatches exactly one shake and NO command.
 *   4. No `window.alert` (or confirm/prompt) and no visible text error remains on any illegality
 *      path — enforced both by a DOM assertion and by a source scan of every `src/ui-v3/*.ts`.
 *   5. Fog (§7 D2) extends to presentation: every legality key and every reason is public.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  AFFORDANCE_CLASS,
  AffordanceAnimator,
  SHAKE_PRESETS,
  actionSelector,
  marchCost,
  marchLegality,
  nodeSelector,
} from '../../src/ui-v3/affordance.js';
import type { ShakeKind } from '../../src/ui-v3/affordance.js';
import { renderBoard } from '../../src/ui-v3/board-view.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';
import { TUNABLES, applyCommand, createGame, observableState } from '../../src/v3/index.js';
import type { GameState } from '../../src/v3/index.js';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Drive (via clicks only) to the human's live ACTION turn. Mirrors the E2E driver. */
function toHumanTurn(mode: 'competitive' | 'blood_pact' = 'competitive', seed = 42): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);
  let guard = 0;
  while (!session.isOver && !session.isHumanTurn && guard < 60) {
    guard++;
    const adv = root.querySelector<HTMLElement>('[data-action="advance-threat"]');
    const pledge = root.querySelector<HTMLElement>('[data-action^="pledge:"]');
    if (adv) click(adv);
    else if (pledge) click(pledge);
    else break;
  }
  return session;
}

function rerender(session: GameSession): void { session.onChange(); }

/** A stand-alone deterministic state + its fogged projection for seat 0. */
function fixture(): GameState {
  return createGame(4, 'competitive', 42, 2);
}

describe('marchLegality — the presentational mirror of executeMarch', () => {
  it('is a no-go on every node when it is not the human turn', () => {
    const s = observableState(fixture(), 0);
    const map = marchLegality(s, 0, false);
    expect(map.size).toBe(Object.keys(s.board.definition.nodes).length);
    for (const v of map.values()) {
      expect(v.legal).toBe(false);
      expect(v.reason).toBe('not-your-turn');
    }
  });

  it('marks adjacent affordable nodes legal and everything else not-adjacent', () => {
    const st = fixture();
    st.phase = 'ACTION';
    st.players[0].banners = 12;
    st.players[0].actionsRemaining = 2;
    const s = observableState(st, 0);
    const here = s.players[0].warlordNodeId;
    const adj = s.board.definition.nodes[here].connections;
    const map = marchLegality(s, 0, true);

    for (const [id, v] of map) {
      if (id === here || !adj.includes(id)) {
        expect(v.reason, `${id} should not be adjacent`).toBe('not-adjacent');
      }
    }
    // At least one adjacent node is reachable with a full purse.
    expect(adj.some(id => map.get(id)!.legal)).toBe(true);
  });

  it('reports no-actions when the turn is spent', () => {
    const st = fixture();
    st.players[0].banners = 12;
    st.players[0].actionsRemaining = 0;
    const map = marchLegality(observableState(st, 0), 0, true);
    for (const v of map.values()) expect(v.reason).toBe('no-actions');
  });

  it('prices the ash surcharge and refuses when banners fall short', () => {
    const st = fixture();
    st.phase = 'ACTION';
    st.players[0].actionsRemaining = 2;
    const here = st.players[0].warlordNodeId;
    const target = st.board.definition.nodes[here].connections[0];
    st.board.state.nodes[target].ashed = true;

    const full = TUNABLES.ACTION_BASE_COST + TUNABLES.ASHED_TRAVERSE_EXTRA_COST;
    st.players[0].banners = full;
    const okS = observableState(st, 0);
    expect(marchCost(okS, 0, target)).toBe(full);
    expect(marchLegality(okS, 0, true).get(target)!.legal).toBe(true);

    st.players[0].banners = full - 1;
    const shortS = observableState(st, 0);
    expect(marchLegality(shortS, 0, true).get(target)!.reason).toBe('no-banners');
  });

  it('adds a rival Forge toll and waives it between sworn seats', () => {
    const st = fixture();
    st.phase = 'ACTION';
    st.players[0].actionsRemaining = 2;
    st.players[0].banners = 12;
    const here = st.players[0].warlordNodeId;
    const forge = st.board.definition.nodes[here].connections
      .find(id => st.board.definition.nodes[id].tier === 'forge');
    expect(forge, 'the start Keep neighbours a Forge').toBeDefined();
    st.board.state.nodes[forge!].owner = 1;
    st.board.state.nodes[forge!].ashed = false;

    const tolled = observableState(st, 0);
    expect(marchCost(tolled, 0, forge!)).toBe(TUNABLES.ACTION_BASE_COST + TUNABLES.FORGE_TOLL_COST);

    st.oaths.push({ a: 0, b: 1, swornRound: st.round, strain: 0 });
    const sworn = observableState(st, 0);
    expect(marchCost(sworn, 0, forge!)).toBe(TUNABLES.ACTION_BASE_COST);
  });

  it('refuses a held Approach (rival warlord) and a dark-held Approach', () => {
    const st = fixture();
    st.phase = 'ACTION';
    st.players[0].actionsRemaining = 2;
    st.players[0].banners = 12;
    // Stand the human's Warlord next to an Approach (its start Keep has none adjacent).
    const approach = Object.keys(st.board.definition.nodes)
      .find(id => st.board.definition.nodes[id].tier === 'approach')!;
    expect(approach).toBeDefined();
    st.players[0].warlordNodeId = st.board.definition.nodes[approach].connections[0];

    st.players[1].warlordNodeId = approach;
    expect(marchLegality(observableState(st, 0), 0, true).get(approach)!.reason).toBe('zoc-rival');

    st.players[1].warlordNodeId = st.board.definition.nodes[approach].connections[0];
    st.board.state.nodes[approach].shadowkingForces = [
      { id: 'sk-test', type: 'dark', owner: null, power: 2, nodeId: approach },
    ] as GameState['board']['state']['nodes'][string]['shadowkingForces'];
    expect(marchLegality(observableState(st, 0), 0, true).get(approach)!.reason).toBe('zoc-dark');
  });

  it('is pure — the same inputs give the same verdicts and nothing mutates', () => {
    const st = fixture();
    const s = observableState(st, 0);
    const before = JSON.stringify(s);
    const a = marchLegality(s, 0, true);
    const b = marchLegality(s, 0, true);
    expect(JSON.stringify([...a])).toBe(JSON.stringify([...b]));
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('marchLegality — parity with the real reducer (no drift)', () => {
  it('agrees with applyCommand on every node from the human ACTION turn', () => {
    const session = toHumanTurn();
    expect(session.isHumanTurn).toBe(true);
    const s = session.observable();
    const map = marchLegality(s, 0, true);
    // The check is only meaningful if BOTH verdicts occur in this sample.
    expect([...map.values()].some(v => v.legal)).toBe(true);
    expect([...map.values()].some(v => !v.legal)).toBe(true);

    for (const [id, verdict] of map) {
      const clone = JSON.parse(JSON.stringify(session.state)) as GameState;
      let threw = false;
      try {
        applyCommand(clone, {
          type: 'PLAYER_ACTION',
          playerIndex: 0,
          action: { type: 'MARCH', targetNodeId: id },
        });
      } catch {
        threw = true;
      }
      expect(threw, `mirror said legal=${verdict.legal} for ${id}; engine threw=${threw}`)
        .toBe(!verdict.legal);
    }
  });
});

describe('shake preset registry', () => {
  it('covers every ShakeKind with a well-formed preset', () => {
    expect(Object.keys(SHAKE_PRESETS).sort()).toEqual(['control', 'target']);
    for (const [key, preset] of Object.entries(SHAKE_PRESETS)) {
      expect(preset.kind).toBe(key);
      expect(preset.seconds).toBeGreaterThan(0);
      expect(typeof preset.build).toBe('function');
    }
  });

  // COMPILE GATE: `SHAKE_PRESETS` is declared with an EXPLICIT `Record<ShakeKind, ShakePreset>`
  // annotation, so a new kind without a preset fails `tsc`. This is its type-level mirror.
  it('is compile-enforced', () => {
    const cover: Record<ShakeKind, true> = { target: true, control: true };
    expect(Object.keys(cover)).toHaveLength(2);
  });

  it('every build is a safe no-op with no targets or a null timeline', () => {
    for (const preset of Object.values(SHAKE_PRESETS)) {
      expect(() => preset.build([], null)).not.toThrow();
      expect(() => preset.build([document.createElement('button')], null)).not.toThrow();
    }
  });

  it('selectors escape quoting and address the real control attributes', () => {
    expect(nodeSelector('keystone')).toBe('[data-node="keystone"]');
    expect(actionSelector('raid:TAKE_LAND:1')).toBe('[data-action="raid:TAKE_LAND:1"]');
    expect(nodeSelector('a"b')).toBe('[data-node="a\\"b"]');
  });
});

describe('AffordanceAnimator', () => {
  it('marks the resolved element and returns the dispatched kind (instant mode)', () => {
    root.innerHTML = '<button data-action="pass"></button>';
    const anim = new AffordanceAnimator(() => root, 0);
    expect(anim.shake(actionSelector('pass'), 'control', null)).toBe('control');
    expect(root.querySelector('[data-action="pass"]')!.classList.contains(AFFORDANCE_CLASS.shaking))
      .toBe(true);
  });

  it('never throws on missing DOM and returns null', () => {
    const anim = new AffordanceAnimator(() => null, 0);
    expect(anim.shake(nodeSelector('nowhere'), 'target', null)).toBeNull();
    const anim2 = new AffordanceAnimator(() => root, 0);
    expect(anim2.shake(nodeSelector('nowhere'), 'target', null)).toBeNull();
  });

  it('is fog-scoped to the viewer seat', () => {
    const anim = new AffordanceAnimator(() => root, 0);
    expect(anim.viewerSeat).toBe(0);
  });
});

describe('glow is class-driven (renderBoard)', () => {
  it('stamps is-legal / is-illegal exactly per the verdict map', () => {
    const st = fixture();
    st.phase = 'ACTION';
    st.players[0].actionsRemaining = 2;
    st.players[0].banners = 12;
    const s = observableState(st, 0);
    const legality = marchLegality(s, 0, true);
    const doc = new DOMParser().parseFromString(renderBoard(s, legality), 'image/svg+xml');

    for (const [id, v] of legality) {
      const g = doc.querySelector(`g[data-node="${id}"]`)!;
      expect(g.classList.contains(AFFORDANCE_CLASS.legal), id).toBe(v.legal);
      expect(g.classList.contains(AFFORDANCE_CLASS.illegal), id).toBe(!v.legal);
      expect(g.getAttribute('data-legal')).toBe(String(v.legal));
      if (!v.legal) expect(g.getAttribute('data-illegal-reason')).toBe(v.reason);
    }
    // The glow is class-driven — the affordance never writes an inline style.
    expect(renderBoard(s, legality)).not.toMatch(/data-legal="[^"]*"[^>]*style=/);
  });

  it('emits the untouched board when no legality map is given', () => {
    const s = observableState(fixture(), 0);
    const plain = renderBoard(s);
    expect(plain).not.toContain(AFFORDANCE_CLASS.legal);
    expect(plain).not.toContain(AFFORDANCE_CLASS.illegal);
    expect(plain).not.toContain('data-legal');
    expect(plain).not.toContain('data-illegal-reason');
  });
});

describe('illegal interactions shake — and dispatch NO command (spy, instant mode)', () => {
  it('an illegal board node shakes once and never reaches the engine', () => {
    const session = toHumanTurn();
    const spy = vi.spyOn(AffordanceAnimator.prototype, 'shake');
    const s = session.observable();
    const here = s.players[0].warlordNodeId;
    const adj = s.board.definition.nodes[here].connections;
    const far = Object.keys(s.board.definition.nodes)
      .find(id => id !== here && !adj.includes(id))!;

    const before = JSON.stringify(session.observable());
    click(root.querySelector(nodeSelector(far))!);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(nodeSelector(far));
    expect(spy.mock.calls[0][1]).toBe('target');
    // Instant mode (jsdom has no matchMedia) → a null timeline: dispatch happens, no tween is built.
    expect(spy.mock.calls[0][2]).toBeNull();
    expect(JSON.stringify(session.observable())).toBe(before);
    expect(session.lastError).toBeNull();
  });

  it('a node click on a rival turn shakes instead of silently doing nothing', () => {
    const session = toHumanTurn();
    session.state.activePlayerIndex = 1;
    rerender(session);
    expect(session.isHumanTurn).toBe(false);
    const spy = vi.spyOn(AffordanceAnimator.prototype, 'shake');
    const anyNode = root.querySelector('[data-node]')!;
    const before = JSON.stringify(session.observable());
    click(anyNode);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toBe('target');
    expect(JSON.stringify(session.observable())).toBe(before);
  });

  it('an ENGINE-rejected control shakes and leaves no text error behind', () => {
    const session = toHumanTurn();
    const swear = root.querySelector<HTMLElement>('[data-action^="swear:"]');
    expect(swear, 'a SWEAR control should render on the first free ACTION turn').not.toBeNull();
    const partner = Number(swear!.getAttribute('data-action')!.split(':')[1]);
    // Make the reducer refuse this exact rendered control: the target is already sworn elsewhere.
    // The DOM is deliberately NOT re-rendered — this is the drift case the post-dispatch funnel
    // exists for (the mirror/panel said yes, the engine says no).
    const other = [1, 2, 3].find(i => i !== partner)!;
    session.state.oaths.push({ a: partner, b: other, swornRound: session.state.round, strain: 0 });

    const spy = vi.spyOn(AffordanceAnimator.prototype, 'shake');
    click(swear!);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(actionSelector(`swear:${partner}`));
    expect(spy.mock.calls[0][1]).toBe('control');
    expect(spy.mock.calls[0][2]).toBeNull();
    // The rejection produced NO text: lastError is cleared and no visible error bar exists.
    expect(session.lastError).toBeNull();
    expect(root.querySelector('.error')).toBeNull();
    expect(root.innerHTML).not.toContain('⛔');
  });

  it('a turn-gated control clicked outside the human turn shakes instead of silently dropping', () => {
    const session = toHumanTurn();
    const pass = root.querySelector<HTMLElement>('[data-action="pass"]')!;
    session.state.activePlayerIndex = 1; // no re-render: the stale control is still clickable
    expect(session.isHumanTurn).toBe(false);
    const spy = vi.spyOn(AffordanceAnimator.prototype, 'shake');
    const before = JSON.stringify(session.observable());
    click(pass);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toBe('control');
    expect(JSON.stringify(session.observable())).toBe(before);
  });

  it('a LEGAL node click dispatches the MARCH and never shakes', () => {
    const session = toHumanTurn();
    session.state.players[0].banners = 12;
    rerender(session);
    const spy = vi.spyOn(AffordanceAnimator.prototype, 'shake');
    const s = session.observable();
    const map = marchLegality(s, 0, session.isHumanTurn);
    const dest = [...map].find(([, v]) => v.legal)?.[0];
    expect(dest, 'a legal march target should exist with a full purse').toBeDefined();

    click(root.querySelector(nodeSelector(dest!))!);
    expect(spy).not.toHaveBeenCalled();
    expect(session.state.players[0].warlordNodeId).toBe(dest);
    expect(session.lastError).toBeNull();
  });

  it('stays fully synchronous (instant mode) — the DOM is settled right after the click', () => {
    const session = toHumanTurn();
    const s = session.observable();
    const here = s.players[0].warlordNodeId;
    const adj = s.board.definition.nodes[here].connections;
    const far = Object.keys(s.board.definition.nodes)
      .find(id => id !== here && !adj.includes(id))!;
    click(root.querySelector(nodeSelector(far))!);
    // No pending async work: the board is present and the illegal node still carries its class.
    expect(root.querySelector(nodeSelector(far))).not.toBeNull();
    expect(root.querySelector('[data-node][data-legal]')).not.toBeNull();
  });
});

describe('no alert, no text error, no RNG (source scan)', () => {
  const uiDir = path.resolve(__dirname, '../../src/ui-v3');
  const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.ts'));

  it('scans a non-empty set of UI sources', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} has no alert/confirm/prompt and no non-deterministic source`, () => {
      const code = fs.readFileSync(path.join(uiDir, file), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(/\bwindow\.alert\s*\(/.test(code), `${file}: window.alert`).toBe(false);
      expect(/(^|[^.\w])alert\s*\(/.test(code), `${file}: alert()`).toBe(false);
      expect(/(^|[^.\w])confirm\s*\(/.test(code), `${file}: confirm()`).toBe(false);
      expect(/(^|[^.\w])prompt\s*\(/.test(code), `${file}: prompt()`).toBe(false);
      expect(code.includes('Math.random'), `${file}: Math.random`).toBe(false);
      expect(code.includes('Date.now'), `${file}: Date.now`).toBe(false);
    });
  }

  it('the rendered app carries no visible illegality text region', () => {
    const session = toHumanTurn();
    expect(root.querySelector('.error')).toBeNull();
    // The message survives only in a visually-hidden polite live region (a11y, never motion-only).
    const live = root.querySelector('[role="status"][aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.classList.contains('sr-only')).toBe(true);
    expect(session.isOver).toBe(false);
  });
});

describe('fog (§7 D2) extends to presentation', () => {
  it('every legality key and reason is public information', () => {
    const s = observableState(fixture(), 0);
    const map = marchLegality(s, 0, true);
    const publicReasons = new Set([
      'not-your-turn', 'no-actions', 'not-adjacent', 'no-banners', 'zoc-rival', 'zoc-dark', null,
    ]);
    for (const [id, v] of map) {
      expect(Object.keys(s.board.definition.nodes)).toContain(id);
      expect(publicReasons.has(v.reason)).toBe(true);
    }
  });

  it('the affordance DOM leaks no seed and no unflipped-token content', () => {
    const st = fixture();
    const s = observableState(st, 0);
    const html = renderBoard(s, marchLegality(s, 0, true));
    expect(html).not.toContain('data-seed');
    // Unflipped tokens render only their back-sigil — never a `.token-face`.
    const unflipped = Object.entries(st.board.state.nodes)
      .filter(([, ns]) => ns.hiddenToken !== null && !ns.hiddenToken.flipped)
      .map(([id]) => id);
    for (const id of unflipped) {
      expect(html).not.toContain(`data-node-token="${id}"`);
    }
  });

  it('a shake selector can never resolve a rival seat card slot', () => {
    root.innerHTML =
      '<div class="house-plaque"><span class="card-slot" data-seat="1"></span></div>' +
      '<g class="node-group" data-node="keystone"></g>';
    const anim = new AffordanceAnimator(() => root, 0);
    anim.shake(nodeSelector('keystone'), 'target', null);
    expect(root.querySelector('.card-slot')!.classList.contains(AFFORDANCE_CLASS.shaking))
      .toBe(false);
  });
});
