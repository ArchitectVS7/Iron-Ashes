// @vitest-environment jsdom
/**
 * Global GSAP config guard (T-310).
 *
 * `configureGsap` applies compositor-friendly GSAP defaults (`force3D` / `overwrite`) ONLY in a real
 * browser layout engine. Under jsdom there is no `window.matchMedia` — the same signal `resolveMode()`
 * uses to pick instant mode — so the call must be a strict no-op that never throws and never mutates
 * global GSAP state, keeping the snap-count replay and `shots:v3` gates byte-identical.
 */

import { describe, expect, it } from 'vitest';
import { configureGsap } from '../../src/ui-v3/anim-config.js';
import { resolveMode } from '../../src/ui-v3/queue.js';

describe('configureGsap — instant-path guard', () => {
  it('is a no-op (never throws) on the instant path — the jsdom / reduced-motion environment', () => {
    // jsdom resolves to instant (matchMedia throws → resolveMode catches → 'instant'); the config
    // must gate on exactly that signal, so it never applies the browser-only GSAP defaults here.
    expect(resolveMode()).toBe('instant');
    expect(() => configureGsap()).not.toThrow();
    // Idempotent: repeat calls (many mountViews in one session) stay safe.
    expect(() => configureGsap()).not.toThrow();
  });
});
