/**
 * Tests for the Animation System
 *
 * Covers:
 *  1. shouldAnimate() free function — enabled flag + reduced motion
 *  2. prefersReducedMotion() — window absent, matchMedia branches
 *  3. AnimationSystem class — enabled, reducedMotionOverride, shouldAnimate()
 *  4. Event system — addEventListener, removeEventListener, fireEvent
 *  5. fireDoomAdvance — all three cause types produce correct event types
 *  6. All fire* convenience methods — event type and payload data
 *  7. Listener error isolation — throwing listener doesn't break others
 *  8. animateValue — skip-to-end when shouldAnimate=false or duration=0
 *  9. play* functions — fire correct event, resolve when animations disabled
 * 10. ANIMATION_DURATIONS — all keys present, all values positive
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  prefersReducedMotion,
  shouldAnimate,
  animateValue,
  AnimationSystem,
  ANIMATION_DURATIONS,
  playDoomAdvanceAnimation,
  playDoomRecedeAnimation,
  playRescueAnimation,
  playBloodPactRevealAnimation,
  playFinalPhaseEnterAnimation,
  playCombatFateRevealAnimation,
  playCombatResolutionAnimation,
  playMovementCompleteAnimation,
  playStrongholdClaimAnimation,
  playBrokenCourtEnterAnimation,
  playVotingCompleteAnimation,
  playShadowkingActionAnimation,
  animationSystem,
} from '../../src/systems/animation.js';
import type { AnimationEvent, AnimationEventType } from '../../src/systems/animation.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Capture events fired on an AnimationSystem instance */
function captureEvent(
  system: AnimationSystem,
  type: AnimationEventType,
): { received: AnimationEvent[] } {
  const received: AnimationEvent[] = [];
  system.addEventListener(type, (e) => received.push(e));
  return { received };
}

// ── prefersReducedMotion ───────────────────────────────────────────────────────

describe('prefersReducedMotion()', () => {
  it('returns false when window is undefined', () => {
    const original = global.window;
    // @ts-expect-error — intentionally removing window
    delete global.window;
    expect(prefersReducedMotion()).toBe(false);
    global.window = original;
  });

  it('returns false when matchMedia is not available', () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-expect-error — intentionally removing matchMedia
    delete window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
    window.matchMedia = originalMatchMedia;
  });

  it('returns true when matchMedia reports reduce preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia reports no reduce preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });
});

// ── shouldAnimate() free function ─────────────────────────────────────────────

describe('shouldAnimate() free function', () => {
  beforeEach(() => {
    // Default: no reduced motion preference
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  });

  it('returns false when enabled is false regardless of reducedMotion', () => {
    expect(shouldAnimate(false)).toBe(false);
    expect(shouldAnimate(false, false)).toBe(false);
  });

  it('returns true when enabled and no reduced motion', () => {
    expect(shouldAnimate(true)).toBe(true);
  });

  it('returns false when enabled but reduced motion is active (respectReducedMotion=true)', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    expect(shouldAnimate(true, true)).toBe(false);
  });

  it('returns true when enabled and reduced motion active but respectReducedMotion=false', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    expect(shouldAnimate(true, false)).toBe(true);
  });
});

// ── AnimationSystem — enabled / disabled ──────────────────────────────────────

describe('AnimationSystem — setEnabled / isEnabled', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  });

  it('is enabled by default', () => {
    expect(system.isEnabled()).toBe(true);
  });

  it('setEnabled(false) disables animations', () => {
    system.setEnabled(false);
    expect(system.isEnabled()).toBe(false);
    expect(system.shouldAnimate()).toBe(false);
  });

  it('setEnabled(true) re-enables animations', () => {
    system.setEnabled(false);
    system.setEnabled(true);
    expect(system.shouldAnimate()).toBe(true);
  });
});

// ── AnimationSystem — shouldAnimate() method ──────────────────────────────────

describe('AnimationSystem — shouldAnimate()', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  });

  it('returns true when enabled and no reduced motion', () => {
    expect(system.shouldAnimate()).toBe(true);
  });

  it('returns false when disabled', () => {
    system.setEnabled(false);
    expect(system.shouldAnimate()).toBe(false);
  });

  it('returns false when reduced motion active and respectReducedMotion=true', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    expect(system.shouldAnimate(true)).toBe(false);
  });

  it('reducedMotionOverride bypasses matchMedia check', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
    system.setReducedMotionOverride(true);
    expect(system.shouldAnimate(true)).toBe(true);
  });

  it('reducedMotionOverride does not affect disabled state', () => {
    system.setEnabled(false);
    system.setReducedMotionOverride(true);
    expect(system.shouldAnimate()).toBe(false);
  });
});

