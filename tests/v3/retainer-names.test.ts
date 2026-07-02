/**
 * T1-1 — retainer names persist + surface (§2 "names are state", review drift D5).
 *
 * Discovery draws a seeded name on the PRE-BOUND token (§7 D9); this suite proves the name
 * now PERSISTS as CourtPiece state through the whole hostage arc — recruit → capture →
 * ransom → return — and that the rout round-trip keeps it too. Also covers:
 *   - starting Warlords carry their FIXED faction name (§3 `factionName[i]`),
 *   - the Herald carries the faction's voice,
 *   - the one-line identity is a PURE function of the name (never a live-stream draw),
 *   - capture / ransom / rout / free events carry the name for the UI beats,
 *   - determinism: same seed ⇒ same names (no main-stream perturbation).
 */

import { describe, expect, it } from 'vitest';
import { createGame, FACTION_NAMES } from '../../src/v3/setup.js';
import { addCourtPiece, identityFor, RETAINER_NAMES } from '../../src/v3/court.js';
import { flipDiscoveryToken, redeemBlightSeed } from '../../src/v3/discovery.js';
import { capturePiece, routPiece, returnRoutedPieces } from '../../src/v3/capture.js';
import { executeRansom, executeRecruit } from '../../src/v3/actions.js';
import type { GameEvent } from '../../src/v3/events.js';
import type { GameState } from '../../src/v3/types.js';
import { withHeraldEnabled } from './fixtures.js';

/** Find a seed whose bound layout has a RECRUIT token on some holding (deterministic scan). */
function gameWithRecruitToken(): { s: GameState; nodeId: string } {
  for (let seed = 1; seed < 60; seed++) {
    const s = createGame(2, 'competitive', seed);
    for (const [nodeId, ns] of Object.entries(s.board.state.nodes)) {
      if (ns.hiddenToken?.kind === 'recruit') return { s, nodeId };
    }
  }
  throw new Error('no recruit token found in seeds 1..59 — pool weights changed?');
}

