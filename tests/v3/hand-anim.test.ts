// @vitest-environment jsdom
/**
 * Hand-delta animations (T-302).
 *
 * Proves the acceptance clauses: the preset record covers every hand-delta kind (and every
 * hand-carrying Move type) with compile-enforced `Record` annotations; instant-mode spies confirm
 * each of deal / draw / play / discard actually fires through the queue; the fog rule (§7 D2)
 * holds in PRESENTATION — a non-viewer seat's hand delta may touch that house's count chip only,
 * never a `.card-slot`; and the whole path is robust to missing DOM / a queue with no animator.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { gsap } from 'gsap';
import {
  HAND_DELTA_PRESETS,
  HAND_MOVE_PRESETS,
  HandAnimator,
  classifyHandDelta,
  handPresetFor,
  handTickContext,
  isHandDeltaMove,
} from '../../src/ui-v3/hand-anim.js';
import { TWEENING_CLASS, suppressTransition } from '../../src/ui-v3/anim-util.js';
import type { HandDeltaKind, HandTickContext } from '../../src/ui-v3/hand-anim.js';
import { AnimationQueue } from '../../src/ui-v3/queue.js';
import type { HandDeltaMove, Move } from '../../src/ui-v3/moves.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

const NO_CTX: HandTickContext = { toPhase: null, roundAdvanced: false };

function delta(from: number, to: number, seat = 0): HandDeltaMove {
  return { type: 'hand_delta', seat, from, to };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('classifyHandDelta', () => {
  const cases: ReadonlyArray<readonly [string, HandDeltaMove, HandTickContext, HandDeltaKind]> = [
    ['grew at a round boundary', delta(2, 5), { toPhase: null, roundAdvanced: true }, 'deal'],
    ['grew into DAWN', delta(2, 5), { toPhase: 'DAWN', roundAdvanced: false }, 'deal'],
    ['grew into THREAT', delta(2, 5), { toPhase: 'THREAT', roundAdvanced: false }, 'deal'],
    ['grew mid-phase', delta(2, 3), NO_CTX, 'draw'],
    ['grew during ACTION', delta(2, 3), { toPhase: 'ACTION', roundAdvanced: false }, 'draw'],
    ['shrank at a round boundary', delta(6, 4), { toPhase: null, roundAdvanced: true }, 'discard'],
    ['shrank into DAWN', delta(6, 4), { toPhase: 'DAWN', roundAdvanced: false }, 'discard'],
    ['shrank mid-phase', delta(4, 3), NO_CTX, 'play'],
    ['shrank into ACTION', delta(4, 3), { toPhase: 'ACTION', roundAdvanced: false }, 'play'],
  ];

  for (const [label, move, ctx, expected] of cases) {
    it(`${label} → ${expected}`, () => {
      expect(classifyHandDelta(move, ctx)).toBe(expected);
    });
  }

  it('is total — an equal-count delta still classifies (never throws)', () => {
    expect(classifyHandDelta(delta(3, 3), NO_CTX)).toBe('play');
  });
});

describe('handTickContext', () => {
  it('reads the phase entered and the round boundary from the batch itself', () => {
    const moves: Move[] = [
      { type: 'round_advance', from: 2, to: 3 },
      { type: 'phase_advance', from: 'DAWN', to: 'THREAT' },
    ];
    expect(handTickContext(moves)).toEqual({ toPhase: 'THREAT', roundAdvanced: true });
    expect(handTickContext([])).toEqual({ toPhase: null, roundAdvanced: false });
  });
});

describe('preset registry coverage', () => {
  it('covers all four kinds with well-formed presets', () => {
    expect(Object.keys(HAND_DELTA_PRESETS).sort()).toEqual(['deal', 'discard', 'draw', 'play']);
    for (const [key, preset] of Object.entries(HAND_DELTA_PRESETS)) {
      expect(preset.kind).toBe(key);
      expect(preset.seconds).toBeGreaterThan(0);
      expect(['pre-settle', 'post-settle']).toContain(preset.stage);
      expect(typeof preset.build).toBe('function');
    }
  });

  it('covers every hand-carrying Move type', () => {
    expect(Object.keys(HAND_MOVE_PRESETS)).toEqual(['hand_delta']);
    expect(handPresetFor(delta(2, 3), NO_CTX).kind).toBe('draw');
  });

  // COMPILE GATE (the acceptance clause): both registries are declared with EXPLICIT `Record<…>`
  // annotations, so a new kind / hand move type without a preset fails `tsc`. This line is the
  // type-level mirror of that gate — deleting a kind here would not compile either.
  it('is compile-enforced', () => {
    const cover: Record<HandDeltaKind, true> = { deal: true, draw: true, play: true, discard: true };
    expect(Object.keys(cover)).toHaveLength(4);
  });

  it('every preset build is a safe no-op with no targets or a null timeline', () => {
    for (const preset of Object.values(HAND_DELTA_PRESETS)) {
      expect(() => preset.build([], null)).not.toThrow();
      expect(() => preset.build([document.createElement('span')], null)).not.toThrow();
    }
  });

  it('isHandDeltaMove narrows only hand deltas', () => {
    expect(isHandDeltaMove(delta(1, 2))).toBe(true);
    expect(isHandDeltaMove({ type: 'phase_advance', from: 'THREAT', to: 'PLEDGE' })).toBe(false);
  });
});

/** A minimal DOM matching the real view's hand dock + house plaques. */
function mountFakeDom(slots: number): HTMLElement {
  const root = document.createElement('div');
  const cards = Array.from({ length: slots }, (_, i) => `<span class="card-slot" data-slot="${i}"></span>`).join('');
  root.innerHTML =
    `<div class="hand-dock"><span class="hand-fan">${cards}</span></div>` +
    [0, 1, 2, 3]
      .map(
        (seat) =>
          `<div class="house-plaque"><span class="token-chip" data-stat="hand" data-seat="${seat}"></span></div>`,
      )
      .join('');
  document.body.appendChild(root);
  return root;
}

