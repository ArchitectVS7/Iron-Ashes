/**
 * Kill the Dark — the heart + the heroic two-act ending (§5.6, §13 P0-6/P0-7, §12 #17/#18/#21).
 *
 * The dark's HEART spawns as a real on-map node at the Reckoning crossing (the Keystone) with a
 * public HP track. ASSAULT_HEART commits a force over telegraphed rounds; each commit lands a
 * visible hit and the dark RETALIATES the raid-leader by name. On HP→0 the dark falls:
 *
 *   1. The apocalypse clock is removed (no Blight advance / strikes / auto-pressure); all black
 *      forces are banished; captives the dark held are freed to their owners (§5.6).
 *   2. The heart's collapse DISPLACES the raid force off the Keystone, and the raid-leader's
 *      committed-force home nodes count UN-PRODUCING for the post-dark resolution (§13 P0-7) —
 *      the hero contests, isn't auto-win OR auto-robbed.
 *   3. A single named Dawn (`POST_DARK_ROUNDS` out) overrides ROUND_CAP (§12 #18) → a Territory /
 *      Gambit scramble among the survivors. The raid-leader is SHIELDED from deposal the Dawn the
 *      dark dies (§12 #17).
 *
 * Determinism (§7): no RNG; the raid-leader is the largest cumulative committer (ties → lowest
 * seat); displacement targets a BFS-nearest stronghold; JSON-serializable state only.
 */

import type { GameEvent } from './events.js';
import type { GameState, HeartState } from './types.js';
import type { ActionResult } from './actions.js';
import { getTunables } from './tunables.js';
import { getPlayerPowerAtNode } from './combat.js';
import { nearestStronghold, freeCaptiveToOwner } from './capture.js';
import { addGrudge } from './shadowking-policy.js';
import { computeTerritoryWinner } from './gambit.js';

// ─── Heart spawn (§5.6) ───────────────────────────────────────────

/**
 * Spawn the dark's heart at the Reckoning crossing (§5.6) — a real on-map node at the Keystone
 * with HP = HEART_HP. Idempotent: spawns once, only in Reckoning, never after the dark has fallen.
 * Called from the Dawn escalation (`applyScheduledEscalation`, §4.4). Returns events.
 */
export function spawnHeartAtReckoning(state: GameState): GameEvent[] {
  const sk = state.shadowking;
  if (state.act !== 'RECKONING' || sk.heart !== null || sk.darkDefeated) return [];
  sk.heart = {
    nodeId: state.board.definition.keystoneId,
    hp: getTunables().HEART_HP,
    exposed: true,
    committedBySeat: new Array(state.players.length).fill(0),
    raidLeader: null,
  };
  return [{
    type: 'SK_VOICE_LINE',
    line: 'My heart lies bare at the crossing. Come, then — try to break it.',
    trigger: 'heart_spawned',
  }];
}

// ─── ASSAULT_HEART (§5.6, §13 P0-6) ───────────────────────────────

/** The raid-leader = the LARGEST cumulative committer; ties → lowest seat (§12 #21). null if no
 *  seat has committed. Pure: ascending-seat scan with a strict `>` keeps the lowest seat on ties. */
export function computeRaidLeader(heart: HeartState): number | null {
  let best = 0;
  let leader: number | null = null;
  for (let seat = 0; seat < heart.committedBySeat.length; seat++) {
    const amt = heart.committedBySeat[seat];
    if (amt > 0 && amt > best) { best = amt; leader = seat; }
  }
  return leader;
}

/**
 * ASSAULT_HEART (§5.6) — commit a force to the dark's heart. The actor's Warlord must STAND at the
 * heart (the Keystone): committed pieces cannot also defend the homeland (the opportunity cost is
 * the real cost). The hit = committed card power + the actor's on-board piece power; it reduces the
 * public HP. The dark RETALIATES the raid-leader by name (grudge). Liveness (§13 P0-6): a real hit
 * this round + ≥ HEART_ASSAULT_MIN_COMMIT cards sets `heartAssaultLiveThisRound` (suppressing the
 * Dawn auto-pressure). On HP→0 the heart is marked broken; the collapse RESOLVES at Dawn (§12 #10).
 */
