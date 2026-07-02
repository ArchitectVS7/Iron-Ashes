/**
 * The Court — the four archetypes (§2, Stage 3b).
 *
 * A player commands a small court: a Warlord (leader) plus retainers grown by
 * Discovery (3c) — Marshal (the muscle), Steward (the economy), Herald (the
 * political reach). Each archetype has a distinct on-board power, a distinct verb,
 * and a distinct capture-consequence:
 *
 *   warlord — high power; its deposal = elimination (§6).
 *   marshal — high combat; may declare Last Stand (`canLastStand`).
 *   steward — low combat; adds STEWARD_INCOME Banners at its node each Dawn (`stewardIncome`).
 *   herald  — never fights; +HERALD_HAND_BONUS hand + PARLEY (the stance logic in actions.ts).
 *
 * The `court[]` on PlayerState is the canonical roster. A piece in play is mirrored
 * by an on-board `Piece` on its node (combat reads the board piece's power); the
 * court entry carries the archetype + the `captiveOf` placeholder (the capture
 * economy, 3d). Recruitment is wired in 3c (Discovery) — this module just supports
 * pieces existing in the court and acting.
 */

import type { GameEvent } from './events.js';
import type { Archetype, GameState } from './types.js';
import { WARLORD_POWER, getTunables } from './tunables.js';

// ─── Names + identity (§2 — "names are state") ────────────────────

/** Deterministic name pool — a discovered retainer carries a seeded name (§2, §5.1). Lives here
 *  (the court owns names); discovery.ts draws from it on each node's namespaced sub-stream (§7 D9). */
export const RETAINER_NAMES: readonly string[] = Object.freeze([
  'Vael the Steadfast', 'Corin Ashborn', 'Mira of the Fens', 'Dorn Greycloak',
  'Sela Ironwood', 'Bran the Quiet', 'Halric Stormwell', 'Ysolde Vance',
  'Tomas Redhand', 'Nadia of Thorns', 'Garruk the Lesser', 'Eira Whitewater',
  'Roald Blacktongue', 'Petra Sunder', 'Kael the Patient', 'Lyssa Crowfield',
]);

/** One-line identity pool (§2) — indexed by a pure hash of the NAME (`identityFor`), so the
 *  identity is derived state, never a fresh draw (§7 D1/D9). */
const IDENTITY_LINES: readonly string[] = Object.freeze([
  'swore an oath over a burned homestead, and keeps it',
  'deserted a doomed banner once — never again',
  'reads the blight-wind like a hunting hawk',
  'carries a dead sibling\'s blade, sharpened nightly',
  'laughs in the shield-wall; weeps at the muster-roll',
  'owes the Hold a life-debt no coin can settle',
  'maps every bolt-hole between here and the ash-line',
  'buried three lords and trusts a fourth reluctantly',
  'sings the old marching songs no one else remembers',
  'counts the dark\'s knights the way misers count coin',
  'walked out of an ashed village the only one standing',
  'keeps a ledger of every slight — and every kindness',
  'was promised land once; fights for the promise still',
  'drills the levies at dawn, drinks with them at dusk',
  'speaks little; the scars carry the argument',
  'still lights a candle for the Hold that fell first',
]);

/** Pure FNV-1a-style hash of a string — the cosmetic-identity index (§7 D9: a pure function of
 *  existing state, never an RNG draw). Local so court.ts stays import-free of discovery.ts. */
function nameHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The one-line identity for a named piece — a PURE function of the name (§2, §7 D9). Same name
 *  ⇒ same line, on every platform, with no stream consumed. */
export function identityFor(name: string): string {
  return IDENTITY_LINES[nameHash(name) % IDENTITY_LINES.length];
}

/**
 * The on-board combat power an archetype contributes (§2). Warlord/Marshal are the
 * fighters (high); Steward defends weakly; Herald is a courier (never fights). Pure.
 */
export function archetypePower(archetype: Archetype): number {
  const t = getTunables();
  switch (archetype) {
    case 'warlord': return WARLORD_POWER;
    case 'marshal': return t.MARSHAL_POWER;
    case 'steward': return t.STEWARD_POWER;
    case 'herald':  return t.HERALD_PIECE_POWER;
  }
}

/**
 * Add a piece to a player's court AND place its mirror on the board (§2). Used to
 * stand up a court for tests/sim now; Discovery (3c) is the in-game recruiter.
 *
 * Steward/Marshal place a board piece with their archetype power. Herald is NOT
 * routed here — its political hand/parley stance has bespoke setup in
 * `executeRecruit` (actions.ts); call that to recruit a Herald. Returns events.
 *
 * `name` is the piece's display name (§2 — names are state): the Discovery paths pass the
 * PRE-BOUND token name (§7 D9). Callers that stand courts up directly (tests/sim fixtures) may
 * omit it — the fallback is a pure hash of the piece id into the same pool (no stream consumed).
 */
export function addCourtPiece(
  state: GameState,
  playerIndex: number,
  archetype: Exclude<Archetype, 'herald'>,
  nodeId: string,
  name?: string,
): GameEvent[] {
  const player = state.players[playerIndex];
  // Deterministic unique id: archetype + seat + per-archetype ordinal.
  const ordinal = player.court.filter(c => c.archetype === archetype).length;
  const id = `${archetype}-${playerIndex}-${ordinal}`;
  const pieceName = name ?? RETAINER_NAMES[nameHash(id) % RETAINER_NAMES.length];

  player.court.push({
    id, archetype, name: pieceName, identity: identityFor(pieceName),
    node: nodeId, captiveOf: null, routedReturnRound: null, recaptureImmuneUntil: 0,
  });

  const ns = state.board.state.nodes[nodeId];
  if (ns) {
    ns.pieces.push({
      id,
      type: archetype,
      owner: playerIndex,
      power: archetypePower(archetype),
      nodeId,
    });
  }

  return [{
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'RECRUIT',
    details: { archetype, id, nodeId, name: pieceName },
  }];
}

/**
 * Total Steward income for a player this Dawn (§2, §4.4): a FREE Steward funds its owner
 * STEWARD_INCOME at its node. Steward denial is PARTIAL (§13 P0-3): a captured OR routed
 * Steward still trickles STEWARD_DENIED_TRICKLE to its OWNER (never the captor — §12 #7) so
 * denial can't freeze the board to the cap. Pure — folded into `generateBannersForPlayer`.
 */
export function stewardIncome(state: GameState, playerIndex: number): number {
  const t = getTunables();
  let income = 0;
  for (const c of state.players[playerIndex].court) {
    if (c.archetype !== 'steward') continue;
    const denied = c.captiveOf !== null || c.routedReturnRound !== null;
    income += denied ? t.STEWARD_DENIED_TRICKLE : t.STEWARD_INCOME;
  }
  return income;
}

/**
 * Whether a player can declare a Last Stand at a node (§2/§5.3): only "the muscle" —
 * a free Warlord or Marshal present — may pour in extra cards. In a legal RAID the
 * defender's Warlord is co-located, so this never narrows existing combat; it encodes
 * that a Steward/Herald cannot stand. Pure.
 */
export function canLastStand(state: GameState, playerIndex: number, nodeId: string): boolean {
  const ns = state.board.state.nodes[nodeId];
  if (!ns) return false;
  return ns.pieces.some(
    p => p.owner === playerIndex && (p.type === 'warlord' || p.type === 'marshal'),
  );
}
