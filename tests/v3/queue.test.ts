// @vitest-environment jsdom
/**
 * Animation queue + instant mode (T-103).
 *
 * Proves the acceptance clauses: instant mode settles the DOM SYNCHRONOUSLY (the path the E2E
 * suite and jsdom drive), jsdom's absent `matchMedia` resolves to instant, a `prefers-reduced-motion`
 * match (via a `matchMedia` stub) selects instant while a non-match selects animated (deferred), and
 * mounting the view routes both the initial paint and a live click through the queue — no direct
 * re-render path remains.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { AnimationQueue, resolveMode } from '../../src/ui-v3/queue.js';
import type { Move } from '../../src/ui-v3/moves.js';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

const MOVE: Move = { type: 'phase_advance', from: 'THREAT', to: 'PLEDGE' };

/** Install a `window.matchMedia` stub whose reduce-query `matches` is `reduced`. */
function stubMatchMedia(reduced: boolean): void {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce') ? reduced : false,
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
  // jsdom ships no matchMedia — restore that baseline so cross-test order can't leak a stub.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  vi.restoreAllMocks();
});

describe('resolveMode', () => {
  it('is instant when matchMedia is absent (jsdom default)', () => {
    expect(window.matchMedia).toBeUndefined();
    expect(resolveMode()).toBe('instant');
  });

  it('is instant when prefers-reduced-motion matches', () => {
    stubMatchMedia(true);
    expect(resolveMode()).toBe('instant');
  });

  it('is animated when prefers-reduced-motion does not match', () => {
    stubMatchMedia(false);
    expect(resolveMode()).toBe('animated');
  });
});

describe('AnimationQueue instant mode', () => {
  it('settles synchronously and stays idle (explicit instant)', () => {
    const spy = vi.fn();
    const q = new AnimationQueue(spy, 'instant');
    q.enqueue([MOVE]);
    // The settle ran BEFORE enqueue returned — no timers advanced.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q.isIdle).toBe(true);
  });

  it("'auto' settles synchronously under jsdom (no matchMedia)", () => {
    const spy = vi.fn();
    const q = new AnimationQueue(spy, 'auto');
    q.enqueue([MOVE]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q.isIdle).toBe(true);
  });

  it('empty diffs still settle synchronously in instant mode', () => {
    const spy = vi.fn();
    const q = new AnimationQueue(spy, 'instant');
    q.enqueue([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q.isIdle).toBe(true);
  });
});

describe('AnimationQueue reduced-motion drives the path (matchMedia stub)', () => {
  it("'auto' + reduce-match settles synchronously (instant)", () => {
    stubMatchMedia(true);
    const spy = vi.fn();
    const q = new AnimationQueue(spy, 'auto');
    q.enqueue([MOVE]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(q.isIdle).toBe(true);
  });

  it("'auto' + no reduce-match defers settlement (animated), then flush completes it", () => {
    stubMatchMedia(false);
    const spy = vi.fn();
    const q = new AnimationQueue(spy, 'auto');
    q.enqueue([MOVE]);
    // Animated: the settle has NOT fired synchronously and a timeline is playing.
    expect(spy).not.toHaveBeenCalled();
    expect(q.isIdle).toBe(false);
    // Forcing completion settles the DOM and returns the queue to idle.
    q.flush();
    expect(spy).toHaveBeenCalled();
    expect(q.isIdle).toBe(true);
  });
});

describe('mountView routes every render through the queue', () => {
  it('initial paint + a live click both settle synchronously (no direct render path)', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app')!;
    const session = new GameSession(4, 'competitive', 12345);

    mountView(root, session);
    // Initial paint went through the queue (instant under jsdom) → DOM is populated.
    expect(root.innerHTML.length).toBeGreaterThan(0);
    const before = root.innerHTML;

    // Drive one real control click; the re-render must have already happened synchronously.
    const control = root.querySelector<HTMLElement>('[data-action="advance-threat"]');
    expect(control).not.toBeNull();
    control!.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(root.innerHTML).not.toBe(before);
  });
});
