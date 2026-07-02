/**
 * Capture economy (§5.2/§5.3, §13 P0-1/P0-2/P0-3/P0-10; Stage 3d).
 *
 * The hostage roster: a winning RAID may CAPTURE or ROUT a defending retainer (never the
 * Warlord — deposal is via zero-strongholds only, §6). This module owns the piece-level
 * mechanics shared by `executeRaid` / `executeRansom` / the Dawn upkeep:
 *
 *   - CAPTURE_PIECE → move a retainer to `state.captives[]` (held; produces nothing, not
 *     gained by the captor — §2/§12 #7). Margin-gated by `effectiveCaptureMargin` (combat.ts).
 *   - ROUT_PIECE   → a TEMPO loss, NOT removal (§13 P0-1): the piece goes off-board and
 *     returns to its owner's nearest stronghold next Dawn, capture/rout-immune for
 *     RECAPTURE_IMMUNE rounds.
 *   - Guard cap    → ≤ CAPTIVE_GUARD_CAP per living Marshal/stronghold; over-cap forced-release
 *     is deterministic (lowest pieceId, to original owner, at Dawn — §12 #25).
 *   - On captor death → captives freed to ORIGINAL owners (§12 #6); owner dead / stronghold-less
 *     → removed-from-game (§12 #22).
 *
 * Determinism (§7): no RNG here — every choice (target, release order, nearest stronghold) is a
 * fixed seat/pieceId/BFS tiebreak. JSON-serializable state only.
 */

import type { GameEvent } from './events.js';
import type { Archetype, CaptiveRecord, GameState } from './types.js';
import { getTunables } from './tunables.js';
import { archetypePower } from './court.js';
import { livingStrongholdCount } from './combat.js';

/** Archetypes a RAID may capture/rout — the board retainers. The Warlord is NEVER capturable
 *  (§5.2); the Herald has its own interception path (§HL, actions.ts `resolveHeraldCaptures`). */
const CAPTURABLE: ReadonlySet<Archetype> = new Set<Archetype>(['marshal', 'steward']);

// ─── Board piece helpers ──────────────────────────────────────────

/** Remove a player's on-board piece (its node mirror) by id — used when it is captured/routed. */
function removeBoardPiece(state: GameState, ownerSeat: number, pieceId: string): void {
  for (const ns of Object.values(state.board.state.nodes)) {
    ns.pieces = ns.pieces.filter(p => !(p.id === pieceId && p.owner === ownerSeat));
  }
}

/** Re-place a returned retainer's on-board mirror at `nodeId` with its archetype power. */
function addBoardPiece(state: GameState, ownerSeat: number, archetype: Archetype, nodeId: string, id: string): void {
  const ns = state.board.state.nodes[nodeId];
  if (!ns) return;
  ns.pieces.push({ id, type: archetype, owner: ownerSeat, power: archetypePower(archetype), nodeId });
}

// ─── Nearest stronghold (rout/ransom return target) ───────────────

/**
 * The owner's nearest living stronghold (BFS from its Warlord node over board adjacency,
 * neighbours visited in sorted id order → deterministic; ties → lowest id). A stronghold is
 * any owned, non-ashed production node (Keep/Forge/Holding — §12 #14). null if the owner holds
 * none (they are stronghold-less and about to be deposed — §12 #22). Pure.
 */
export function nearestStronghold(state: GameState, ownerSeat: number): string | null {
  const start = state.players[ownerSeat]?.warlordNodeId;
  if (start === undefined) return null;
  const isStronghold = (id: string): boolean => {
    const ns = state.board.state.nodes[id];
    const tier = state.board.definition.nodes[id]?.tier;
    return !!ns && ns.owner === ownerSeat && !ns.ashed &&
      (tier === 'keep' || tier === 'forge' || tier === 'holding');
  };
  const seen = new Set<string>([start]);
  let frontier = [start];
  while (frontier.length > 0) {
    // Closest-first: check this BFS layer in sorted id order before expanding.
    for (const id of [...frontier].sort()) {
      if (isStronghold(id)) return id;
    }
    const next: string[] = [];
    for (const id of frontier) {
      for (const nbr of state.board.definition.nodes[id]?.connections ?? []) {
        if (!seen.has(nbr)) { seen.add(nbr); next.push(nbr); }
      }
    }
    frontier = next;
  }
  return null;
}

// ─── Election targets ─────────────────────────────────────────────

/**
 * The defending retainers a RAID at `nodeId` may capture/rout (§5.2): on-board, non-Warlord,
 * capturable archetype, and NOT capture/rout-immune (§5.3). Returned sorted by pieceId so the
 * default election (and any tie) is deterministic. Pure.
 */