function detailsOf(events: GameEvent[], pred: (d: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  for (const e of events) {
    if (e.type !== 'PLAYER_ACTED') continue;
    const d = e.details as Record<string, unknown>;
    if (pred(d)) return d;
  }
  return null;
}

describe('T1-1 — names are state (§2)', () => {
  it('starting Warlords carry their fixed faction name + identity', () => {
    const s = createGame(4, 'competitive', 7);
    for (const p of s.players) {
      expect(p.court[0].archetype).toBe('warlord');
      expect(p.court[0].name).toBe(FACTION_NAMES[p.index]);
      expect(p.court[0].identity.length).toBeGreaterThan(0);
    }
  });

  it('a Discovery flip copies the PRE-BOUND token name onto the CourtPiece (§7 D9)', () => {
    const { s, nodeId } = gameWithRecruitToken();
    const token = s.board.state.nodes[nodeId].hiddenToken!;
    const boundName = token.retainerName!;
    expect(boundName.length).toBeGreaterThan(0);

    s.board.state.nodes[nodeId].owner = 0;
    const events = flipDiscoveryToken(s, 0, nodeId);

    // Find the FLIPPED recruit (at the claimed node) — not the T2-1 starting retainer.
    const cp = s.players[0].court.find(c => c.archetype !== 'warlord' && c.node === nodeId);
    expect(cp).toBeDefined();
    expect(cp!.name).toBe(boundName);                    // the flip-once name now PERSISTS
    expect(cp!.identity).toBe(identityFor(boundName));   // identity = pure f(name), no draw
    // Both the flip event and the recruit event carry the name for the UI.
    expect(events.some(e => e.type === 'DISCOVERY_FLIPPED' && e.retainerName === boundName)).toBe(true);
    expect(detailsOf(events, d => d.name === boundName)).not.toBeNull();
  });

  it('the name persists recruit → capture → ransom → return, and every event carries it', () => {
    const s = createGame(2, 'competitive', 42);
    const node = s.players[0].warlordNodeId;
    addCourtPiece(s, 0, 'marshal', node, 'Mira of the Fens');
    const cp = s.players[0].court.find(c => c.archetype === 'marshal')!;
    expect(cp.name).toBe('Mira of the Fens');
    expect(cp.identity).toBe(identityFor('Mira of the Fens'));

    // CAPTURE (§5.2) — the hostage keeps its name; the event names it for the scene beat.
    s.act = 'MARCH';
    const capEvents = capturePiece(s, 1, 0, cp.id);
    expect(cp.captiveOf).toBe(1);
    expect(cp.name).toBe('Mira of the Fens');
    expect(detailsOf(capEvents, d => d.capture === cp.id)?.name).toBe('Mira of the Fens');

    // RANSOM (§5.3) — freed, still named; the RANSOM event carries the name.
    s.players[0].hand = [3, 3, 3, 3];
    s.players[0].banners = 9;
    const { events: ransomEvents } = executeRansom(s, 0, cp.id);
    expect(cp.captiveOf).toBeNull();
    expect(cp.name).toBe('Mira of the Fens');
    expect(detailsOf(ransomEvents, d => d.captive === cp.id)?.name).toBe('Mira of the Fens');

    // ROUT → RETURN (§13 P0-1) — the round-trip keeps the name; the return event carries it.
    const routEvents = routPiece(s, 0, cp.id);
    expect(detailsOf(routEvents, d => d.rout === cp.id)?.name).toBe('Mira of the Fens');
    const returnEvents = returnRoutedPieces(s);
    expect(cp.routedReturnRound).toBeNull();
    expect(cp.name).toBe('Mira of the Fens');
    expect(detailsOf(returnEvents, d => d.routReturned === cp.id)?.name).toBe('Mira of the Fens');
  });

  it('a Blight-seed bonus recruit carries the PRE-BOUND bonus name (§7 D9)', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = createGame(2, 'competitive', seed);
      const found = Object.entries(s.board.state.nodes)
        .find(([, ns]) => ns.hiddenToken?.kind === 'blight_seed');
      if (!found) continue;
      const [nodeId, ns] = found;
      const bonusName = ns.hiddenToken!.bonusName!;
      ns.owner = 0;
      flipDiscoveryToken(s, 0, nodeId);
      ns.shadowkingForces = [];       // the fightable threat is cleared
      redeemBlightSeed(s, 0, nodeId);
      // The bonus recruit joins at the seed node — not the T2-1 starting retainer at the Keep.
      const cp = s.players[0].court.find(c => c.archetype !== 'warlord' && c.node === nodeId)!;
      expect(cp.name).toBe(bonusName);
      expect(cp.identity).toBe(identityFor(bonusName));
      return;
    }
    throw new Error('no blight_seed token found in seeds 1..59');
  });

  it('the Herald is the faction\'s voice', () => {
    const s = withHeraldEnabled(createGame(2, 'competitive', 42)); // advanced toggle (T2-3)
    s.players[0].banners = 9;
    executeRecruit(s, 0);
    const herald = s.players[0].court.find(c => c.archetype === 'herald')!;
    expect(herald.name).toBe(`Voice of ${FACTION_NAMES[0]}`);
    expect(herald.identity.length).toBeGreaterThan(0);
  });

  it('identityFor is a pure function of the name; the no-name fallback is deterministic', () => {
    expect(identityFor('Vael the Steadfast')).toBe(identityFor('Vael the Steadfast'));
    // Fixture/test callers may omit the name: the fallback hashes the piece id into the pool.
    const a = createGame(2, 'competitive', 5);
    const b = createGame(2, 'competitive', 5);
    addCourtPiece(a, 0, 'steward', a.players[0].warlordNodeId);
    addCourtPiece(b, 0, 'steward', b.players[0].warlordNodeId);
    const na = a.players[0].court.find(c => c.archetype === 'steward')!.name;
    const nb = b.players[0].court.find(c => c.archetype === 'steward')!.name;
    expect(na).toBe(nb);
    expect(RETAINER_NAMES).toContain(na);
  });

  it('determinism: the same seed binds the same names (D9 — no main-stream perturbation)', () => {
    const a = createGame(3, 'competitive', 1234);
    const b = createGame(3, 'competitive', 1234);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (const [id, ns] of Object.entries(a.board.state.nodes)) {
      expect(ns.hiddenToken?.retainerName ?? null)
        .toBe(b.board.state.nodes[id].hiddenToken?.retainerName ?? null);
    }
  });
});
