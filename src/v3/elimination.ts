/**
 * Elimination machinery (§5.5/§6, §13 P0-4/P0-5/P0-9, §7 D7; Stage 3e).
 *
 * The load-bearing layer the 3a skeleton stubbed. Three decoupled systems:
 *
 *   1. The strike pool (§13 P0-4 / §7 D7) — eliminated players' hands feed
 *      `shadowking.strikePool` (NEVER the eliminator). It is CAPPED (STRIKEPOOL_CAP) and
 *      DECAYING (oldest removed-from-game each Dawn). Power = Σ(card.power); a strike consumes
 *      LOWEST-card-id cards first → a terminal removed set. This decouples strike power from
 *      cumulative deaths (kills the chain-collapse) and is measurable. Conservation invariant:
 *      |hands| + |strikePool| + |removed| is constant between draws (`cardsAccountedFor`).
 *
 *   2. Reckoning AUTO-PRESSURE (§13 P0-5) — in Reckoning, with no LIVE heart assault, the dark
 *      deposes strongholds targeting the MOST-PRODUCTION / LEAST-ENGAGED seat FIRST (taxes the
 *      turtle + the lead), restoring the executioner the `all_broken` win used to provide.
 *
 *   3. The Death-Curse targeting rule (§13 P0-9 / §12 #26) — the curse/dark-steer targets the
 *      board LEADER or an OATHBREAKER, NEVER "whoever took the last stronghold." `killer` is the
 *      seat of the most-recent stronghold-stripping action; if dark-caused, the curse redirects
 *      to the living BENEFICIARY (nearest claimant of the ashed land). The Bequest/Wraith that
 *      APPLY this are built in 3f — this exposes the helper + the rule.
 *
 * Determinism (§7 D5/D6/D7): no RNG; every choice is a fixed seat / pieceId / id / BFS tiebreak;
 * JSON-serializable state only; the pool is a FIFO keyed by a monotonic `strikePoolSeq`.
 */

import type { GameEvent } from './events.js';
import type { GameState } from './types.js';
import { getTunables } from './tunables.js';
import { ashNode } from './blight.js';
import { livingStrongholdCount, productionOf } from './combat.js';

// ─── Strike pool (§13 P0-4 / §7 D7) ───────────────────────────────

/** Order the pool oldest-first (ascending id) — the canonical FIFO order for decay + a strike's
 *  lowest-card-id-first consumption. Mutates in place (deterministic, no RNG). */
function sortPoolOldestFirst(state: GameState): void {
  state.shadowking.strikePool.sort((a, b) => a.id - b.id);
}

/**
 * Feed an eliminated player's WHOLE hand into the strike pool (§5.5 "no free spoils"): the cards
 * go to the dark, NEVER to the eliminator and NEVER back into the live deck stream (§7 D4). Each
 * card gets a monotonic id (lower = older). The pool is trimmed to STRIKEPOOL_CAP by removing the
 * OLDEST overflow to the removed-from-game pile (§13 P0-4). Returns one summary event.
 */
export function feedHandToStrikePool(state: GameState, seat: number): GameEvent[] {
  const sk = state.shadowking;
  const player = state.players[seat];
  const fed = [...player.hand];
  player.hand = [];
  for (const power of fed) {
    sk.strikePool.push({ id: sk.strikePoolSeq, power });
    sk.strikePoolSeq += 1;
  }
  // Trim to cap — oldest (lowest id) overflow leaves the game (§13 P0-4).
  sortPoolOldestFirst(state);
  const cap = getTunables().STRIKEPOOL_CAP;
  while (sk.strikePool.length > cap) {
    const oldest = sk.strikePool.shift();
    if (oldest) state.removed.push(oldest.power);
  }
  return [{
    type: 'PLAYER_ACTED', playerIndex: seat, action: 'PASS',
    details: { strikePoolFed: fed.length, poolSize: sk.strikePool.length },
  }];
}

/** Total power of the strike pool (§13 P0-4: Σ(card.power)). Pure. */
export function strikePoolPower(state: GameState): number {
  return state.shadowking.strikePool.reduce((sum, c) => sum + c.power, 0);
}

/**
 * Decay the strike pool at Dawn (§13 P0-4): remove the OLDEST STRIKEPOOL_DECAY cards from the game
 * (lowest id first) so the pool can't be a permanent death-fuelled ratchet. Cards → removed-from-
 * game (§7 D4). Returns no events (silent upkeep); the conservation invariant is preserved.
 */
export function decayStrikePool(state: GameState): GameEvent[] {
  const sk = state.shadowking;
  sortPoolOldestFirst(state);
  const n = getTunables().STRIKEPOOL_DECAY;
  for (let i = 0; i < n && sk.strikePool.length > 0; i++) {
    const oldest = sk.strikePool.shift();
    if (oldest) state.removed.push(oldest.power);
  }
  return [];
}

