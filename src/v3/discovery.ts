/**
 * Discovery (§5.1) — grow the court by exploring, DETERMINISM-FIRST (§7 D1/D2/D9).
 *
 * Neutral Holdings carry a face-down token. This module implements the determinism
 * contract that makes a flip a *reveal of pre-existing hidden state* rather than a live
 * draw:
 *
 *   - D9: every token's content is derived from a NAMESPACED sub-stream
 *     `SeededRandom(hash(seed, nodeId))`, independent of the main RNG and of every other
 *     node. `tokenId ≡ nodeId`. The Blight-seed bonus recruit pre-binds under the SAME key.
 *   - D1: `bindHiddenTokens` freezes that content in state at setup. A CLAIM later just
 *     flips `flipped = false → true` and reads the frozen content — never re-draws. So the
 *     layout is claim-order-independent and not save-scummable.
 *   - D2: the only thing a decider may read off content is `backSigil = g(content)` (a
 *     partial telegraph); `observableState` (observable.ts) redacts everything else.
 *
 * The flip EFFECTS (recruit / blight-seed / death-knight) live in actions.ts (executeClaim),
 * which calls into the pure helpers here. This module performs NO main-stream RNG.
 */

import { SeededRandom } from '../utils/seeded-random.js';
import {
  getTunables,
  BLIGHT_POWER,
  DK_POWER,
} from './tunables.js';
import { addCourtPiece, RETAINER_NAMES } from './court.js';
import type { GameEvent } from './events.js';
import type {
  Archetype,
  BackSigil,
  GameState,
  HiddenToken,
  ShadowkingForce,
  TokenKind,
  V2BoardState,
  V2BoardDef,
} from './types.js';

// ─── D9 — namespaced hash(seed, nodeId) → 32-bit sub-seed ─────────

/**
 * A deterministic, pure 32-bit hash mixing `seed` with the node id string (§7 D9). No
 * Math.random / Date — only integer arithmetic. Identical inputs ⇒ identical output across
 * runs/platforms (all ops are 32-bit via Math.imul / `>>> 0`). Used to derive each node's
 * independent token sub-stream so the layout is claim-order-independent.
 */