// ── AnimationSystem — event system ────────────────────────────────────────────

describe('AnimationSystem — addEventListener / removeEventListener / fireEvent', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
  });

  it('fireEvent calls registered listener with correct event type', () => {
    const { received } = captureEvent(system, 'doom_advance');
    system.fireEvent('doom_advance');
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('doom_advance');
  });

  it('fireEvent passes data to listener', () => {
    const { received } = captureEvent(system, 'movement_complete');
    system.fireEvent('movement_complete', { playerIndex: 2, fromNode: 'a', toNode: 'b' });
    expect(received[0].data).toMatchObject({ playerIndex: 2, fromNode: 'a', toNode: 'b' });
  });

  it('fireEvent includes a timestamp', () => {
    const { received } = captureEvent(system, 'voting_complete');
    system.fireEvent('voting_complete');
    expect(typeof received[0].timestamp).toBe('number');
  });

  it('multiple listeners for same type all receive the event', () => {
    const calls: number[] = [];
    system.addEventListener('stronghold_claim', () => calls.push(1));
    system.addEventListener('stronghold_claim', () => calls.push(2));
    system.fireEvent('stronghold_claim');
    expect(calls).toHaveLength(2);
  });

  it('removeEventListener stops a listener from receiving events', () => {
    const calls: AnimationEvent[] = [];
    const listener = (e: AnimationEvent) => calls.push(e);
    system.addEventListener('combat_resolution', listener);
    system.removeEventListener('combat_resolution', listener);
    system.fireEvent('combat_resolution');
    expect(calls).toHaveLength(0);
  });

  it('fireEvent for type with no listeners does not throw', () => {
    expect(() => system.fireEvent('doom_recede')).not.toThrow();
  });

  it('a throwing listener does not prevent other listeners from running', () => {
    const safe: number[] = [];
    system.addEventListener('blood_pact_reveal', () => { throw new Error('oops'); });
    system.addEventListener('blood_pact_reveal', () => safe.push(1));
    expect(() => system.fireEvent('blood_pact_reveal')).not.toThrow();
    expect(safe).toHaveLength(1);
  });
});

// ── fireDoomAdvance — all three cause paths ────────────────────────────────────

describe('AnimationSystem — fireDoomAdvance()', () => {
  let system: AnimationSystem;

  beforeEach(() => { system = new AnimationSystem(); });

  it('cause "vote_fail" fires doom_advance_vote_fail', () => {
    const { received } = captureEvent(system, 'doom_advance_vote_fail');
    system.fireDoomAdvance('vote_fail', 5);
    expect(received).toHaveLength(1);
    expect(received[0].data?.cause).toBe('vote_fail');
    expect(received[0].data?.newPosition).toBe(5);
  });

  it('cause "deck_reshuffle" fires doom_advance_deck_reshuffle', () => {
    const { received } = captureEvent(system, 'doom_advance_deck_reshuffle');
    system.fireDoomAdvance('deck_reshuffle', 8);
    expect(received).toHaveLength(1);
  });

  it('cause "other" fires doom_advance', () => {
    const { received } = captureEvent(system, 'doom_advance');
    system.fireDoomAdvance('other', 3);
    expect(received).toHaveLength(1);
    expect(received[0].data?.newPosition).toBe(3);
  });
});

// ── fire* convenience methods ─────────────────────────────────────────────────