export function legalRaidTargets(state: GameState, defenderSeat: number, nodeId: string): string[] {
  const ns = state.board.state.nodes[nodeId];
  if (!ns) return [];
  const owner = state.players[defenderSeat];
  const ids: string[] = [];
  for (const p of ns.pieces) {
    if (p.owner !== defenderSeat || !CAPTURABLE.has(p.type)) continue;
    const cp = owner.court.find(c => c.id === p.id);
    if (cp && state.round < cp.recaptureImmuneUntil) continue; // immune (§5.3)
    ids.push(p.id);
  }
  return ids.sort();
}

/**
 * Rival seats (sorted) that have a CAPTURABLE, electable retainer standing at `nodeId` right now —
 * regardless of whether that seat's Warlord is co-located (§5.2, Stage 5e loosened rule). Each
 * returned seat has at least one `canCapture` target here, so a winning margin-clearing RAID can
 * elect CAPTURE against it even with the owner Warlord elsewhere. The Warlord is never a target;
 * sworn-ally filtering is the caller's job (this module has no Oath dependency). Pure `f(state)`. */
export function capturableRetainerOwnersAt(state: GameState, playerIndex: number, nodeId: string): number[] {
  const ns = state.board.state.nodes[nodeId];
  if (!ns) return [];
  const owners = [...new Set(
    ns.pieces.filter(p => p.owner !== playerIndex && CAPTURABLE.has(p.type)).map(p => p.owner),
  )].sort((a, b) => a - b);
  return owners.filter(
    seat => legalRaidTargets(state, seat, nodeId).some(id => canCapture(state, seat, nodeId, id)),
  );
}

/** Count a defender's FREE retainers (non-Warlord court pieces on the board) — drives the
 *  Whisper last-retainer protection (§13 P0-10). Pure. */
export function freeRetainerCount(state: GameState, defenderSeat: number): number {
  return state.players[defenderSeat].court.filter(
    c => c.archetype !== 'warlord' && c.captiveOf === null && c.routedReturnRound === null,
  ).length;
}

/**
 * Whether `pieceId` can be CAPTURED right now (§5.2 + §13 P0-10): it must be a legal target,
 * and in WHISPER it must NOT be the defender's LAST retainer (opening hopelessness protection).
 * ROUT carries no such cap (it is only a tempo loss). Pure.
 */
export function canCapture(state: GameState, defenderSeat: number, nodeId: string, pieceId: string): boolean {
  if (!legalRaidTargets(state, defenderSeat, nodeId).includes(pieceId)) return false;
  if (state.act === 'WHISPER' && freeRetainerCount(state, defenderSeat) <= 1) return false;
  return true;
}

// ─── CAPTURE / ROUT ───────────────────────────────────────────────

/**
 * CAPTURE a retainer (§5.2): move it off-board into `state.captives[]`, held by the captor.
 * Sets `captiveOf` so it produces nothing (Steward trickles only — §13 P0-3) and is not gained
 * by the captor (§12 #7). Caller has already validated margin + `canCapture`. Returns events.
 */
export function capturePiece(state: GameState, captorSeat: number, defenderSeat: number, pieceId: string): GameEvent[] {
  const owner = state.players[defenderSeat];
  const cp = owner.court.find(c => c.id === pieceId);
  if (!cp) return [];
  removeBoardPiece(state, defenderSeat, pieceId);
  cp.captiveOf = captorSeat;
  cp.routedReturnRound = null;
  cp.recaptureImmuneUntil = 0;
  state.captives.push({
    pieceId, ownerSeat: defenderSeat, captorSeat, capturedRound: state.round, recaptureImmuneUntil: 0,
  });
  return [{
    type: 'PLAYER_ACTED', playerIndex: captorSeat, action: 'RAID',
    details: { capture: pieceId, name: cp.name, owner: defenderSeat, archetype: cp.archetype },
  }];
}

/**
 * ROUT a retainer (§13 P0-1): a TEMPO loss, never removal. The piece goes off-board and is
 * scheduled to return to its owner's nearest stronghold next Dawn (`returnRoutedPieces`).
 * Returns events.
 */
export function routPiece(state: GameState, defenderSeat: number, pieceId: string): GameEvent[] {
  const owner = state.players[defenderSeat];
  const cp = owner.court.find(c => c.id === pieceId);
  if (!cp) return [];
  removeBoardPiece(state, defenderSeat, pieceId);
  cp.routedReturnRound = state.round; // returns at THIS round's Dawn (the next Dawn)
  return [{
    type: 'PLAYER_ACTED', playerIndex: defenderSeat, action: 'RAID',
    details: { rout: pieceId, name: cp.name, owner: defenderSeat, returnsRound: state.round },
  }];
}

// ─── Dawn: return routed pieces ───────────────────────────────────

/**
 * Return every routed retainer due back this Dawn to its owner's nearest stronghold, with a
 * RECAPTURE_IMMUNE-round immunity (§13 P0-1). An eliminated owner's routed pieces are dropped;
 * a stronghold-less (alive) owner's piece stays routed until they have one. Returns events.
 */