export function hashSeedNode(seed: number, nodeId: string): number {
  // FNV-1a-style mix seeded by the session seed, then an avalanche finalizer.
  let h = ((seed | 0) ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < nodeId.length; i++) {
    h = Math.imul(h ^ nodeId.charCodeAt(i), 0x01000193) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0; // rotate-left 13, stay 32-bit
  }
  // fmix32 avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// ─── g(content) — the back-sigil (sole observable, §13 P0-12) ─────

/**
 * The pre-flip back-sigil `g(content)` — a partial telegraph with an exhaustively specified
 * codomain `{ bright, dark }` (§13 P0-12, §7 D2):
 *   recruit                    → 'bright' (safe upside)
 *   blight_seed | death_knight → 'dark'   (ambiguous risk — could be the fightable seed OR
 *                                          the harsh DK; that ambiguity is the press-your-luck)
 * Non-injective by design: 'dark' deliberately collapses two outcomes so a flip is a real
 * gamble, not a certainty. Pure.
 */
export function backSigil(kind: TokenKind): BackSigil {
  return kind === 'recruit' ? 'bright' : 'dark';
}

// ─── Seeded retainer names ────────────────────────────────────────
// The deterministic name pool lives in court.ts (`RETAINER_NAMES` — the court owns names);
// each node's namespaced sub-stream picks from it here (§2, §5.1, §7 D9).

/** Archetypes a Discovery flip can recruit — the board retainers (§ decision: Herald stays
 *  the dedicated RECRUIT-action stance build, never a discovery roll). */
const RECRUITABLE: readonly Exclude<Archetype, 'warlord' | 'herald'>[] = Object.freeze([
  'marshal', 'steward',
]);

// ─── D9 — bind one node's token from its sub-stream ───────────────

/**
 * Derive a single Holding's frozen token from its namespaced sub-stream (§7 D9). Draw order
 * within the sub-stream is FIXED (kind → archetype/name | bonus archetype/name) so the
 * content is stable. Pure given (seed, nodeId, tunables); never touches the main stream.
 */
export function deriveToken(seed: number, nodeId: string): HiddenToken {
  const t = getTunables();
  const sub = new SeededRandom(hashSeedNode(seed, nodeId));

  // 1. kind — weighted by the configured split (DK weight is the remainder, kept explicit).
  const kind = sub.weightedPick<TokenKind>(
    ['recruit', 'blight_seed', 'death_knight'],
    [t.DISCOVERY_RECRUIT_PCT, t.DISCOVERY_BLIGHT_PCT, t.DISCOVERY_DK_PCT],
  );

  let archetype: Archetype | null = null;
  let retainerName: string | null = null;
  let bonusArchetype: Archetype | null = null;
  let bonusName: string | null = null;

  if (kind === 'recruit') {
    // 2a. recruit payload — archetype then name, fixed order.
    archetype = sub.pick(RECRUITABLE);
    retainerName = sub.pick(RETAINER_NAMES);
  } else if (kind === 'blight_seed') {
    // 2b. PRE-BIND the bonus recruit under the SAME key (§7 D9) — granted on clearing the
    //     fightable threat (§5.1). Same draw shape as a recruit payload.
    bonusArchetype = sub.pick(RECRUITABLE);
    bonusName = sub.pick(RETAINER_NAMES);
  }
  // death_knight: no payload to bind.

  return {
    kind,
    sigil: backSigil(kind),
    archetype,
    retainerName,
    bonusArchetype,
    bonusName,
    flipped: false,
    bonusClaimed: false,
  };
}

// ─── bindHiddenTokens — freeze the layout at setup (§3, §7 D1) ────

/**
 * Bind every neutral Holding's hidden token at setup (§3) — frozen now, revealed later
 * (§7 D1). Operates on the board state in place; uses ONLY the namespaced sub-streams, so
 * it never perturbs the main setup RNG (position-independent). A "neutral Holding" = a node
 * of tier 'holding' with no owner; at setup all four Holdings qualify.
 */
export function bindHiddenTokens(
  boardState: V2BoardState,
  boardDef: V2BoardDef,
  seed: number,
): void {
  for (const nodeId of boardDef.holdingIds) {
    const ns = boardState.nodes[nodeId];
    if (!ns || ns.owner !== null) continue; // only neutral Holdings carry tokens
    ns.hiddenToken = deriveToken(seed, nodeId);
  }
}

// ─── Flip-spawned forces (§5.1, §12 #19) ──────────────────────────

/**
 * Build the deterministic Death-Knight that a DK-flip spawns, co-located on the claimed node
 * (§12 #19). Id is stable from the node so replays match. It acts only NEXT THREAT — which
 * is automatic: a CLAIM resolves in ACTION, after this round's THREAT already passed (§7 D3).
 */
export function makeFlipDeathKnight(nodeId: string): ShadowkingForce {
  return { id: `dk-flip-${nodeId}`, type: 'death_knight', power: DK_POWER, nodeId };
}

/**
 * Build the deterministic Blight-seed threat force a Blight-flip spawns on the claimed node
 * (§5.1) — the fightable 'agency' piece. Clearing it (STRIKE) grants the pre-bound bonus
 * recruit (see `redeemBlightSeed`).
 */
export function makeBlightSeedForce(nodeId: string): ShadowkingForce {
  return { id: `blightseed-${nodeId}`, type: 'blight', power: BLIGHT_POWER, nodeId };
}

/**
 * Reveal a node's face-down Discovery token and apply its effect (§5.1, §12 #19). Shared by
 * BOTH acquisition paths — CLAIM (executeClaim) and the DK-kill spoils-claim (combat.ts) — so
 * an owned Holding never lingers with an unflipped token. The caller MUST have already set
 * `node.owner = playerIndex` (you OWN the claimed node, §12 #19). No-ops on a Forge (no token)
 * or an already-flipped token. A pure REVEAL of frozen state (§7 D1) — no main-stream RNG.
 *   recruit     — a seeded-named retainer joins the court at the node.
 *   blight_seed — a front-delta hits the node + a fightable threat force spawns (cleared via
 *                 STRIKE to redeem the pre-bound bonus recruit, §7 D9).
 *   death_knight— a DK spawns co-located; blocks FUTURE claims; acts only NEXT THREAT (§7 D3 —
 *                 a flip resolves after THREAT, so it can never act retroactively this round).
 */
export function flipDiscoveryToken(
  state: GameState,
  playerIndex: number,
  nodeId: string,
): GameEvent[] {
  const events: GameEvent[] = [];
  const node = state.board.state.nodes[nodeId];
  const token = node?.hiddenToken;
  if (!token || token.flipped) return events;

  token.flipped = true; // REVEAL frozen state (§7 D1) — never re-draw

  events.push({
    type: 'DISCOVERY_FLIPPED',
    nodeId,
    playerIndex,
    kind: token.kind,
    retainerName: token.retainerName,
  });

  if (token.kind === 'recruit' && (token.archetype === 'marshal' || token.archetype === 'steward')) {
    // The name persists onto the CourtPiece (§2 — names are state), copied from the PRE-BOUND token.
    events.push(...addCourtPiece(state, playerIndex, token.archetype, nodeId, token.retainerName ?? undefined));
  } else if (token.kind === 'blight_seed') {
    node.blightLevel += getTunables().DISCOVERY_BLIGHT_DELTA;
    node.shadowkingForces.push(makeBlightSeedForce(nodeId));
  } else if (token.kind === 'death_knight') {
    node.shadowkingForces.push(makeFlipDeathKnight(nodeId));
  }

  return events;
}

/**
 * Grant a Blight-seed's pre-bound bonus recruit to `playerIndex` IF the node's fightable
 * threat has just been cleared (§5.1, §7 D9). Idempotent (sets `bonusClaimed`). Returns events.
 */
export function redeemBlightSeed(
  state: GameState,
  playerIndex: number,
  nodeId: string,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (!blightSeedRedeemable(state, nodeId)) return events;
  const tok = state.board.state.nodes[nodeId].hiddenToken;
  if (!tok) return events;
  tok.bonusClaimed = true;
  if (tok.bonusArchetype === 'marshal' || tok.bonusArchetype === 'steward') {
    events.push(...addCourtPiece(state, playerIndex, tok.bonusArchetype, nodeId, tok.bonusName ?? undefined));
  }
  return events;
}

/** Whether a node still holds an unredeemed Blight-seed bonus recruit (a flipped seed token,
 *  bonus not yet claimed) AND its threat force is gone — i.e. the seed was just cleared. */
export function blightSeedRedeemable(state: GameState, nodeId: string): boolean {
  const ns = state.board.state.nodes[nodeId];
  if (!ns) return false;
  const tok = ns.hiddenToken;
  if (!tok || !tok.flipped || tok.kind !== 'blight_seed') return false;
  if (tok.bonusClaimed || tok.bonusArchetype === null) return false;
  // The threat is the seed force; redeemable once it (and any other SK force) is off the node.
  return ns.shadowkingForces.length === 0;
}
