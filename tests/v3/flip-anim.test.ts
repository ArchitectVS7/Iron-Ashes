// @vitest-environment jsdom
/**
 * Flip reveals (T-303).
 *
 * Proves the acceptance clauses:
 *   1. THE FRAME-LEVEL FOG TEST — in instant mode, assertion ORDERING around the settle proves the
 *      pre-flip DOM contains no face data for a revealed hidden token: the snapshot taken inside
 *      `firstHalf` (strictly before `settle()`) carries only the back-sigil, while the snapshot
 *      taken inside `secondHalf` (strictly after) carries the revealed `data-token-kind`.
 *   2. EVERY reveal Move type routes through the flip preset — a compile-gated
 *      `Record<RevealMoveType, …>` fixture map driven through the real queue.
 *   3. jsdom E2E stays green — instant mode builds NO overlay DOM at all, so the existing DOM
 *      snapshots (and `shots:v3`, which runs reduced-motion) are unaffected.
 * Plus robustness (null timeline / missing DOM / no animator) and fog scoping of `targetsFor`.
 */

import { describe, expect, it, afterEach } from 'vitest';
import { gsap } from 'gsap';
import { createGame, observableState } from '../../src/v3/index.js';
import type { GameState } from '../../src/v3/index.js';
import { renderBoard } from '../../src/ui-v3/board-view.js';
import { AnimationQueue } from '../../src/ui-v3/queue.js';
import { FlipAnimator, REVEAL_PRESETS, flipPresetFor } from '../../src/ui-v3/flip-anim.js';
import type { FlipHalf } from '../../src/ui-v3/flip-anim.js';
import { REVEAL_MOVE_TYPES, diffObservable, isRevealMove } from '../../src/ui-v3/moves.js';
import type { Move, RevealMove, RevealMoveType } from '../../src/ui-v3/moves.js';

const NODE = 'holding-ne';

/** The hidden payload planted on `holding-ne` — mirrors the T-208 fog fixture exactly. */
const TOKEN = {
  kind: 'recruit',
  sigil: 'bright',
  archetype: 'marshal',
  retainerName: 'The Sworn',
  bonusArchetype: null,
  bonusName: null,
  flipped: false,
  bonusClaimed: false,
};

/** Face-data needles that must NOT appear in the DOM before the flip midpoint. */
const FACE_NEEDLES = ['data-token-kind', 'recruit', 'marshal', 'the sworn'];

function stateWithToken(flipped: boolean): GameState {
  const st = createGame(4, 'competitive', 42, 1);
  (st.board.state.nodes[NODE] as { hiddenToken: unknown }).hiddenToken = { ...TOKEN, flipped };
  return st;
}

/** The revealing node group's own markup inside a DOM snapshot, lowercased (T-208 scoping rule). */
function nodeMarkup(html: string): string {
  const host = document.createElement('div');
  host.innerHTML = html;
  const group = Array.from(host.querySelectorAll('g[data-node]')).find(
    g => g.getAttribute('data-node') === NODE,
  );
  return (group?.outerHTML ?? '').toLowerCase();
}

function mountRoot(): HTMLElement {
  document.body.innerHTML = '<div id="app"></div>';
  return document.getElementById('app')!;
}

/** Records the DOM at each half, in call order, then delegates to the real animator. */
class SpyFlipAnimator extends FlipAnimator {
  readonly snapshots: string[] = [];
  readonly order: string[] = [];
  readonly dispatched: Array<[FlipHalf, RevealMoveType]> = [];
  readonly #root: () => HTMLElement | null;

  constructor(rootFor: () => HTMLElement | null, viewerSeat: number) {
    super(rootFor, viewerSeat);
    this.#root = rootFor;
  }

  #snap(): void {
    this.snapshots.push(this.#root()?.innerHTML ?? '');
  }

  override firstHalf(move: RevealMove, tl: gsap.core.Timeline | null): RevealMoveType {
    this.#snap();
    this.order.push(`first:${move.type}`);
    const t = super.firstHalf(move, tl);
    this.dispatched.push(['first', t]);
    return t;
  }