export function returnRoutedPieces(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const t = getTunables();
  for (const player of state.players) {
    for (const cp of [...player.court]) {
      if (cp.routedReturnRound === null || cp.routedReturnRound > state.round) continue;
      if (player.isEliminated) {
        player.court = player.court.filter(c => c.id !== cp.id);
        continue;
      }
      const node = nearestStronghold(state, player.index);
      if (node === null) continue; // no stronghold yet — try again next Dawn
      cp.routedReturnRound = null;
      cp.node = node;
      cp.recaptureImmuneUntil = state.round + t.RECAPTURE_IMMUNE;
      addBoardPiece(state, player.index, cp.archetype, node, cp.id);
      events.push({
        type: 'PLAYER_ACTED', playerIndex: player.index, action: 'MARCH',
        details: { routReturned: cp.id, name: cp.name, to: node, immuneUntil: cp.recaptureImmuneUntil },
      });
    }
  }
  return events;
}

// ─── Captive freeing (ransom / guard-cap / on-death) ──────────────

/**
 * Free a captive back to its ORIGINAL owner (§12 #6/#22/#25). Removes the captive record and
 * either: re-places the piece at the owner's nearest stronghold (immune RECAPTURE_IMMUNE rounds),
 * OR — if the owner is eliminated, or alive but stronghold-less — removes the piece from the game
 * (§12 #22). Used by guard-cap release and captor-death cleanup (NOT by paid RANSOM). Returns events.
 */
export function freeCaptiveToOwner(state: GameState, record: CaptiveRecord): GameEvent[] {
  state.captives = state.captives.filter(r => r !== record);
  const owner = state.players[record.ownerSeat];
  const cp = owner.court.find(c => c.id === record.pieceId);
  if (!cp) return [];

  const node = owner.isEliminated ? null : nearestStronghold(state, owner.index);
  if (node === null) {
    // Owner dead, or alive but stronghold-less → removed-from-game (§12 #22).
    owner.court = owner.court.filter(c => c.id !== record.pieceId);
    return [{
      type: 'PLAYER_ACTED', playerIndex: record.ownerSeat, action: 'PASS',
      details: { captiveRemoved: record.pieceId, reason: owner.isEliminated ? 'owner_dead' : 'no_stronghold' },
    }];
  }

  cp.captiveOf = null;
  cp.routedReturnRound = null;
  cp.recaptureImmuneUntil = state.round + getTunables().RECAPTURE_IMMUNE;
  cp.node = node;
  addBoardPiece(state, owner.index, cp.archetype, node, cp.id);
  return [{
    type: 'PLAYER_ACTED', playerIndex: record.ownerSeat, action: 'PASS',
    details: { captiveFreed: record.pieceId, name: cp.name, to: node, from: record.captorSeat },
  }];
}

/** A captor's captive guard capacity (§5.3): CAPTIVE_GUARD_CAP per living Marshal AND per living
 *  stronghold. Over-capacity captives are force-released at Dawn (§12 #25). Pure. */
export function guardCapacity(state: GameState, captorSeat: number): number {
  const captor = state.players[captorSeat];
  if (captor.isEliminated) return 0;
  const livingMarshals = captor.court.filter(
    c => c.archetype === 'marshal' && c.captiveOf === null && c.routedReturnRound === null,
  ).length;
  return getTunables().CAPTIVE_GUARD_CAP * (livingMarshals + livingStrongholdCount(state, captorSeat));
}

/**
 * Enforce the captive guard cap at Dawn (§5.3/§12 #25): any captor holding more captives than
 * its `guardCapacity` force-releases the LOWEST-pieceId captives to their original owners until
 * within cap. Deterministic. Returns events.
 */
export function enforceGuardCap(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const captorSeats = [...new Set(state.captives.map(r => r.captorSeat))].sort((a, b) => a - b);
  for (const captorSeat of captorSeats) {
    const held = state.captives.filter(r => r.captorSeat === captorSeat);
    const capacity = guardCapacity(state, captorSeat);
    if (held.length <= capacity) continue;
    // Release the LOWEST-pieceId captives first until within cap (§12 #25).
    const overflow = held.slice().sort((a, b) => (a.pieceId < b.pieceId ? -1 : 1)).slice(0, held.length - capacity);
    for (const record of overflow) {
      events.push(...freeCaptiveToOwner(state, record));
    }
  }
  return events;
}

/**
 * After Dawn deposals (§6), settle captives touched by an elimination: a captive whose CAPTOR
 * was eliminated is freed to its owner (§12 #6); a captive whose OWNER was eliminated is removed
 * from the game (§12 #22). Both routes go through `freeCaptiveToOwner`. Returns events.
 */
export function resolveCaptivesAfterDeposals(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  for (const record of [...state.captives]) {
    const captorDead = state.players[record.captorSeat]?.isEliminated === true;
    const ownerDead = state.players[record.ownerSeat]?.isEliminated === true;
    if (captorDead || ownerDead) {
      events.push(...freeCaptiveToOwner(state, record));
    }
  }
  return events;
}
