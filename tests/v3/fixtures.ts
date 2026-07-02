/**
 * Shared test fixtures (T2-1) — since "feed the court" every player STARTS with one named
 * retainer (setup.ts). Fixture suites that stage minimal bare-Warlord arenas (capture margins,
 * exact power sums, last-retainer edges) call `stripStartingRetainers` right after `createGame`
 * to restore the Warlord-only court those tests reason about. Setup-behaviour suites
 * (court/setup/discovery) assert the NEW starting court instead — never strip there.
 */

import type { GameState } from '../../src/v3/types.js';

/** Flip a created game to the ADVANCED Herald-enabled variant (T2-3 — `createGame`'s
 *  `heraldEnabled` defaults to false). Herald/PARLEY suites wrap their `createGame` in this
 *  instead of spelling the full 6-arg signature. Returns the same state for chaining. Test-only
 *  (real sessions choose the flag at setup; it never changes mid-game). */
export function withHeraldEnabled(s: GameState): GameState {
  (s as { heraldEnabled: boolean }).heraldEnabled = true;
  return s;
}

/** Remove every seat's starting retainer (all non-Warlord court entries at setup) plus its
 *  on-board mirror. Returns the same state for chaining. Test-only. */
export function stripStartingRetainers(s: GameState): GameState {
  for (const p of s.players) {
    const drop = new Set(p.court.filter(c => c.archetype !== 'warlord').map(c => c.id));
    if (drop.size === 0) continue;
    p.court = p.court.filter(c => !drop.has(c.id));
    for (const ns of Object.values(s.board.state.nodes)) {
      ns.pieces = ns.pieces.filter(pc => !drop.has(pc.id));
    }
  }
  return s;
}