export function executeAssaultHeart(
  state: GameState,
  playerIndex: number,
  committedCards: number[],
): ActionResult {
  const events: GameEvent[] = [];
  const t = getTunables();
  const heart = state.shadowking.heart;

  if (state.act !== 'RECKONING' || heart === null) {
    throw new Error('Cannot ASSAULT_HEART: the dark heart has not risen (Reckoning only, §5.6)');
  }
  if (!heart.exposed || heart.hp <= 0) {
    throw new Error('Cannot ASSAULT_HEART: the heart is already broken');
  }
  const player = state.players[playerIndex];
  if (player.warlordNodeId !== heart.nodeId) {
    throw new Error('Cannot ASSAULT_HEART: your Warlord must stand at the heart (the Keystone)');
  }
  if (committedCards.length < t.HEART_ASSAULT_MIN_COMMIT) {
    throw new Error(`Cannot ASSAULT_HEART: commit at least ${t.HEART_ASSAULT_MIN_COMMIT} card(s)`);
  }
  // Validate committed cards are in hand.
  const handCopy = [...player.hand];
  for (const card of committedCards) {
    const idx = handCopy.indexOf(card);
    if (idx === -1) throw new Error(`Cannot ASSAULT_HEART: card ${card} not in hand`);
    handCopy.splice(idx, 1);
  }

  // The hit: the committed card sink + the actor's on-board force at the heart.
  const cardPower = committedCards.reduce((s, v) => s + v, 0);
  const basePower = getPlayerPowerAtNode(state, playerIndex, heart.nodeId);
  const hit = cardPower + basePower;

  // Discard the committed cards.
  for (const card of committedCards) {
    const i = player.hand.indexOf(card);
    if (i !== -1) player.hand.splice(i, 1);
  }

  // Land the visible hit; accrue the cumulative commit; recompute the raid-leader.
  const before = heart.hp;
  heart.hp = Math.max(0, heart.hp - hit);
  const landed = before - heart.hp;
  heart.committedBySeat[playerIndex] += hit;
  heart.raidLeader = computeRaidLeader(heart);

  events.push({
    type: 'PLAYER_ACTED',
    playerIndex,
    action: 'ASSAULT_HEART',
    details: { hit: landed, heartHp: heart.hp, committed: committedCards.length, raidLeader: heart.raidLeader },
  });

  // Liveness (§13 P0-6): a REAL hit this round + the minimum commit suppresses the auto-pressure.
  if (landed > 0 && committedCards.length >= t.HEART_ASSAULT_MIN_COMMIT) {
    state.shadowking.heartAssaultLiveThisRound = true;
  }

  // The dark retaliates the RAID-LEADER by name (§5.6/§12 #21) — even when a lesser committer struck.
  if (heart.raidLeader !== null) {
    events.push(...addGrudge(state, heart.raidLeader, t.HEART_RETALIATE_GRUDGE, 'heart_retaliation'));
    events.push({
      type: 'SK_VOICE_LINE',
      line: `Warlord of seat ${heart.raidLeader + 1}, you lead this folly — I mark YOU above all.`,
      trigger: 'heart_retaliation',
    });
  }

  // On HP→0 the heart is broken; the collapse resolves at Dawn (before deposals, §12 #10/#17).
  if (heart.hp <= 0) {
    heart.exposed = false;
    events.push({
      type: 'SK_VOICE_LINE',
      line: 'My heart... breaks. But the throne is already poisoned — they will turn on each other.',
      trigger: 'heart_broken',
    });
  }

  return { state, events, actionConsumed: true };
}

// ─── Heart collapse (§5.6, §13 P0-7, §12 #10/#17/#18) ─────────────

/**
 * The raid-leader's committed-force home nodes that count UN-PRODUCING post-dark (§13 P0-7). The
 * spent-force penalty: the leader's single highest-value owned production node (the home the raid
 * was launched from). Bounded to ONE node so the hero is penalized, never auto-robbed. Pure.
 */
function unproducingHomeNodes(state: GameState, leader: number): string[] {
  let bestId: string | null = null;
  let bestVal = -1;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== leader || ns.ashed) continue;
    const tier = state.board.definition.nodes[id]?.tier;
    if (tier !== 'keep' && tier !== 'forge' && tier !== 'holding') continue;
    // Rank by node value: a Forge outweighs a Keep/Holding; ties → lowest id.
    const nodeVal = tier === 'forge' ? 2 : 1;
    if (nodeVal > bestVal || (nodeVal === bestVal && (bestId === null || id < bestId))) {
      bestVal = nodeVal;
      bestId = id;
    }
  }
  return bestId === null ? [] : [bestId];
}

/**
 * Displace EVERY player piece off the heart node — the Keystone (§13 P0-7). Each piece returns to
 * its owner's BFS-nearest stronghold (fallback: its home Keep), keeping the court roster + the
 * Warlord/Herald node fields in sync. Returns events. Deterministic.
 */
