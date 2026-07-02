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
  deriveStartingRetainer,
  deriveToken,
  hashSeedNode,
  tokenBearingForges,
} from '../../src/v3/discovery.js';
import { buildClosingRing, createInitialBoardState } from '../../src/v3/board.js';
import { ACTION_BASE_COST, DISCOVERY_BLIGHT_DELTA, FORGE_TOKEN_COUNT } from '../../src/v3/tunables.js';
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

    it('every neutral Holding AND the seed-picked Forge pair carries a token (T2-1); others none', () => {
      const g = createGame(4, 'competitive', 7);
      const forgeBearers = tokenBearingForges(7, g.board.definition);
      expect(forgeBearers).toHaveLength(FORGE_TOKEN_COUNT); // the T2-1 supply lever (2)
      const bearers = new Set([...g.board.definition.holdingIds, ...forgeBearers]);
      expect(bearers.size).toBe(4 + FORGE_TOKEN_COUNT); // 6 tokens/game
      for (const id of Object.keys(g.board.state.nodes)) {
        const tok = g.board.state.nodes[id].hiddenToken;
        if (bearers.has(id)) {
          expect(tok).not.toBeNull();
          expect(tok!.flipped).toBe(false);
        } else {
          expect(tok).toBeNull();
        }
      }
    });

    it('the token-bearing Forge pair is pure f(seed) — reproducible, seed-varied (§7 D9)', () => {
      const def = buildClosingRing();
      expect(tokenBearingForges(7, def)).toEqual(tokenBearingForges(7, def));
      // Some pair of seeds picks different pairs (spot-check a small range).
      const picks = new Set<string>();
      for (let seed = 1; seed < 12; seed++) picks.add(tokenBearingForges(seed, def).join(','));
      expect(picks.size).toBeGreaterThan(1);
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

      expect(node.owner).toBe(0);                          // you own the seeded land
      // The front-delta tracks the tunable (T2-1 locked it to 0 — the fightable-threat
      // agency half below is UNCHANGED and is what the flip is about).
      expect(node.blightLevel).toBe(blightBefore + DISCOVERY_BLIGHT_DELTA);
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

    it('claiming a Forge FLIPS its pre-bound token (T2-1 — Forges joined the token supply)', () => {
      // Find a seed whose forge-nw token is DK-free content, so executeClaim isn't blocked
      // by a setup DK on the seam. deriveToken is pure, so this scan is deterministic.
      for (let seed = 1; seed < 60; seed++) {
        const g = createGame(2, 'competitive', seed);
        const forgeId = g.board.definition.forgeIds
          .find(id => g.board.state.nodes[id].shadowkingForces.length === 0
            && g.board.state.nodes[id].hiddenToken!.kind === 'recruit');
        if (!forgeId) continue;
        stageClaim(g, 0, forgeId);
        const courtBefore = g.players[0].court.length;
        const { events } = executeClaim(g, 0);
        expect(g.board.state.nodes[forgeId].owner).toBe(0);
        expect(g.board.state.nodes[forgeId].hiddenToken!.flipped).toBe(true);
        expect(events.some(e => e.type === 'DISCOVERY_FLIPPED')).toBe(true);
        expect(g.players[0].court.length).toBe(courtBefore + 1); // the recruit joined
        return;
      }
      throw new Error('no DK-free recruit-token Forge in seeds 1..59 — weights changed?');
    });
  });

  // ── T2-1 — the starting retainer (feed the court) ──
  describe('T2-1 — the starting retainer is pre-bound on its own sub-stream (§7 D9)', () => {
    it('every player starts with one named retainer whose content = deriveStartingRetainer(seed, seat)', () => {
      const g = createGame(4, 'competitive', 4242);
      for (const p of g.players) {
        const expected = deriveStartingRetainer(4242, p.index);
        const ret = p.court.find(c => c.archetype !== 'warlord')!;
        expect(ret.archetype).toBe(expected.archetype);
        expect(ret.name).toBe(expected.name);
        expect(ret.node).toBe(p.warlordNodeId); // starts at the Keep
        // The on-board mirror exists at the Keep.
        expect(g.board.state.nodes[p.warlordNodeId].pieces.some(pc => pc.id === ret.id)).toBe(true);
      }
    });

    it('same seed ⇒ identical starting retainers; the draw is seat-namespaced (D9)', () => {
      expect(deriveStartingRetainer(7, 0)).toEqual(deriveStartingRetainer(7, 0));
      // Different seat or seed ⇒ an independent sub-stream (not necessarily different content,
      // but the STREAMS are disjoint — spot-check the sub-seeds differ).
      expect(hashSeedNode(7, 'start-retainer-0')).not.toBe(hashSeedNode(7, 'start-retainer-1'));
      expect(hashSeedNode(7, 'start-retainer-0')).not.toBe(hashSeedNode(8, 'start-retainer-0'));
    });

    it('the starting retainer never perturbs the main setup stream (hands/turn order stable across counts)', () => {
      // The sub-stream contract: seat i's hand + the turn order depend only on the main RNG.
      // Regression guard — two games at the same seed agree byte-for-byte (D1), and the
      // starting retainer id uses ordinal 0 so a later same-archetype recruit gets ordinal 1.
      const a = createGame(3, 'competitive', 555);
      const b = createGame(3, 'competitive', 555);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      for (const p of a.players) {
        const ret = p.court.find(c => c.archetype !== 'warlord')!;
        expect(ret.id).toBe(`${ret.archetype}-${p.index}-0`);
      }
    });
  });

  // ── back-sigil codomain (§13 P0-12) ──
  describe('back-sigil g(content) — exhaustively specified codomain', () => {
    it('every bound token sigil is in {bright, dark} and matches g(kind)', () => {
      const g = createGame(4, 'competitive', 999);
      for (const id of [...g.board.definition.holdingIds, ...tokenBearingForges(999, g.board.definition)]) {
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