  override secondHalf(move: RevealMove, tl: gsap.core.Timeline | null): RevealMoveType {
    this.#snap();
    this.order.push(`second:${move.type}`);
    const t = super.secondHalf(move, tl);
    this.dispatched.push(['second', t]);
    return t;
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ── 1 · The frame-level fog test ──────────────────────────────────────────────

describe('T-303 · frame-level fog — face content enters the DOM only at the flip midpoint', () => {
  it('the pre-flip DOM carries no face data; the post-midpoint DOM does', () => {
    const obsA = observableState(stateWithToken(false), 0);
    const obsB = observableState(stateWithToken(true), 0);

    // The diff is exactly the one reveal we planted.
    const moves = diffObservable(obsA, obsB);
    const reveals = moves.filter(isRevealMove);
    expect(reveals).toEqual([
      { type: 'token_reveal', node: NODE, sigil: 'bright', kind: 'recruit', archetype: 'marshal' },
    ]);

    const root = mountRoot();
    root.innerHTML = renderBoard(obsA);

    const spy = new SpyFlipAnimator(() => root, 0);
    const order: string[] = [];
    const settle = (): void => {
      order.push('settle');
      root.innerHTML = renderBoard(obsB);
    };
    // Share one ordering log between the spy and the settle so ordering is ASSERTED, not implied.
    const queue = new AnimationQueue(settle, 'instant', undefined, undefined, spy);
    const origFirst = spy.firstHalf.bind(spy);
    const origSecond = spy.secondHalf.bind(spy);
    spy.firstHalf = (m, tl): RevealMoveType => {
      order.push('first');
      return origFirst(m, tl);
    };
    spy.secondHalf = (m, tl): RevealMoveType => {
      order.push('second');
      return origSecond(m, tl);
    };
    queue.enqueue(moves);

    // ORDERING: back half → settle (the midpoint) → face half. Nothing else.
    expect(order).toEqual(['first', 'settle', 'second']);

    const pre = spy.snapshots[0].toLowerCase();
    const post = spy.snapshots[1].toLowerCase();

    // PRE-FLIP: the face-data MARKER exists nowhere in the whole app DOM…
    expect(pre).toContain('sigil-bright');
    expect(pre.includes('data-token-kind'), 'no face marker anywhere pre-flip').toBe(false);
    // …and the revealing node's own markup carries none of the hidden payload. (Scoped to the
    // group exactly as the T-208 guard is, so an unrelated `piece-marshal` elsewhere on the board
    // can never mask — or falsely trip — this assertion.)
    expect(nodeMarkup(spy.snapshots[0])).toContain('sigil-bright');
    for (const needle of FACE_NEEDLES) {
      expect(
        nodeMarkup(spy.snapshots[0]).includes(needle),
        `pre-flip node markup must not contain "${needle}"`,
      ).toBe(false);
    }

    // POST-MIDPOINT: the revealed face is present.
    expect(post).toContain('data-token-kind="recruit"');
    expect(root.innerHTML).toContain('data-token-kind="recruit"');
    expect(root.querySelector(`g[data-node="${NODE}"] .token-face`)).not.toBeNull();
    // …and the back-sigil is gone (the two branches are mutually exclusive).
    expect(root.querySelector(`g[data-node="${NODE}"] .sigil`)).toBeNull();
  });
});

// ── 2 · Every reveal Move type routes through the flip preset ────────────────

/**
 * One fixture per reveal type. The EXPLICIT `Record<RevealMoveType, RevealMove>` annotation is the
 * compile gate: a new reveal type registered in `moves.ts` without a fixture here is a `tsc` error.
 */
const REVEAL_FIXTURES: Record<RevealMoveType, RevealMove> = {
  token_reveal: {
    type: 'token_reveal',
    node: NODE,
    sigil: 'bright',
    kind: 'recruit',
    archetype: 'marshal',
  },
  telegraph: { type: 'telegraph', effect: 'SPREAD', targetNode: NODE, doomCost: 2 },
  bloodpact_exposed: { type: 'bloodpact_exposed' },
};

describe('T-303 · every reveal Move type routes through the flip preset', () => {
  for (const type of REVEAL_MOVE_TYPES) {
    it(`${type} fires exactly one back half and one face half`, () => {
      const root = mountRoot();
      const spy = new SpyFlipAnimator(() => root, 0);
      let settles = 0;
      const queue = new AnimationQueue(
        () => {
          settles++;
        },
        'instant',
        undefined,
        undefined,
        spy,
      );
      queue.enqueue([REVEAL_FIXTURES[type]]);
      expect(settles).toBe(1);
      expect(spy.dispatched).toEqual([
        ['first', type],
        ['second', type],
      ]);
      expect(spy.order).toEqual([`first:${type}`, `second:${type}`]);
    });

    it(`${type} has a well-formed preset`, () => {
      expect(REVEAL_PRESETS[type].type).toBe(type);
      expect(REVEAL_PRESETS[type].seconds).toBeGreaterThan(0);
      expect(flipPresetFor(REVEAL_FIXTURES[type])).toBe(REVEAL_PRESETS[type]);
    });
  }

  it('a mixed batch flips only the reveal moves', () => {
    const root = mountRoot();
    const spy = new SpyFlipAnimator(() => root, 0);
    const batch: Move[] = [
      { type: 'phase_advance', from: 'DAWN', to: 'THREAT' },
      REVEAL_FIXTURES.telegraph,
      { type: 'hand_delta', seat: 0, from: 3, to: 4 },
      REVEAL_FIXTURES.bloodpact_exposed,
    ];
    const noop = (): void => undefined;
    new AnimationQueue(noop, 'instant', undefined, undefined, spy).enqueue(batch);
    expect(spy.dispatched.map(([, t]) => t)).toEqual([
      'telegraph',
      'bloodpact_exposed',
      'telegraph',
      'bloodpact_exposed',
    ]);
  });
});

// ── 3 · Registry shape / narrowing ──────────────────────────────────────────

describe('T-303 · reveal registry + narrowing', () => {
  it('REVEAL_PRESETS keys match REVEAL_MOVE_TYPES exactly', () => {
    expect(Object.keys(REVEAL_PRESETS).sort()).toEqual([...REVEAL_MOVE_TYPES].sort());
  });

  it('isRevealMove is true for every reveal fixture', () => {
    for (const type of REVEAL_MOVE_TYPES) {
      expect(isRevealMove(REVEAL_FIXTURES[type]), type).toBe(true);
    }
  });

  it('isRevealMove is false for non-reveal moves', () => {
    const others: Move[] = [
      { type: 'phase_advance', from: 'DAWN', to: 'THREAT' },
      { type: 'hand_delta', seat: 0, from: 3, to: 4 },
      { type: 'piece_move', pieceId: 'p1', owner: 0, from: 'keep-n', to: 'mid-n' },
      { type: 'pledge', seat: 1, amount: 2 },
      { type: 'elimination', seat: 2 },
    ];
    for (const m of others) expect(isRevealMove(m), m.type).toBe(false);
  });
});

// ── 4 · Instant mode creates no overlay DOM ─────────────────────────────────

describe('T-303 · instant mode builds no overlay DOM', () => {
  it('a token_reveal in instant mode leaves no .fx-layer / .flip-card behind', () => {
    const root = mountRoot();
    root.innerHTML = `<div class="board-region">${renderBoard(observableState(stateWithToken(false), 0))}</div>`;
    const flip = new FlipAnimator(() => root, 0);
    new AnimationQueue(
      () => {
        root.innerHTML = `<div class="board-region">${renderBoard(observableState(stateWithToken(true), 0))}</div>`;
      },
      'instant',
      undefined,
      undefined,
      flip,
    ).enqueue([REVEAL_FIXTURES.token_reveal]);
    expect(root.querySelector('.fx-layer')).toBeNull();
    expect(root.querySelector('.flip-card')).toBeNull();
  });
});

// ── 5 · Robustness ──────────────────────────────────────────────────────────

describe('T-303 · robustness', () => {
  it('a null timeline with empty targets is a silent no-op', () => {
    const root = mountRoot();
    const flip = new FlipAnimator(() => root, 0);
    for (const type of REVEAL_MOVE_TYPES) {
      expect(flip.targetsFor(REVEAL_FIXTURES[type], 'first')).toEqual([]);
      expect(() => flip.firstHalf(REVEAL_FIXTURES[type], null)).not.toThrow();
      expect(() => flip.secondHalf(REVEAL_FIXTURES[type], null)).not.toThrow();
    }
  });

  it('a missing root never throws', () => {
    const flip = new FlipAnimator(() => null, 0);
    expect(flip.targetsFor(REVEAL_FIXTURES.token_reveal, 'second')).toEqual([]);
    expect(() => flip.firstHalf(REVEAL_FIXTURES.token_reveal, null)).not.toThrow();
  });

  it('a queue with no flip animator (4-arg and 3-arg forms) still settles exactly once', () => {
    for (const build of [
      (s: () => void): AnimationQueue => new AnimationQueue(s, 'instant', undefined),
      (s: () => void): AnimationQueue => new AnimationQueue(s, 'instant', undefined, undefined),
    ]) {
      let settles = 0;
      build(() => {
        settles++;
      }).enqueue([REVEAL_FIXTURES.token_reveal]);
      expect(settles).toBe(1);
    }
  });

  it('exposes the fog viewer seat it was constructed with', () => {
    expect(new FlipAnimator(() => null, 2).viewerSeat).toBe(2);
  });
});

// ── 6 · Fog scoping of the targets + the overlay ────────────────────────────

describe('T-303 · fog scoping (§7 D2 extends to presentation)', () => {
  it('token_reveal targets stay inside the node group — never a card slot or rival plaque', () => {
    const root = mountRoot();
    root.innerHTML =
      `<div class="board-region">${renderBoard(observableState(stateWithToken(false), 0))}</div>` +
      `<div class="hand-dock"><div class="card-slot" id="slot"></div></div>` +
      `<div class="house-plaque" id="plaque"><span data-stat="hand">3</span></div>`;
    const flip = new FlipAnimator(() => root, 0);
    const group = root.querySelector(`g[data-node="${NODE}"]`)!;
    const targets = flip.targetsFor(REVEAL_FIXTURES.token_reveal, 'first');
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      expect(group.contains(t), 'target is inside the revealing node group').toBe(true);
      expect(t.closest('.card-slot')).toBeNull();
      expect(t.closest('.house-plaque')).toBeNull();
    }
  });

  it('the pre-midpoint overlay carries the sigil back only — no kind / archetype / name', () => {
    const root = mountRoot();
    root.innerHTML = `<div class="board-region">${renderBoard(observableState(stateWithToken(false), 0))}</div>`;
    const flip = new FlipAnimator(() => root, 0);
    const tl = gsap.timeline({ paused: true });
    flip.firstHalf(REVEAL_FIXTURES.token_reveal, tl);

    const card = root.querySelector('.fx-layer .flip-card');
    expect(card, 'the overlay exists once a real timeline is supplied').not.toBeNull();
    const markup = (card as Element).innerHTML.toLowerCase();
    expect(markup).toContain('cf-token-back');
    expect(markup).toContain('data-sigil="bright"');
    for (const needle of ['recruit', 'marshal', 'the sworn', 'data-face-kind="recruit"']) {
      expect(markup.includes(needle), `overlay back must not contain "${needle}"`).toBe(false);
    }
    tl.kill();
  });

  it('the post-midpoint overlay may show the revealed face (public once flipped)', () => {
    const root = mountRoot();
    root.innerHTML = `<div class="board-region">${renderBoard(observableState(stateWithToken(true), 0))}</div>`;
    const flip = new FlipAnimator(() => root, 0);
    const tl = gsap.timeline({ paused: true });
    flip.secondHalf(REVEAL_FIXTURES.token_reveal, tl);
    const card = root.querySelector('.fx-layer .flip-card');
    expect(card).not.toBeNull();
    expect((card as Element).innerHTML).toContain('cf-token-front');
    tl.kill();
  });
});