/**
 * Consume strike-pool cards to fuel a strike (§13 P0-4): take LOWEST-card-id cards first until the
 * accumulated power reaches `amount` (or the pool empties). Consumed cards are removed-from-game
 * (the terminal removed set, §7 D4). Returns the power actually drawn. The live-strike wiring (the
 * wraith's "add a visible card to the telegraphed strike") is built in 3f; 3e provides + tests this.
 */
export function consumeStrikePower(state: GameState, amount: number): number {
  if (amount <= 0) return 0;
  const sk = state.shadowking;
  sortPoolOldestFirst(state);
  let consumed = 0;
  while (consumed < amount && sk.strikePool.length > 0) {
    const card = sk.strikePool.shift();
    if (!card) break;
    consumed += card.power;
    state.removed.push(card.power);
  }
  return consumed;
}

/**
 * The conservation census (§7 D7): total cards accounted for across every living hand, the strike
 * pool, and the removed-from-game pile. Constant between draws — feed / decay / consume only MOVE
 * cards between these buckets, never create or destroy them. Pure.
 */
export function cardsAccountedFor(state: GameState): number {
  let n = state.removed.length + state.shadowking.strikePool.length;
  for (const p of state.players) n += p.hand.length;
  return n;
}

// ─── Wraith afterlife (§5.5, §2) ──────────────────────────────────

/** Join an eliminated Warlord to the dark as a Wraith (§5.5). The bounded per-round input is wired
 *  in 3f; this records the afterlife identity, idempotent per seat. */
export function joinWraith(state: GameState, seat: number): void {
  if (state.shadowking.wraiths.some(w => w.seat === seat)) return;
  state.shadowking.wraiths.push({ seat, eliminatedRound: state.round });
}

// ─── Killer / beneficiary tracking (§13 P0-9, §12 #26) ────────────

/** Record that `killerSeat` (a RIVAL) most-recently stripped a stronghold (`nodeId`) from
 *  `victimSeat` (§12 #26). Overwrites — "most recent" wins. (Dark strips go through `ashNode`.) */
export function markStrippedByRival(state: GameState, victimSeat: number, killerSeat: number, nodeId: string): void {
  const v = state.players[victimSeat];
  v.lastStrippedBy = killerSeat;
  v.lastStripByDark = false;
  v.lastStrippedNode = nodeId;
}

/** Record that the DARK most-recently stripped a stronghold (`nodeId`) from `victimSeat` (§12 #26)
 *  — redirects the Death-Curse to the living BENEFICIARY. Used by auto-pressure + (via `ashNode`)
 *  any strike that ashes owned land. */
export function markStrippedByDark(state: GameState, victimSeat: number, nodeId: string): void {
  const v = state.players[victimSeat];
  v.lastStrippedBy = null;
  v.lastStripByDark = true;
  v.lastStrippedNode = nodeId;
}

/**
 * The nearest LIVING claimant of `nodeId` (§12 #26): BFS over board adjacency from the node,
 * neighbours visited in sorted-id order (deterministic; ties → lowest id), returning the first
 * living, non-excluded owner of a non-ashed node. null if none. Pure.
 */