function displaceFromKeystone(state: GameState, keyId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const keyNs = state.board.state.nodes[keyId];
  if (!keyNs) return events;

  const def = state.board.definition;
  for (const piece of [...keyNs.pieces]) {
    const owner = piece.owner;
    const fallback = owner < def.keepIds.length ? def.keepIds[owner] : null;
    const dest = nearestStronghold(state, owner) ?? fallback;
    keyNs.pieces = keyNs.pieces.filter(p => p.id !== piece.id);
    if (dest !== null) {
      const destNs = state.board.state.nodes[dest];
      if (destNs) destNs.pieces.push({ ...piece, nodeId: dest });
      const cp = state.players[owner].court.find(c => c.id === piece.id);
      if (cp) cp.node = dest;
      if (piece.type === 'warlord') state.players[owner].warlordNodeId = dest;
      if (piece.type === 'herald') state.players[owner].heraldNodeId = dest;
    }
    events.push({
      type: 'PLAYER_ACTED', playerIndex: owner, action: 'MARCH',
      details: { displacedFromHeart: keyId, to: dest },
    });
  }
  return events;
}

/**
 * Resolve the heart's collapse at Dawn (§5.6, §12 #10/#17/#18) — called BEFORE the Reckoning
 * auto-pressure and `resolveDeposals`, so ending the dark CANCELS its pending kills that Dawn. The
 * sequence: remove the loss clock (`darkDefeated`), banish all dark forces, free the dark's
 * captives, apply the raid-leader penalty (off-Keystone displacement + un-producing home + a
 * one-Dawn deposal shield, §13 P0-7/§12 #17), and schedule the single named resolution Dawn (§12
 * #18). No-op unless the heart exists at HP 0 and has not already collapsed. Returns events.
 */
export function resolveHeartCollapse(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const sk = state.shadowking;
  const heart = sk.heart;
  if (heart === null || heart.hp > 0 || sk.darkDefeated) return events;

  // 1. Remove the apocalypse clock + banish all black forces.
  sk.darkDefeated = true;
  sk.forces = [];
  for (const ns of Object.values(state.board.state.nodes)) ns.shadowkingForces = [];

  // Free the dark's captives — any held by a captor who has become a Wraith (eliminated, serving
  // the dark). Normally already freed at deposal; defensive + honest to §5.6.
  for (const rec of [...state.captives]) {
    if (state.players[rec.captorSeat]?.isEliminated) {
      events.push(...freeCaptiveToOwner(state, rec));
    }
  }

  // 2. Raid-leader penalty in the win currency (§13 P0-7) — recorded BEFORE displacement so the
  //    un-producing home is read from the leader's standing holdings.
  const leader = heart.raidLeader;
  if (leader !== null) {
    sk.unproducingNodes = unproducingHomeNodes(state, leader);
    sk.heroShieldSeat = leader;
    sk.heroShieldRound = state.round;
  }

  // The heart's collapse displaces the raid force off the Keystone (the spent force).
  events.push(...displaceFromKeystone(state, heart.nodeId));
  const keyNs = state.board.state.nodes[heart.nodeId];
  if (keyNs) keyNs.owner = null; // the crossing is contested for the scramble

  // 3. Schedule the single named resolution Dawn (overrides ROUND_CAP, §12 #18).
  sk.postDarkResolutionRound = state.round + getTunables().POST_DARK_ROUNDS;

  events.push({
    type: 'SK_VOICE_LINE',
    line: 'The dark is broken. Now the survivors race for an empty throne — and a foretold betrayal.',
    trigger: 'heart_collapsed',
  });
  return events;
}

/**
 * The post-dark scramble winner (§5.6/§13 P0-7) — the canonical territory winner with the raid-
 * leader's UN-PRODUCING home nodes (§13 P0-7) temporarily neutralized (owner cleared, then
 * restored). Reuses `computeTerritoryWinner` so the tiebreak ladder is identical. Deterministic.
 */
export function computePostDarkWinner(state: GameState): number | null {
  const unprod = state.shadowking.unproducingNodes;
  const saved: Array<readonly [string, number | null]> = [];
  for (const id of unprod) {
    const ns = state.board.state.nodes[id];
    if (ns) { saved.push([id, ns.owner]); ns.owner = null; }
  }
  const winner = computeTerritoryWinner(state);
  for (const [id, owner] of saved) {
    const ns = state.board.state.nodes[id];
    if (ns) ns.owner = owner;
  }
  return winner;
}