describe('AnimationSystem — fire* convenience methods', () => {
  let system: AnimationSystem;

  beforeEach(() => { system = new AnimationSystem(); });

  it('fireDoomRecede fires doom_recede with newPosition', () => {
    const { received } = captureEvent(system, 'doom_recede');
    system.fireDoomRecede(4);
    expect(received[0].data?.newPosition).toBe(4);
  });

  it('fireRescuePerformed fires rescue_performed with indices and cardsGiven', () => {
    const { received } = captureEvent(system, 'rescue_performed');
    system.fireRescuePerformed(0, 2, 3);
    expect(received[0].data).toMatchObject({ rescuerIndex: 0, rescuedIndex: 2, cardsGiven: 3 });
  });

  it('fireBloodPactReveal fires blood_pact_reveal with traitorIndex and revealedAt', () => {
    const { received } = captureEvent(system, 'blood_pact_reveal');
    system.fireBloodPactReveal(1, 'game_end');
    expect(received[0].data).toMatchObject({ traitorIndex: 1, revealedAt: 'game_end' });
  });

  it('fireFinalPhaseEnter fires final_phase_enter with doomToll', () => {
    const { received } = captureEvent(system, 'final_phase_enter');
    system.fireFinalPhaseEnter(10);
    expect(received[0].data?.doomToll).toBe(10);
  });

  it('fireCombatFateReveal fires combat_fate_reveal with card values', () => {
    const { received } = captureEvent(system, 'combat_fate_reveal');
    system.fireCombatFateReveal(7, 3, 2);
    expect(received[0].data).toMatchObject({ attackerCard: 7, defenderCard: 3, attackerMargin: 2 });
  });

  it('fireCombatResolution fires combat_resolution with winner and margin', () => {
    const { received } = captureEvent(system, 'combat_resolution');
    system.fireCombatResolution('attacker', 4);
    expect(received[0].data).toMatchObject({ winner: 'attacker', margin: 4 });
  });

  it('fireMovementComplete fires movement_complete with nodes', () => {
    const { received } = captureEvent(system, 'movement_complete');
    system.fireMovementComplete(2, 'node-1', 'node-5');
    expect(received[0].data).toMatchObject({ playerIndex: 2, fromNode: 'node-1', toNode: 'node-5' });
  });

  it('fireStrongholdClaim fires stronghold_claim with playerIndex and nodeId', () => {
    const { received } = captureEvent(system, 'stronghold_claim');
    system.fireStrongholdClaim(0, 'keep-north');
    expect(received[0].data).toMatchObject({ playerIndex: 0, nodeId: 'keep-north' });
  });

  it('fireBrokenCourtEnter fires broken_court_enter with playerIndex', () => {
    const { received } = captureEvent(system, 'broken_court_enter');
    system.fireBrokenCourtEnter(3);
    expect(received[0].data?.playerIndex).toBe(3);
  });

  it('fireVotingComplete fires voting_complete with unanimous and doomAdvanced', () => {
    const { received } = captureEvent(system, 'voting_complete');
    system.fireVotingComplete(true, false);
    expect(received[0].data).toMatchObject({ unanimous: true, doomAdvanced: false });
  });

  it('fireShadowkingAction fires shadowking_action with cardType and description', () => {
    const { received } = captureEvent(system, 'shadowking_action');
    system.fireShadowkingAction('spawn', 'Summoned 2 minions at the western fortress');
    expect(received[0].data).toMatchObject({ cardType: 'spawn' });
  });
});

// ── animateValue ──────────────────────────────────────────────────────────────

describe('animateValue()', () => {
  it('jumps to end immediately when shouldAnimate=false', async () => {
    const values: number[] = [];
    await animateValue(0, 100, 500, 'linear', (v) => values.push(v), false);
    expect(values).toEqual([100]);
  });

  it('jumps to end immediately when duration is 0', async () => {
    const values: number[] = [];
    await animateValue(0, 100, 0, 'ease-in-out', (v) => values.push(v), true);
    expect(values).toEqual([100]);
  });

  it('handles negative change (end < start) with shouldAnimate=false', async () => {
    const values: number[] = [];
    await animateValue(50, 20, 300, 'ease-out', (v) => values.push(v), false);
    expect(values).toEqual([20]);
  });

  it('handles start === end with shouldAnimate=false', async () => {
    const values: number[] = [];
    await animateValue(42, 42, 200, 'linear', (v) => values.push(v), false);
    expect(values).toEqual([42]);
  });
});

// ── play* functions (animations disabled → resolve immediately) ────────────────

