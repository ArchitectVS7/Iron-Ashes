/**
 * T-218 — the Reckoning's marquee threat prompt is themed: an ember-bordered plaque with a wax-seal
 * button, not a bare div + default-styled yellow `.primary` web button. jsdom has no layout engine,
 * so we assert the DOM structure the ember theme depends on (marker class + wax-seal idiom + the
 * absence of `.primary` on the advance button), plus a regression guard that the shared `.primary`
 * and the endgame Game-over frame are untouched (deferred to T-402b).
 */

import { describe, expect, it } from 'vitest';
import { GameSession } from '../../src/ui-v3/session.js';
import { renderApp } from '../../src/ui-v3/view.js';

describe('T-218 threat prompt — ember plaque + wax-seal button', () => {
  it('renders the threat prompt as the themed ember plaque (marker class present)', () => {
    const s = new GameSession(4, 'competitive', 42); // starts paused at THREAT
    expect(s.phase).toBe('THREAT');
    const html = renderApp(s);
    expect(html).toContain('panel threat threat-plaque');
  });

  it('renders a themed wax-seal advance button, keeping data-action="advance-threat"', () => {
    const s = new GameSession(4, 'competitive', 42);
    const html = renderApp(s);
    expect(html).toContain('threat-advance wax-seal');
    expect(html).toContain('data-action="advance-threat"');
  });

  it('carries NO default-styled `primary` button on the advance-threat control (core accept)', () => {
    const s = new GameSession(4, 'competitive', 42);
    const html = renderApp(s);
    // The old markup was `<button class="primary" data-action="advance-threat">`.
    expect(html).not.toContain('class="primary" data-action="advance-threat"');
    // Guard both orderings of class/attribute against a stray `primary` on the button.
    expect(html).not.toMatch(/class="[^"]*primary[^"]*"[^>]*data-action="advance-threat"/);
    expect(html).not.toMatch(/data-action="advance-threat"[^>]*class="[^"]*primary/);
  });

  it('themes the WRAITH variant too (eliminated human at THREAT)', () => {
    const s = new GameSession(4, 'competitive', 42);
    s.state.players[0].isEliminated = true;
    s.state.players[0].eliminatedRound = 1;
    s.state.shadowking.wraiths.push({ seat: 0, eliminatedRound: 1 });
    expect(s.isWraithWindow).toBe(true);
    const html = renderApp(s);
    // Same themed plaque + button wraps the wraith input.
    expect(html).toContain('panel threat threat-plaque');
    expect(html).toContain('threat-advance wax-seal');
    expect(html).toContain('data-action="set-wraith:nudge"');
    expect(html).not.toContain('class="primary" data-action="advance-threat"');
  });

  it('leaves the shared `.primary` and the endgame Game-over frame untouched (T-402b regression guard)', () => {
    const s = new GameSession(4, 'competitive', 42);
    // Force the game-end path so renderGameOver is exercised.
    s.state.gameEndReason = 'doom_complete';
    const html = renderApp(s);
    expect(html).toContain('panel game-over');
    expect(html).toContain('class="primary" data-action="new-game"');
  });
});