describe('HandAnimator target resolution (fog, §7 D2)', () => {
  it("uses the trailing card slots for the viewer's own seat", () => {
    const root = mountFakeDom(5);
    const anim = new HandAnimator(() => root, 0);
    const targets = anim.targetsFor(delta(5, 3, 0));
    expect(targets).toHaveLength(2);
    expect(targets.map((el) => el.getAttribute('data-slot'))).toEqual(['3', '4']);
  });

  it('clamps to the available slots', () => {
    const root = mountFakeDom(2);
    const anim = new HandAnimator(() => root, 0);
    expect(anim.targetsFor(delta(0, 9, 0))).toHaveLength(2);
  });

  it('animates the COUNT CHIP only for a non-viewer seat — never a card slot', () => {
    const root = mountFakeDom(5);
    const anim = new HandAnimator(() => root, 0);
    const targets = anim.targetsFor(delta(3, 5, 2));
    expect(targets).toHaveLength(1);
    expect(targets[0].getAttribute('data-stat')).toBe('hand');
    expect(targets[0].getAttribute('data-seat')).toBe('2');
    for (const el of targets) expect(el.classList.contains('card-slot')).toBe(false);
  });

  it('returns nothing (and never throws) when the DOM is absent', () => {
    const anim = new HandAnimator(() => null, 0);
    expect(anim.targetsFor(delta(2, 3, 0))).toEqual([]);
    expect(() => anim.fire(delta(2, 3, 0), NO_CTX, null)).not.toThrow();

    const bare = document.createElement('div');
    const anim2 = new HandAnimator(() => bare, 0);
    expect(anim2.targetsFor(delta(2, 3, 0))).toEqual([]);
    expect(anim2.targetsFor(delta(2, 3, 1))).toEqual([]);
  });
});

