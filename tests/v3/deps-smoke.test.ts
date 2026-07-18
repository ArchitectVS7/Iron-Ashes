import { describe, it, expect } from 'vitest';
import { gsap } from 'gsap';
import { Howler, Howl } from 'howler';

// T-002 — type-level + module-resolution smoke test for the first runtime deps
// (gsap + howler, pinned in package.json). No usage yet beyond proving the
// packages resolve and expose the APIs the V3.1 presentation sprint will use.
// Never constructs a Howl here: jsdom has no AudioContext, so we only import
// the module (howler degrades to noAudio on load) and assert the API shape.
describe('T-002 runtime deps smoke', () => {
  it('gsap resolves and exposes its timeline API', () => {
    expect(typeof gsap.timeline).toBe('function');
    expect(typeof gsap.to).toBe('function');
  });

  it('howler resolves and exposes Howler + Howl', () => {
    expect(typeof Howler).toBe('object');
    expect(typeof Howl).toBe('function');
  });
});
