/**
 * Tests for Iron-Ashes Audio System
 *
 * AudioContext is not available in the Vitest (jsdom) environment, so these
 * tests verify the safe-no-op behaviour and the exported enum/map contracts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SoundId,
  playSound,
  suspendAudio,
  resumeAudio,
  disposeAudio,
} from '../../src/systems/audio.js';

// ── Environment guard ─────────────────────────────────────────────────────────

// AudioContext is undefined in jsdom; the audio module should degrade gracefully.

describe('SoundId enum', () => {
  it('exports all expected sound identifiers', () => {
    const ids = Object.values(SoundId);
    expect(ids).toContain(SoundId.RESCUE_TRIGGERED);
    expect(ids).toContain(SoundId.DOOM_TOLL_ADVANCE);
    expect(ids).toContain(SoundId.FINAL_PHASE_ENTERED);
    expect(ids).toContain(SoundId.VOTING_OPENED);
    expect(ids).toContain(SoundId.COMBAT_VICTORY);
    expect(ids).toContain(SoundId.COMBAT_DEFEAT);
    expect(ids).toContain(SoundId.GAME_VICTORY);
    expect(ids).toContain(SoundId.SHADOWKING_TRIUMPH);
  });

  it('has 8 sound identifiers', () => {
    expect(Object.values(SoundId).length).toBe(8);
  });

  it('each sound id is a non-empty string', () => {
    for (const id of Object.values(SoundId)) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

describe('playSound — no AudioContext environment', () => {
  it('does not throw when AudioContext is unavailable', () => {
    // jsdom does not define AudioContext, so this should be a safe no-op.
    expect(() => playSound(SoundId.RESCUE_TRIGGERED)).not.toThrow();
  });

  it('is safe to call for every SoundId', () => {
    for (const id of Object.values(SoundId)) {
      expect(() => playSound(id as SoundId)).not.toThrow();
    }
  });
});

describe('audio lifecycle functions', () => {
  it('suspendAudio does not throw without an active context', () => {
    expect(() => suspendAudio()).not.toThrow();
  });

  it('resumeAudio does not throw without an active context', () => {
    expect(() => resumeAudio()).not.toThrow();
  });

  it('disposeAudio does not throw without an active context', () => {
    expect(() => disposeAudio()).not.toThrow();
  });

  it('disposeAudio is idempotent', () => {
    expect(() => {
      disposeAudio();
      disposeAudio();
    }).not.toThrow();
  });
});

describe('AudioContext mock integration', () => {
  let mockOscillator: ReturnType<typeof createMockOscillator>;
  let mockGain: ReturnType<typeof createMockGain>;
  let mockContext: ReturnType<typeof createMockAudioContext>;

  function createMockOscillator() {
    return {
      type: 'sine' as OscillatorType,
      frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  function createMockGain() {
    return {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }

  function createMockAudioContext() {
    return {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      suspend: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }

  beforeEach(() => {
    mockOscillator = createMockOscillator();
    mockGain = createMockGain();
    mockContext = createMockAudioContext();

    // Inject mock AudioContext into the global scope for this test.
    // Must use a regular function (not an arrow function) so it works with `new`.
    const ctx = mockContext;
    function MockAudioContext() { return ctx; }
    vi.stubGlobal('AudioContext', vi.fn(MockAudioContext));

    // Reset module-level context by calling dispose first.
    disposeAudio();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    disposeAudio();
  });

  it('creates an oscillator and gain node when AudioContext is available', () => {
    playSound(SoundId.DOOM_TOLL_ADVANCE);
    expect(mockContext.createOscillator).toHaveBeenCalledOnce();
    expect(mockContext.createGain).toHaveBeenCalledOnce();
  });

  it('starts and schedules stop on the oscillator', () => {
    playSound(SoundId.COMBAT_VICTORY);
    expect(mockOscillator.start).toHaveBeenCalledOnce();
    expect(mockOscillator.stop).toHaveBeenCalledOnce();
  });

  it('applies frequency glide for sounds with frequencyEnd', () => {
    // RESCUE_TRIGGERED has a frequencyEnd defined.
    playSound(SoundId.RESCUE_TRIGGERED);
    expect(mockOscillator.frequency.linearRampToValueAtTime).toHaveBeenCalledOnce();
  });

  it('does not apply frequency glide for sounds without frequencyEnd', () => {
    // VOTING_OPENED has no frequencyEnd.
    playSound(SoundId.VOTING_OPENED);
    expect(mockOscillator.frequency.linearRampToValueAtTime).not.toHaveBeenCalled();
  });

  it('connects oscillator to gain and gain to destination', () => {
    playSound(SoundId.GAME_VICTORY);
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
    expect(mockGain.connect).toHaveBeenCalledWith(mockContext.destination);
  });

  it('reuses the same AudioContext across multiple calls', () => {
    playSound(SoundId.DOOM_TOLL_ADVANCE);
    playSound(SoundId.COMBAT_DEFEAT);
    // AudioContext constructor should be called only once.
    expect(AudioContext).toHaveBeenCalledOnce();
  });
});