describe('play* functions with animations disabled', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    // Disable animations on the shared singleton to avoid real sleeps
    animationSystem.setEnabled(false);
    system = animationSystem;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
  });

  afterEach(() => {
    animationSystem.setEnabled(true);
  });

  it('playDoomAdvanceAnimation fires doom_advance event and resolves', async () => {
    const { received } = captureEvent(system, 'doom_advance');
    await expect(playDoomAdvanceAnimation(3, 4, 'other')).resolves.toBeUndefined();
    expect(received).toHaveLength(1);
    expect(received[0].data?.newPosition).toBe(4);
  });

  it('playDoomAdvanceAnimation with vote_fail fires doom_advance_vote_fail', async () => {
    const { received } = captureEvent(system, 'doom_advance_vote_fail');
    await playDoomAdvanceAnimation(5, 6, 'vote_fail');
    expect(received).toHaveLength(1);
  });

  it('playDoomRecedeAnimation fires doom_recede event and resolves', async () => {
    const { received } = captureEvent(system, 'doom_recede');
    await expect(playDoomRecedeAnimation(8, 7)).resolves.toBeUndefined();
    expect(received).toHaveLength(1);
  });

  it('playRescueAnimation fires rescue_performed and resolves', async () => {
    const { received } = captureEvent(system, 'rescue_performed');
    await expect(playRescueAnimation(0, 1, 2)).resolves.toBeUndefined();
    expect(received[0].data).toMatchObject({ rescuerIndex: 0, rescuedIndex: 1, cardsGiven: 2 });
  });

  it('playBloodPactRevealAnimation fires blood_pact_reveal and resolves', async () => {
    const { received } = captureEvent(system, 'blood_pact_reveal');
    await expect(playBloodPactRevealAnimation(2, 'accusation')).resolves.toBeUndefined();
    expect(received[0].data?.revealedAt).toBe('accusation');
  });

  it('playFinalPhaseEnterAnimation fires final_phase_enter and resolves', async () => {
    const { received } = captureEvent(system, 'final_phase_enter');
    await expect(playFinalPhaseEnterAnimation(10)).resolves.toBeUndefined();
    expect(received[0].data?.doomToll).toBe(10);
  });

  it('playCombatFateRevealAnimation fires combat_fate_reveal and resolves', async () => {
    const { received } = captureEvent(system, 'combat_fate_reveal');
    await expect(playCombatFateRevealAnimation(8, 5, 3)).resolves.toBeUndefined();
    expect(received[0].data?.attackerCard).toBe(8);
  });

  it('playCombatResolutionAnimation fires combat_resolution and resolves', async () => {
    const { received } = captureEvent(system, 'combat_resolution');
    await expect(playCombatResolutionAnimation('defender', 2)).resolves.toBeUndefined();
    expect(received[0].data?.winner).toBe('defender');
  });

  it('playMovementCompleteAnimation fires movement_complete and resolves', async () => {
    const { received } = captureEvent(system, 'movement_complete');
    await expect(playMovementCompleteAnimation(1, 'n1', 'n3')).resolves.toBeUndefined();
    expect(received[0].data).toMatchObject({ playerIndex: 1, fromNode: 'n1', toNode: 'n3' });
  });

  it('playStrongholdClaimAnimation fires stronghold_claim and resolves', async () => {
    const { received } = captureEvent(system, 'stronghold_claim');
    await expect(playStrongholdClaimAnimation(0, 'keep-east')).resolves.toBeUndefined();
    expect(received[0].data?.nodeId).toBe('keep-east');
  });

  it('playBrokenCourtEnterAnimation fires broken_court_enter and resolves', async () => {
    const { received } = captureEvent(system, 'broken_court_enter');
    await expect(playBrokenCourtEnterAnimation(2)).resolves.toBeUndefined();
    expect(received[0].data?.playerIndex).toBe(2);
  });

  it('playVotingCompleteAnimation fires voting_complete and resolves', async () => {
    const { received } = captureEvent(system, 'voting_complete');
    await expect(playVotingCompleteAnimation(false, true)).resolves.toBeUndefined();
    expect(received[0].data).toMatchObject({ unanimous: false, doomAdvanced: true });
  });

  it('playShadowkingActionAnimation fires shadowking_action and resolves', async () => {
    const { received } = captureEvent(system, 'shadowking_action');
    await expect(playShadowkingActionAnimation('assault', 'Attacked the northern keep')).resolves.toBeUndefined();
    expect(received[0].data?.cardType).toBe('assault');
  });
});

// ── ANIMATION_DURATIONS constants ─────────────────────────────────────────────

describe('ANIMATION_DURATIONS', () => {
  const expectedKeys = [
    'doomAdvance', 'doomRecede', 'rescuePerformed', 'bloodPactReveal',
    'finalPhaseEnter', 'combatFateReveal', 'combatResolution', 'movementComplete',
    'strongholdClaim', 'brokenCourtEnter', 'votingComplete', 'shadowkingAction',
  ] as const;

  it('contains all 12 expected animation keys', () => {
    for (const key of expectedKeys) {
      expect(ANIMATION_DURATIONS).toHaveProperty(key);
    }
  });

  it('all duration values are positive numbers', () => {
    for (const [key, value] of Object.entries(ANIMATION_DURATIONS)) {
      expect(value, `ANIMATION_DURATIONS.${key} should be positive`).toBeGreaterThan(0);
    }
  });

  it('finalPhaseEnter is the longest (most dramatic) duration', () => {
    const max = Math.max(...Object.values(ANIMATION_DURATIONS));
    expect(ANIMATION_DURATIONS.finalPhaseEnter).toBe(max);
  });
});
