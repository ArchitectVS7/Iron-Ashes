// @vitest-environment jsdom
/**
 * Replay test (T-104) — "snap count 0": proves the queue is the ONLY path that writes DOM.
 *
 * A full fixed-seed game is driven entirely through the mounted view (instant-mode playback of the
 * accumulated move-stream diffs: every `session.onChange` enqueues `diffObservable(prev, next)` and,
 * in instant mode, `AnimationQueue.enqueue` calls the view-owned `settle()` — `root.innerHTML =
 * renderApp(session)` — which is the SOLE DOM writer). After the game ends, the live game-root
 * `innerHTML` (built by hundreds of incremental settles) must equal a COLD, from-scratch render of
 * the final state (a single initial-paint settle into a fresh root).
 *
 * If any state change ever bypassed the `onChange → queue → settle` path, the incrementally-built DOM
 * would diverge from the cold render and this equality would fail. jsdom has no `window.matchMedia`,
 * so `resolveMode()` returns `'instant'` automatically — this test must NOT define `matchMedia`.
 *
 * Guardrails: engine untouched (test-only); both renders read `session.observable()` (fogged for
 * seat 0 — no §7 D2 leak); no `Math.random`/`Date.now`; no new deps/tunables.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mountView } from '../../src/ui-v3/view.js';
import { GameSession } from '../../src/ui-v3/session.js';

let playRoot: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  playRoot = document.getElementById('app')!;
});

/** Dispatch a real bubbling click on an element (the handler is delegated on root). */
function click(el: Element): void {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** All currently-clickable controls in the given root (excluding new-game → location.reload). */
function controls(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-action]:not([disabled]),[data-node]'))
    .filter(el => el.getAttribute('data-action') !== 'new-game');
}

/**
 * Play a full game purely by clicking rendered controls — instant-mode playback of the accumulated
 * move stream (every click routes onChange → queue → settle). Throws if any click throws or if no
 * progress can be made (a soft-lock). Returns the session.
 */
function playThroughDom(mode: 'competitive' | 'blood_pact', seed: number, root: HTMLElement): GameSession {
  const session = new GameSession(4, mode, seed);
  mountView(root, session);

  let steps = 0;
  let lastRound = 0;
  let nonPassThisTurn = 0;

  while (!session.isOver && steps < 8000) {
    steps++;
    const s = session.state;
    if (s.round !== lastRound) { lastRound = s.round; nonPassThisTurn = 0; }

    const all = controls(root);
    expect(all.length, `no clickable control at round ${s.round} phase ${s.phase}`).toBeGreaterThan(0);

    const byAction = (a: string): HTMLElement | undefined =>
      all.find(el => (el.getAttribute('data-action') ?? '').startsWith(a));

    let pick: HTMLElement | undefined;
    if (session.pendingLastStand && byAction('laststand-commit')) {
      const toggle = byAction('laststand-toggle');
      pick = (steps % 2 === 0 && toggle) ? toggle : byAction('laststand-commit');
    } else if (byAction('advance-threat')) {
      pick = byAction('advance-threat');
    } else if (byAction('pledge:')) {
      pick = all.find(el => el.classList.contains('suggested')) ?? byAction('pledge:');
    } else if (session.awaitingBequest && byAction('bequest-')) {
      pick = byAction('bequest-');
    } else {
      const nonPass = all.filter(el => {
        const a = el.getAttribute('data-action') ?? '';
        if (a.startsWith('bequest-') || a.startsWith('set-wraith')) return false;
        return el.hasAttribute('data-node') || (a !== 'pass' && a !== 'accuse' && !a.startsWith('audit') && !a.startsWith('accuse'));
      });
      if (nonPassThisTurn < 2 && nonPass.length > 0) {
        pick = nonPass[steps % nonPass.length];
        nonPassThisTurn++;
      } else {
        pick = byAction('pass') ?? all[0];
      }
    }

    const desc = pick!.getAttribute('data-action') ?? `node:${pick!.getAttribute('data-node')}`;
    expect(() => click(pick!), `clicking "${desc}" threw (round ${s.round} phase ${s.phase})`).not.toThrow();
  }

  return session;
}

/** Collapse incidental template whitespace; applied symmetrically so it cannot hide real divergence. */
function normalize(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}

/**
 * A COLD render of the session's CURRENT (final) state: a fresh root + a fresh `mountView`. The
 * mount fires its initial paint (`queue.enqueue([])` → instant settle → `coldRoot.innerHTML =
 * renderApp(session)`), a single-settle from-scratch render of the final state. The game is already
 * over, so the reassigned `session.onChange` and the extra listener on this throwaway root never fire.
 */
function coldRender(session: GameSession): string {
  const coldRoot = document.createElement('div');
  mountView(coldRoot, session);
  return coldRoot.innerHTML;
}

describe('Replay (v3) — snap count 0: playback DOM == cold render of final state', () => {
  const SEEDS = [42, 99] as const;
  for (const seed of SEEDS) {
    it(`seed ${seed} · competitive — no state change bypasses the queue`, () => {
      const session = playThroughDom('competitive', seed, playRoot);

      // Non-vacuity: the game genuinely completed (a real end state, not an empty/early DOM).
      expect(session.isOver).toBe(true);
      expect(session.state.gameEndReason).not.toBeNull();

      const playbackHtml = normalize(playRoot.innerHTML);
      const coldHtml = normalize(coldRender(session));

      expect(playbackHtml.length).toBeGreaterThan(100);
      expect(playbackHtml).toBe(coldHtml);
    });
  }
});
