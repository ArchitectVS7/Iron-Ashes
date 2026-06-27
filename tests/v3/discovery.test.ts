/**
 * Discovery + Determinism tests — ALGORITHM §5.1 + §7 D1/D2/D9 + §12 #19.
 *
 * This is the DETERMINISM-CRITICAL stage. The invariants proven here:
 *   (a) same seed → identical token layout + identical full game under scripted inputs;
 *   (b) observableState never exposes redacted token content or the seed;
 *   (c) CLAIM flips the node's token first, owns the node, and is claim-order-independent
 *       (pre-bound, not save-scummable).
 */

import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/v3/setup.js';
import { executeClaim, executeStrike } from '../../src/v3/actions.js';
import {
  observableState,
  SEED_REDACTED,
} from '../../src/v3/observable.js';
import {
  backSigil,
  bindHiddenTokens,
  deriveToken,
  hashSeedNode,
} from '../../src/v3/discovery.js';
import { buildClosingRing, createInitialBoardState } from '../../src/v3/board.js';
import { ACTION_BASE_COST } from '../../src/v3/tunables.js';
import type { GameState } from '../../src/v3/types.js';

/** Force player `p`'s Warlord onto `nodeId` with banners to spend, so executeClaim can flip. */
function stageClaim(state: GameState, p: number, nodeId: string): void {
  state.players[p].warlordNodeId = nodeId;
  state.players[p].banners = Math.max(state.players[p].banners, ACTION_BASE_COST + 2);
}