describe('instant mode fires every hand-delta preset (spy)', () => {
  const KINDS: ReadonlyArray<readonly [HandDeltaKind, Move[]]> = [
    ['deal', [{ type: 'round_advance', from: 1, to: 2 }, delta(2, 5)]],
    ['draw', [delta(2, 3)]],
    ['play', [delta(4, 3)]],
    ['discard', [{ type: 'phase_advance', from: 'ACTION', to: 'DAWN' }, delta(6, 4)]],
  ];

  for (const [kind, moves] of KINDS) {
    it(`${kind} fires once, settles synchronously, and leaves the queue idle`, () => {
      const root = mountFakeDom(6);
      const spy = vi.spyOn(HandAnimator.prototype, 'fire');
      const settle = vi.fn();
      const q = new AnimationQueue(settle, 'instant', undefined, new HandAnimator(() => root, 0));

      q.enqueue(moves);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.results[0].value).toBe(kind);
      // Instant mode passes a NULL timeline — no tween is built on the synchronous path.
      expect(spy.mock.calls[0][2]).toBeNull();
      expect(settle).toHaveBeenCalledTimes(1);
      expect(q.isIdle).toBe(true);
    });
  }

  it('non-hand moves never reach the animator', () => {
    const root = mountFakeDom(4);
    const spy = vi.spyOn(HandAnimator.prototype, 'fire');
    const settle = vi.fn();
    const q = new AnimationQueue(settle, 'instant', undefined, new HandAnimator(() => root, 0));

    q.enqueue([
      { type: 'phase_advance', from: 'THREAT', to: 'PLEDGE' },
      { type: 'banners_delta', seat: 1, from: 2, to: 3 },
    ]);

    expect(spy).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it('a queue built WITHOUT an animator still settles (3-arg back-compat)', () => {
    const settle = vi.fn();
    const q = new AnimationQueue(settle, 'instant');
    expect(() => q.enqueue([delta(3, 2)])).not.toThrow();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(q.isIdle).toBe(true);
  });
});

describe('animated mode splits pre-settle from post-settle', () => {
  /** Force animated mode: a `matchMedia` stub whose reduce query does not match. */
  function stubAnimated(): void {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  afterEach(() => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  it('an outgoing (play) delta tweens on the batch timeline BEFORE the settle', () => {
    stubAnimated();
    const root = mountFakeDom(5);
    const spy = vi.spyOn(HandAnimator.prototype, 'fire');
    const settle = vi.fn();
    const q = new AnimationQueue(settle, 'auto', undefined, new HandAnimator(() => root, 0));

    q.enqueue([delta(4, 3)]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.results[0].value).toBe('play');
    expect(spy.mock.calls[0][2]).not.toBeNull(); // a real timeline, not the instant null
    expect(settle).not.toHaveBeenCalled();
    expect(q.isIdle).toBe(false);
    q.flush();
    expect(settle).toHaveBeenCalled();
  });

  it('an incoming (draw) delta is deferred — nothing fires until the settle', () => {
    stubAnimated();
    const root = mountFakeDom(5);
    const spy = vi.spyOn(HandAnimator.prototype, 'fire');
    const settle = vi.fn();
    const q = new AnimationQueue(settle, 'auto', undefined, new HandAnimator(() => root, 0));

    q.enqueue([delta(2, 3)]);

    // `deal`/`draw` are post-settle: the entrance can only exist after `innerHTML` is replaced.
    expect(spy).not.toHaveBeenCalled();
    expect(q.isIdle).toBe(false);
    q.flush();
    expect(settle).toHaveBeenCalled();
    expect(q.isIdle).toBe(true);
  });
});

describe('T-310 transition-fight suppression (is-tweening)', () => {
  it('suppressTransition tags targets with a live timeline and registers their removal', () => {
    const el = document.createElement('span');
    el.className = 'card-slot';
    const tl = gsap.timeline({ paused: true });

    suppressTransition([el], tl);
    // Added synchronously so the very first tween frame is already transition-free.
    expect(el.classList.contains(TWEENING_CLASS)).toBe(true);

    // The removal rides the timeline's onComplete — invoking it clears the class (jsdom-stable, no
    // dependence on GSAP ticking under a headless clock).
    const onComplete = tl.eventCallback('onComplete');
    expect(typeof onComplete).toBe('function');
    onComplete!();
    expect(el.classList.contains(TWEENING_CLASS)).toBe(false);
    tl.kill();
  });

  it('is a strict no-op on the instant path — a null timeline adds NO class', () => {
    const el = document.createElement('span');
    el.className = 'card-slot';
    suppressTransition([el], null);
    expect(el.classList.contains(TWEENING_CLASS)).toBe(false);
    // Empty targets are also inert.
    expect(() => suppressTransition([], gsap.timeline({ paused: true }))).not.toThrow();
  });

  it('a hand-delta preset fired with a real timeline tags exactly the tweened slots', () => {
    const root = mountFakeDom(4);
    const anim = new HandAnimator(() => root, 0);
    const tl = gsap.timeline({ paused: true });

    anim.fire(delta(4, 2, 0), NO_CTX, tl); // a `play` spend on the 2 trailing slots
    const tagged = Array.from(root.querySelectorAll('.card-slot.is-tweening'));
    expect(tagged).toHaveLength(2);
    tl.kill();
  });

  it('the same preset fired in instant mode (null tl) leaves no is-tweening class anywhere', () => {
    const root = mountFakeDom(4);
    const anim = new HandAnimator(() => root, 0);
    anim.fire(delta(4, 2, 0), NO_CTX, null);
    expect(root.querySelectorAll(`.${TWEENING_CLASS}`)).toHaveLength(0);
  });
});

describe('fog holds through a real mounted view', () => {
  it("a rival's hand delta surfaces no rival card values in the DOM", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app')!;
    const session = new GameSession(4, 'competitive', 4242);
    mountView(root, session);

    const anim = new HandAnimator(() => root, session.humanIndex);
    const rival = session.humanIndex === 0 ? 1 : 0;
    const targets = anim.targetsFor(delta(3, 5, rival));
    for (const el of targets) expect(el.classList.contains('card-slot')).toBe(false);

    // Every rendered `.card-slot` belongs to the viewer's own dock — no rival hand DOM exists.
    const slots = Array.from(root.querySelectorAll('.card-slot'));
    const dockSlots = Array.from(root.querySelectorAll('.hand-dock .card-slot'));
    expect(slots.filter((s) => !dockSlots.includes(s) && s.closest('.hand-dock') === null && s.closest('.hand-fan--laststand') === null)).toEqual([]);
  });
});
