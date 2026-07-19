// @vitest-environment jsdom
/**
 * T-212 — the event feed is a single diegetic CHRONICLE, not stacked web-alert bars.
 *
 * The DOM contract this locks: events render inside exactly ONE `.chronicle` region containing ONE
 * `.narration` list, every entry is a `<li class="narr {kind}">` inside that list (no per-entry alert
 * wrapper / second list), Shadowking voice-lines carry the distinct `villain` class, and the whole
 * structure survives the M1 queue's synchronous instant settle (jsdom / reduced-motion) unchanged.
 *
 * The ember/parchment/burn-in LOOK is CSS with no layout engine under jsdom, so it is verified by
 * `shots:v3` + the human Gate — these tests assert the structural contract the CSS hangs on.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mountView, renderApp } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

/** Drive a fresh game to the human's live ACTION turn (mirrors hud-dissolution's driver). */
function humanTurn(seed = 42): GameSession {
  const s = new GameSession(4, 'competitive', seed, 'warlord', false);
  let guard = 0;
  while (!s.isOver && !s.isHumanTurn && guard < 60) {
    guard++;
    if (s.phase === 'THREAT') s.advanceFromThreat();
    else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
    else break;
  }
  return s;
}

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

describe('T-212 — event feed → single diegetic chronicle', () => {
  it('events render inside ONE chronicle component with ONE narration list — no stacked alert divs', () => {
    const s = humanTurn();
    // Seed a mixed feed including a villain (Shadowking) voice-line.
    s.narration = [
      { text: 'The dark whispers your name.', kind: 'villain' },
      { text: 'Player 2 claims a holding.', kind: 'beat' },
      { text: 'Dawn settles over the realm.', kind: 'system' },
    ];
    root.innerHTML = renderApp(s);

    // Exactly one chronicle region and one narration list.
    expect(root.querySelectorAll('.chronicle').length).toBe(1);
    expect(root.querySelectorAll('.chronicle .narration').length).toBe(1);
    expect(root.querySelectorAll('.narration').length).toBe(1);

    // Every entry is a `.narr` inside that single list — count matches, no orphan/duplicate wrapper.
    const items = root.querySelectorAll('.chronicle .narration .narr');
    expect(items.length).toBe(s.narration.length);
    expect(root.querySelectorAll('.narr').length).toBe(s.narration.length);
  });

  it('Shadowking voice-lines carry the distinct `villain` class; other kinds do not', () => {
    const s = humanTurn();
    s.narration = [
      { text: 'A crown of ash awaits you.', kind: 'villain' },
      { text: 'A node falls to ash.', kind: 'beat' },
      { text: 'The realm settles.', kind: 'system' },
    ];
    root.innerHTML = renderApp(s);

    const villains = root.querySelectorAll('.narr.villain');
    expect(villains.length).toBe(1);
    expect(villains[0].textContent).toContain('crown of ash');

    // beat / system siblings exist but never carry the villain token.
    expect(root.querySelectorAll('.narr.beat').length).toBe(1);
    expect(root.querySelectorAll('.narr.system').length).toBe(1);
    for (const el of root.querySelectorAll('.narr.beat, .narr.system')) {
      expect(el.classList.contains('villain')).toBe(false);
    }
  });

  it('instant mode: the single chronicle region survives repeated synchronous settles (mountView)', () => {
    const s = humanTurn();
    mountView(root, s);
    // The initial paint routes through the queue's instant settle.
    expect(root.querySelectorAll('.chronicle').length).toBe(1);
    expect(root.querySelectorAll('.chronicle .narration').length).toBe(1);

    // Drive a few real steps; after each the structure stays one region / one list (no stacking).
    let guard = 0;
    while (!s.isOver && guard < 12) {
      guard++;
      if (s.phase === 'THREAT') s.advanceFromThreat();
      else if (s.phase === 'PLEDGE') s.submitHumanPledge(0);
      else if (s.isHumanTurn) s.humanAction({ type: 'PLAYER_ACTION', playerIndex: s.humanIndex, action: { type: 'PASS' } });
      else break;
      expect(root.querySelectorAll('.chronicle').length).toBe(1);
      expect(root.querySelectorAll('.chronicle .narration').length).toBe(1);
    }
    // Real play produced narration entries in the one list.
    expect(root.querySelectorAll('.chronicle .narration .narr').length).toBeGreaterThan(0);
  });
});