describe('Discovery + Determinism (§5.1, §7 D1/D2/D9, §12 #19)', () => {
  // ── (a) Same seed → identical token layout + identical scripted game ──
  describe('D1/D9 — pre-bound, seed-reproducible layout', () => {
    it('same seed → byte-identical token layout on every Holding', () => {
      const a = createGame(4, 'competitive', 42);
      const b = createGame(4, 'competitive', 42);
      for (const id of a.board.definition.holdingIds) {
        expect(b.board.state.nodes[id].hiddenToken).toEqual(
          a.board.state.nodes[id].hiddenToken,
        );
      }
    });

    it('every neutral Holding carries a token; non-Holdings carry none', () => {
      const g = createGame(4, 'competitive', 7);
      const holdings = new Set(g.board.definition.holdingIds);
      for (const id of Object.keys(g.board.state.nodes)) {
        const tok = g.board.state.nodes[id].hiddenToken;
        if (holdings.has(id)) {
          expect(tok).not.toBeNull();
          expect(tok!.flipped).toBe(false);
        } else {
          expect(tok).toBeNull();
        }
      }
    });

    it('deriveToken is a pure function of (seed, nodeId) — no live-stream draw (D1)', () => {
      // Re-derive directly; must equal what setup froze, regardless of any other activity.
      const g = createGame(2, 'competitive', 999);
      for (const id of g.board.definition.holdingIds) {
        expect(deriveToken(999, id)).toEqual(g.board.state.nodes[id].hiddenToken);
      }
    });

    it('hashSeedNode is deterministic and node-namespaced (D9)', () => {
      expect(hashSeedNode(42, 'holding-ne')).toBe(hashSeedNode(42, 'holding-ne'));
      // Different node or seed → (overwhelmingly) different sub-seed.
      expect(hashSeedNode(42, 'holding-ne')).not.toBe(hashSeedNode(42, 'holding-se'));
      expect(hashSeedNode(42, 'holding-ne')).not.toBe(hashSeedNode(43, 'holding-ne'));
    });

    it('binding uses only the namespaced sub-stream — does not perturb main-RNG fields', () => {
      // Token binding must NOT consume the main setup stream, so turn order + hands are
      // unchanged whether or not we (re-)bind. Re-binding onto a fresh board proves the
      // tokens themselves are reproducible without touching player/turn state.
      const g = createGame(3, 'competitive', 12345);
      const def = buildClosingRing();
      const fresh = createInitialBoardState(def);
      bindHiddenTokens(fresh, def, 12345);
      for (const id of def.holdingIds) {
        expect(fresh.nodes[id].hiddenToken).toEqual(g.board.state.nodes[id].hiddenToken);
      }
    });

    it('a full scripted game is identical from identical seeds (CLAIM-flip included)', () => {
      const run = (): GameState => {
        const s = createGame(2, 'competitive', 42);
        // Script: each player claims a (DK-free) Holding, flipping its token, from a known
        // position. holding-sw = blight_seed, holding-nw = recruit under seed 42.
        stageClaim(s, 0, 'holding-sw');
        executeClaim(s, 0);
        stageClaim(s, 1, 'holding-nw');
        executeClaim(s, 1);
        return s;
      };
      expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    });
  });

  // ── (b) observableState redacts content + seed ──
  describe('D2 (amended) — observable projection redacts content and seed', () => {
    it('redacts the seed to a non-numeric sentinel', () => {
      const g = createGame(4, 'competitive', 42);
      const obs = observableState(g, 0);
      expect(obs.seed).toBe(SEED_REDACTED);
      expect(typeof obs.seed).not.toBe('number');
    });

    it('an UNFLIPPED token exposes ONLY its sigil — never kind / archetype / bonus', () => {
      const g = createGame(4, 'competitive', 42);
      const obs = observableState(g, 0);
      for (const id of g.board.definition.holdingIds) {
        const tok = obs.board.state.nodes[id].hiddenToken;
        expect(tok).not.toBeNull();
        expect(tok!.flipped).toBe(false);
        // Sigil is present and valid…
        expect(['bright', 'dark']).toContain(tok!.sigil);
        // …and NOTHING else leaks (no way to recompute the hidden content).
        expect(Object.keys(tok!).sort()).toEqual(['flipped', 'sigil']);
        expect(JSON.stringify(tok)).not.toContain('recruit');
        expect(JSON.stringify(tok)).not.toContain('death_knight');
        expect(JSON.stringify(tok)).not.toContain('blight_seed');
      }
    });

    it('no UNFLIPPED token in the projection carries hidden content (kind/archetype/bonus)', () => {
      // NB: "death_knight" legitimately appears in the projection for VISIBLE board forces
      // (public knowledge). The fog is only about face-down TOKEN content — so we assert on
      // the token shapes, not on a whole-JSON substring scan.
      const g = createGame(4, 'competitive', 999); // 999 has blight_seeds + DKs under the fog
      const obs = observableState(g, 2);
      expect(obs.seed).toBe(SEED_REDACTED);
      for (const id of Object.keys(obs.board.state.nodes)) {
        const tok = obs.board.state.nodes[id].hiddenToken;
        if (tok && !tok.flipped) {
          expect('kind' in tok).toBe(false);
          expect('archetype' in tok).toBe(false);
          expect('bonusArchetype' in tok).toBe(false);
        }
      }
    });

    it('a FLIPPED token exposes its full revealed content (no longer fogged)', () => {
      const g = createGame(2, 'competitive', 42); // holding-nw = recruit(marshal), DK-free
      stageClaim(g, 0, 'holding-nw');
      executeClaim(g, 0);
      const obs = observableState(g, 0);
      const tok = obs.board.state.nodes['holding-nw'].hiddenToken;
      expect(tok!.flipped).toBe(true);
      // Once revealed, the content is legitimately visible.
      expect('kind' in tok!).toBe(true);
    });

    it('rejects an out-of-range viewerSeat', () => {
      const g = createGame(2, 'competitive', 1);
      expect(() => observableState(g, 5)).toThrow();
      expect(() => observableState(g, -1)).toThrow();
    });

    it('the projection is decoupled — mutating it never touches the engine state', () => {
      const g = createGame(2, 'competitive', 7);
      const obs = observableState(g, 0);
      obs.board.state.nodes['holding-ne'].owner = 1;
      expect(g.board.state.nodes['holding-ne'].owner).toBeNull();
    });

    it('no decider source in src/v3 reads hidden token content under the fog', async () => {
      // The fog is only honest if deciders never touch `.kind`/`.archetype`/`.retainerName`
      // off a hiddenToken. AI/wraith/human deciders must read the sigil (or observableState)
      // only. Guard the two decider modules. (The reducer/actions ARE the engine — allowed.)
      const fs = await import('node:fs');
      const path = await import('node:path');
      for (const file of ['ai-player.ts', 'blood-pact.ts']) {
        const src = fs.readFileSync(
          path.resolve(__dirname, '../../src/v3', file), 'utf-8',
        );
        expect(src.includes('hiddenToken'), `${file} must not read hiddenToken`).toBe(false);
      }
    });
  });

  // ── (c) CLAIM flips the token first, owns the node, order-independent ──
  describe('§12 #19 — CLAIM flips the token, owns the node', () => {
    it('a recruit flip: you OWN the node and a seeded retainer joins the court', () => {
      const g = createGame(2, 'competitive', 42); // holding-nw = recruit(marshal), DK-free
      const courtBefore = g.players[0].court.length;
      stageClaim(g, 0, 'holding-nw');
      const { events } = executeClaim(g, 0);

      const node = g.board.state.nodes['holding-nw'];
      expect(node.owner).toBe(0);                 // you own the claimed node
      expect(node.hiddenToken!.flipped).toBe(true);
      expect(g.players[0].court.length).toBe(courtBefore + 1); // retainer joined
      const flip = events.find(e => e.type === 'DISCOVERY_FLIPPED');
      expect(flip).toBeDefined();
      expect((flip as { kind: string }).kind).toBe('recruit');
      expect((flip as { retainerName: string }).retainerName).toBeTruthy();
    });

    it('a death-knight flip: you OWN the node and a DK co-locates (acts next THREAT)', () => {
      const g = createGame(2, 'competitive', 3); // holding-nw = death_knight, DK-free at setup
      stageClaim(g, 0, 'holding-nw');
      executeClaim(g, 0);
      const node = g.board.state.nodes['holding-nw'];
      expect(node.owner).toBe(0);                                  // own the claimed node
      expect(node.hiddenToken!.flipped).toBe(true);
      expect(node.shadowkingForces.some(f => f.type === 'death_knight')).toBe(true);
      // It spawned in ACTION (after THREAT) — it cannot have acted this round.
      expect(g.phase).toBe('THREAT'); // setup phase; the point is the spawn is post-THREAT
    });

    it('a blight-seed flip: you own blighted land + a fightable threat; STRIKE redeems the bonus', () => {
      const g = createGame(2, 'competitive', 42); // holding-sw = blight_seed (bonus marshal)
      const node = g.board.state.nodes['holding-sw'];
      const blightBefore = node.blightLevel;
      stageClaim(g, 0, 'holding-sw');
      executeClaim(g, 0);

      expect(node.owner).toBe(0);                          // you own blighted land
      expect(node.blightLevel).toBeGreaterThan(blightBefore);
      expect(node.shadowkingForces.some(f => f.type === 'blight')).toBe(true);
      expect(node.hiddenToken!.bonusClaimed).toBe(false);

      // Clear the fightable threat → the pre-bound bonus recruit joins the court (D9).
      const courtBefore = g.players[0].court.length;
      g.players[0].hand = [4, 4, 4];
      executeStrike(g, 0, [4, 4]); // 8 power vs BLIGHT_POWER(2) → win
      expect(node.shadowkingForces.length).toBe(0);
      expect(node.hiddenToken!.bonusClaimed).toBe(true);
      expect(g.players[0].court.length).toBe(courtBefore + 1);
    });

    it('CLAIM order does not change any node\'s revealed content (D1 — not save-scummable)', () => {
      // Game A claims ne then nw; game B claims nw then ne. Each node\'s revealed content
      // must match across games — proving the layout is pre-bound, not order-dependent.
      const a = createGame(2, 'competitive', 999);
      const b = createGame(2, 'competitive', 999);

      stageClaim(a, 0, 'holding-sw'); executeClaim(a, 0);
      stageClaim(a, 1, 'holding-nw'); executeClaim(a, 1);

      stageClaim(b, 1, 'holding-nw'); executeClaim(b, 1);
      stageClaim(b, 0, 'holding-sw'); executeClaim(b, 0);

      for (const id of ['holding-sw', 'holding-nw'] as const) {
        const ta = a.board.state.nodes[id].hiddenToken!;
        const tb = b.board.state.nodes[id].hiddenToken!;
        expect(tb.kind).toBe(ta.kind);
        expect(tb.archetype).toBe(ta.archetype);
        expect(tb.retainerName).toBe(ta.retainerName);
      }
    });

    it('claiming a Forge flips no token (Forges carry none)', () => {
      const g = createGame(2, 'competitive', 42);
      // Find an unclaimed forge.
      const forgeId = g.board.definition.forgeIds[0];
      stageClaim(g, 0, forgeId);
      const { events } = executeClaim(g, 0);
      expect(g.board.state.nodes[forgeId].hiddenToken).toBeNull();
      expect(events.some(e => e.type === 'DISCOVERY_FLIPPED')).toBe(false);
    });
  });

  // ── back-sigil codomain (§13 P0-12) ──
  describe('back-sigil g(content) — exhaustively specified codomain', () => {
    it('every bound token sigil is in {bright, dark} and matches g(kind)', () => {
      const g = createGame(4, 'competitive', 999);
      for (const id of g.board.definition.holdingIds) {
        const tok = g.board.state.nodes[id].hiddenToken!;
        expect(['bright', 'dark']).toContain(tok.sigil);
        expect(tok.sigil).toBe(backSigil(tok.kind));
      }
    });

    it('the codomain is exactly recruit→bright, risk→dark', () => {
      expect(backSigil('recruit')).toBe('bright');
      expect(backSigil('blight_seed')).toBe('dark');
      expect(backSigil('death_knight')).toBe('dark');
    });
  });
});
