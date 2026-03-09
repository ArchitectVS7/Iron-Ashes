/**
 * Iron-Ashes Audio System
 *
 * Procedural sound effects using the Web Audio API.
 * Each GameEvent maps to a synthesised tone — no external audio files required.
 *
 * Design choices:
 *  - Single AudioContext lazily created on first user interaction (browsers
 *    require a user gesture before audio playback is allowed).
 *  - All sounds are short procedural buffers; no network requests.
 *  - The module exposes a `playSound` function that is safe to call when
 *    AudioContext is unavailable (it no-ops silently in that case).
 *
 * Usage:
 *   import { playSound, SoundId } from './audio.js';
 *   playSound(SoundId.RESCUE_TRIGGERED);
 */

// ── Sound Identifiers ─────────────────────────────────────────────────────────

export enum SoundId {
  /** A player is rescued from Broken Court status. */
  RESCUE_TRIGGERED    = 'rescue_triggered',
  /** The Doom Toll counter advances (ominous pulse). */
  DOOM_TOLL_ADVANCE   = 'doom_toll_advance',
  /** The game enters its Final Phase (Doom Toll ≥ threshold). */
  FINAL_PHASE_ENTERED = 'final_phase_entered',
  /** Voting Phase begins — all players cast their ballots. */
  VOTING_OPENED       = 'voting_opened',
  /** Combat round resolved — winning side. */
  COMBAT_VICTORY      = 'combat_victory',
  /** Combat round resolved — losing side. */
  COMBAT_DEFEAT       = 'combat_defeat',
  /** A player achieves victory and the game ends. */
  GAME_VICTORY        = 'game_victory',
  /** The Shadowking wins; all players lose. */
  SHADOWKING_TRIUMPH  = 'shadowking_triumph',
}

// ── Sound Descriptors ─────────────────────────────────────────────────────────

interface ToneDescriptor {
  /** Fundamental frequency in Hz. */
  frequency: number;
  /** Oscillator wave shape. */
  type: OscillatorType;
  /** Duration of the sound in seconds. */
  duration: number;
  /** Peak gain (0–1). */
  gain: number;
  /** Frequency at end of playback (for glide effects). */
  frequencyEnd?: number;
}

const SOUND_MAP: Record<SoundId, ToneDescriptor> = {
  [SoundId.RESCUE_TRIGGERED]: {
    frequency: 523.25, // C5
    type: 'sine',
    duration: 0.6,
    gain: 0.45,
    frequencyEnd: 783.99, // G5 — ascending hopeful resolve
  },
  [SoundId.DOOM_TOLL_ADVANCE]: {
    frequency: 110,    // A2 — deep ominous
    type: 'sawtooth',
    duration: 0.4,
    gain: 0.55,
    frequencyEnd: 98,   // G2 — slight downward glide
  },
  [SoundId.FINAL_PHASE_ENTERED]: {
    frequency: 80,     // Very low, threatening
    type: 'sawtooth',
    duration: 1.2,
    gain: 0.7,
    frequencyEnd: 60,
  },
  [SoundId.VOTING_OPENED]: {
    frequency: 440,    // A4 — neutral, gathering tone
    type: 'triangle',
    duration: 0.3,
    gain: 0.35,
  },
  [SoundId.COMBAT_VICTORY]: {
    frequency: 659.25, // E5 — bright
    type: 'sine',
    duration: 0.5,
    gain: 0.4,
    frequencyEnd: 880,  // A5 — triumphant rise
  },
  [SoundId.COMBAT_DEFEAT]: {
    frequency: 311.13, // Eb4 — minor
    type: 'triangle',
    duration: 0.5,
    gain: 0.4,
    frequencyEnd: 220,  // A3 — fall
  },
  [SoundId.GAME_VICTORY]: {
    frequency: 523.25, // C5
    type: 'sine',
    duration: 1.5,
    gain: 0.6,
    frequencyEnd: 1046.5, // C6 — full octave rise
  },
  [SoundId.SHADOWKING_TRIUMPH]: {
    frequency: 55,     // A1 — subsonic menace
    type: 'sawtooth',
    duration: 2.0,
    gain: 0.8,
    frequencyEnd: 40,
  },
};

// ── AudioContext ──────────────────────────────────────────────────────────────

let _context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined' && typeof window === 'undefined') {
    // Non-browser environment (tests, Node.js): return null silently.
    return null;
  }
  if (!_context) {
    try {
      _context = new AudioContext();
    } catch {
      return null;
    }
  }
  return _context;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Play a synthesised sound effect for the given game event.
 *
 * Safe to call at any time — no-ops when AudioContext is unavailable
 * (e.g. in test environments, before a user gesture, or in SSR).
 */
export function playSound(id: SoundId): void {
  const ctx = getContext();
  if (!ctx) return;

  const desc = SOUND_MAP[id];
  _playSynthesised(ctx, desc);
}

/**
 * Suspend audio output (e.g. when the app is backgrounded).
 * Idempotent — safe to call when already suspended.
 */
export function suspendAudio(): void {
  void _context?.suspend();
}

/**
 * Resume audio output after `suspendAudio()`.
 * Idempotent — safe to call when already running.
 */
export function resumeAudio(): void {
  void _context?.resume();
}

/**
 * Release the underlying AudioContext (e.g. on app teardown).
 * After calling this, the next `playSound()` will create a fresh context.
 */
export function disposeAudio(): void {
  void _context?.close();
  _context = null;
}

// ── Internal synthesis ────────────────────────────────────────────────────────

function _playSynthesised(ctx: AudioContext, desc: ToneDescriptor): void {
  const now = ctx.currentTime;
  const end = now + desc.duration;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = desc.type;
  osc.frequency.setValueAtTime(desc.frequency, now);
  if (desc.frequencyEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(desc.frequencyEnd, end);
  }

  gainNode.gain.setValueAtTime(desc.gain, now);
  gainNode.gain.linearRampToValueAtTime(0, end);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(end);
}