export function nearestClaimant(state: GameState, nodeId: string, excludeSeat: number): number | null {
  const def = state.board.definition;
  const seen = new Set<string>([nodeId]);
  let frontier = [nodeId];
  while (frontier.length > 0) {
    for (const id of [...frontier].sort()) {
      const ns = state.board.state.nodes[id];
      if (ns && !ns.ashed && ns.owner !== null && ns.owner !== excludeSeat &&
          !state.players[ns.owner].isEliminated) {
        return ns.owner;
      }
    }
    const next: string[] = [];
    for (const id of frontier) {
      for (const nbr of def.nodes[id]?.connections ?? []) {
        if (!seen.has(nbr)) { seen.add(nbr); next.push(nbr); }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * The Death-Curse / dark-steer target for `victimSeat` (§13 P0-9 / §12 #26). The rule:
 *   - DARK-caused kill → the curse redirects to the living BENEFICIARY (nearest claimant of the
 *     ashed land); if there is none, it falls through to the meta target.
 *   - Otherwise the curse targets a DESERVING meta seat — an OATHBREAKER first, else the board
 *     LEADER — and NEVER the killer, the victim, or an eliminated seat (decoupled from eliminating).
 * Returns the cursed seat, or null if no eligible seat exists. Pure — the Bequest (3f) applies it.
 */
export function deathCurseTarget(state: GameState, victimSeat: number): number | null {
  const victim = state.players[victimSeat];

  if (victim.lastStripByDark && victim.lastStrippedNode !== null) {
    const beneficiary = nearestClaimant(state, victim.lastStrippedNode, victimSeat);
    if (beneficiary !== null) return beneficiary;
  }

  const killer = victim.lastStripByDark ? null : victim.lastStrippedBy;
  return chooseCurseMetaTarget(state, victimSeat, killer);
}

/** An OATHBREAKER (lowest seat) if one exists, else the board LEADER (most production → lowest
 *  seat) — among living seats excluding the victim and the killer (§13 P0-9). null if none. */
function chooseCurseMetaTarget(state: GameState, victimSeat: number, killer: number | null): number | null {
  const eligible = state.players.filter(
    p => !p.isEliminated && p.index !== victimSeat && p.index !== killer,
  );
  if (eligible.length === 0) return null;

  const oathbreakers = eligible.filter(p => p.oathbreaker).sort((a, b) => a.index - b.index);
  if (oathbreakers.length > 0) return oathbreakers[0].index;

  const byLead = [...eligible].sort((a, b) => {
    const pd = productionOf(state, b.index) - productionOf(state, a.index);
    return pd !== 0 ? pd : a.index - b.index;
  });
  return byLead[0].index;
}

// ─── Reckoning auto-pressure (§13 P0-5/P0-6, §6) ──────────────────

/**
 * The Reckoning auto-pressure (§6 / §13 P0-5): in Reckoning, when NO live ASSAULT_HEART suppresses
 * it, the dark strips strongholds from the MOST-PRODUCTION / LEAST-ENGAGED living seat first — it
 * taxes the turtle and the lead, never the already-behind. Runs at Dawn BEFORE `resolveDeposals`,
 * so a seat reduced to zero strongholds is eliminated the same Dawn (the executioner the removed
 * `all_broken` path used to provide). Returns events.
 */
export function applyReckoningAutoPressure(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.act !== 'RECKONING') return events;
  // P0-6: a REAL heart-hit this round suppresses the pressure (a stalled/token assault does not).
  if (state.shadowking.heartAssaultLiveThisRound) return events;

  const living = state.players.filter(p => !p.isEliminated);
  if (living.length === 0) return events;

  // Most production → LEAST engaged (lowest grudge) → lowest seat (§13 P0-5).
  const target = [...living].sort((a, b) => {
    const pd = productionOf(state, b.index) - productionOf(state, a.index);
    if (pd !== 0) return pd;
    const ga = state.shadowking.grudge[a.index] ?? 0;
    const gb = state.shadowking.grudge[b.index] ?? 0;
    if (ga !== gb) return ga - gb;
    return a.index - b.index;
  })[0];

  const nodes = getTunables().RECKONING_AUTOPRESSURE_NODES;
  for (let i = 0; i < nodes; i++) {
    const stripped = stripOneStronghold(state, target.index);
    if (stripped.length === 0) break; // nothing left to strip
    events.push(...stripped);
  }
  return events;
}

/**
 * Strip ONE living stronghold from `seat` as dark pressure (§6). A NON-Keep stronghold (Forge /
 * Holding, lowest id) is ashed first; only when the Keep is all that remains does the dark depose
 * the seat directly (the Keep ashes via `resolveDeposals`, honouring the Keep-ashing rule §2/§12 #14).
 * Either way the strip is marked DARK-caused for the Death-Curse beneficiary rule. Returns events
 * (empty if the seat holds nothing to strip).
 */
function stripOneStronghold(state: GameState, seat: number): GameEvent[] {
  const events: GameEvent[] = [];
  const def = state.board.definition;
  const owned = Object.keys(state.board.state.nodes).filter(id => {
    const ns = state.board.state.nodes[id];
    const tier = def.nodes[id]?.tier;
    return ns.owner === seat && !ns.ashed && (tier === 'keep' || tier === 'forge' || tier === 'holding');
  }).sort();
  if (owned.length === 0) return events;

  const nonKeep = owned.filter(id => def.nodes[id]?.tier !== 'keep');
  if (nonKeep.length > 0) {
    const nodeId = nonKeep[0];
    events.push(...ashNode(state, nodeId)); // ashNode marks the owner dark-stripped (§12 #26)
    if (livingStrongholdCount(state, seat) === 0) state.players[seat].deposed = true;
    events.push({ type: 'SK_VOICE_LINE', line: 'Your borders burn. The tide does not wait.', trigger: 'reckoning_auto_pressure' });
  } else {
    // Only the Keep remains → the dark deposes the turtle; the Keep ashes at resolveDeposals.
    state.players[seat].deposed = true;
    markStrippedByDark(state, seat, owned[0]);
    events.push({
      type: 'PLAYER_ACTED', playerIndex: seat, action: 'PASS',
      details: { deposed: true, by: 'dark', reason: 'reckoning_auto_pressure' },
    });
    events.push({ type: 'SK_VOICE_LINE', line: 'The tide has reached your gates. Kneel.', trigger: 'reckoning_auto_pressure' });
  }
  return events;
}
