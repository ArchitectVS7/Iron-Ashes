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
import { addGrudge } from './shadowking-policy.js';
import { observableState, type ObservableState } from './observable.js';

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
  // Once the heart has fallen the apocalypse clock is gone (§5.6) — the dark deposes no one.
  if (state.shadowking.darkDefeated) return events;
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

// ─── Death Bequest (the exit beat, §5.5 / §7 D8 / §12 #23 / §12 #26) ──

/**
 * An eliminated Warlord's ONE final choice (§5.5), resolved in `resolveDeposals` in seat order
 * (§7 D8). BEQUEATH a held captive or remaining cards to a living ally (forging a POSTHUMOUS Oath,
 * §12 #23), OR lay a DEATH-CURSE on the depersonalized target (§13 P0-9 / §12 #26).
 */
export type BequestChoice =
  | { readonly kind: 'bequeath_captive'; readonly pieceId: string; readonly beneficiary: number }
  | { readonly kind: 'bequeath_cards'; readonly beneficiary: number }
  | { readonly kind: 'death_curse'; readonly target: number | null };

/**
 * Decide the Death Bequest for `dyingSeat` (§5.5, §7 D8) — a pure scripted `f(observableState)`:
 * the dying player reads ONLY its own fogged projection (it can never peek under the fog).
 *
 * The scripted policy bequeaths to its STANDING oath ALLY when it has one. A standing Oath is proof
 * the ally did NOT eliminate this player — raiding a sworn ally requires BREAK_OATH first, which
 * dissolves the bond — so a bequest there never rewards the killer (§12 #4 "no free spoils"). The
 * bond is sealed posthumously (the viaBequest Oath, exempt from dissolve — §12 #23). Among assets it
 * prefers handing the ally a HELD captive (a hostage AND a posthumous Oath — but never gifting a
 * captive back to its own owner), else its remaining cards. With NO standing ally it lays a
 * DEATH-CURSE at the depersonalized leader/oathbreaker/beneficiary target (§13 P0-9 / §12 #26) and
 * its hand feeds the dark by the default no-free-spoils path. Pure + deterministic.
 */
/**
 * Is a human-chosen Death Bequest override still legal for `dyingSeat` (§13 P0-11 UI)? Mirrors the
 * scripted policy's own guards so an override can never do something the engine wouldn't: a
 * beneficiary must be a living OTHER seat; a captive bequest must be a captive this seat actually
 * holds whose owner is not the beneficiary; a card bequest needs cards in hand; a curse target must
 * be null or a valid seat. Invalid overrides silently fall back to the scripted policy. Pure.
 */
function isBequestLegal(state: GameState, dyingSeat: number, choice: BequestChoice): boolean {
  const living = (seat: number): boolean =>
    seat >= 0 && seat < state.players.length && !state.players[seat].isEliminated;
  switch (choice.kind) {
    case 'bequeath_captive': {
      if (choice.beneficiary === dyingSeat || !living(choice.beneficiary)) return false;
      const rec = state.captives.find(r => r.pieceId === choice.pieceId && r.captorSeat === dyingSeat);
      return rec !== undefined && rec.ownerSeat !== choice.beneficiary;
    }
    case 'bequeath_cards':
      return choice.beneficiary !== dyingSeat && living(choice.beneficiary)
        && state.players[dyingSeat].hand.length > 0;
    case 'death_curse':
      return choice.target === null || living(choice.target);
  }
}

export function decideBequest(state: GameState, dyingSeat: number): BequestChoice {
  // Human-only override (§13 P0-11 UI): an eliminated human may have chosen its own exit beat via
  // SET_BEQUEST. Use it when present AND still legal; else fall through to the scripted policy. The
  // sim/AI never set `pendingBequests`, so headless replay is byte-identical (§7).
  const override = state.pendingBequests?.[dyingSeat];
  if (override && isBequestLegal(state, dyingSeat, override)) return override;

  const obs = observableState(state, dyingSeat);
  const oath = obs.oaths.find(o => o.a === dyingSeat || o.b === dyingSeat);
  if (oath) {
    const ally = oath.a === dyingSeat ? oath.b : oath.a;
    if (ally >= 0 && ally < obs.players.length && !obs.players[ally].isEliminated) {
      const held = obs.captives
        .filter(r => r.captorSeat === dyingSeat && r.ownerSeat !== ally)
        .map(r => r.pieceId)
        .sort();
      if (held.length > 0) return { kind: 'bequeath_captive', pieceId: held[0], beneficiary: ally };
      if (obs.players[dyingSeat].hand.length > 0) return { kind: 'bequeath_cards', beneficiary: ally };
    }
  }
  return { kind: 'death_curse', target: deathCurseTarget(state, dyingSeat) };
}

/** Forge a POSTHUMOUS Oath (§12 #23) — low seat first, marked `viaBequest` so the eliminated-player
 *  oath-dissolve sweep EXEMPTS it (it is meant to persist). The dying seat's pre-existing (non-
 *  bequest) Oath with the same ally dissolves in that sweep, leaving exactly this posthumous bond. */
function forgePosthumousOath(state: GameState, dyingSeat: number, beneficiary: number): void {
  const a = Math.min(dyingSeat, beneficiary);
  const b = Math.max(dyingSeat, beneficiary);
  state.oaths.push({ a, b, swornRound: state.round, strain: 0, viaBequest: true });
}

/**
 * Resolve the Death Bequest (§5.5, §7 D8) — called INSIDE `resolveDeposals` BEFORE the hand feeds
 * the strike pool (so a card-bequest reaches the ally, not the dark). BEQUEATH forges a posthumous
 * Oath (§12 #23); a captive bequest also re-assigns the captor BEFORE the captor-death freeing sweep,
 * so the hostage survives. DEATH-CURSE intensifies the dark's grudge at the depersonalized target
 * (§13 P0-9 / §12 #26). Returns events. Deterministic.
 */
export function applyDeathBequest(state: GameState, dyingSeat: number): GameEvent[] {
  const events: GameEvent[] = [];
  const choice = decideBequest(state, dyingSeat);

  switch (choice.kind) {
    case 'bequeath_captive': {
      const rec = state.captives.find(r => r.pieceId === choice.pieceId && r.captorSeat === dyingSeat);
      if (rec) {
        rec.captorSeat = choice.beneficiary;
        const piece = state.players[rec.ownerSeat].court.find(c => c.id === rec.pieceId);
        if (piece) piece.captiveOf = choice.beneficiary;
        forgePosthumousOath(state, dyingSeat, choice.beneficiary);
        events.push({
          type: 'PLAYER_ACTED', playerIndex: dyingSeat, action: 'PASS',
          details: { bequest: 'captive', pieceId: choice.pieceId, pieceName: piece?.name ?? null, beneficiary: choice.beneficiary },
        });
      }
      break;
    }
    case 'bequeath_cards': {
      const dying = state.players[dyingSeat];
      const given = dying.hand.length;
      state.players[choice.beneficiary].hand.push(...dying.hand);
      dying.hand = [];
      forgePosthumousOath(state, dyingSeat, choice.beneficiary);
      events.push({
        type: 'PLAYER_ACTED', playerIndex: dyingSeat, action: 'PASS',
        details: { bequest: 'cards', cards: given, beneficiary: choice.beneficiary },
      });
      break;
    }
    case 'death_curse': {
      if (choice.target !== null) {
        events.push(...addGrudge(state, choice.target, getTunables().CURSE_GRUDGE, 'death_curse'));
        events.push({
          type: 'PLAYER_ACTED', playerIndex: dyingSeat, action: 'PASS',
          details: { bequest: 'curse', target: choice.target },
        });
      }
      break;
    }
  }
  return events;
}

// ─── Wraith afterlife sweep (§5.5 / §13 P0-8 / §7 D6 / §12 #24) ────

/** One resolved Wraith input for the round. */
export interface WraithDecision {
  /** The wraith's ORIGINAL seat index — the §12 #24 resolution order. */
  readonly seat: number;
  /** The bounded input chosen: a grudge/target nudge, or a strike-pool card-add. */
  readonly kind: 'nudge' | 'card_add';
  /** True iff this wraith is the ELIMINATED BLOOD-PACT TRAITOR (§10) — its afterlife is "especially
   *  charged" toward doom: it takes precedence within the cap and nudges harder. Always false in
   *  competitive mode (no traitor) → the plan stays pure ascending-seat (byte-identical). */
  readonly isTraitor: boolean;
}

/** The eliminated Blood-Pact traitor's seat, IF it is currently a wraith (§10). null in competitive
 *  mode (no holder) or when the traitor is still alive. Pure. */
function traitorWraithSeat(state: GameState): number | null {
  if (state.mode !== 'blood_pact') return null;
  const holder = state.bloodPactHolder;
  if (holder === null) return null;
  return state.shadowking.wraiths.some(w => w.seat === holder) ? holder : null;
}

/**
 * The current BOARD LEADER the dark's precedence already aims at (§13 P0-8): the most-production
 * LIVING seat, lowest-seat tiebreak. The Wraith may only INTENSIFY this — never a personal face.
 * null if none live. Pure.
 */
export function boardLeaderSeat(state: GameState): number | null {
  const living = state.players.filter(p => !p.isEliminated);
  if (living.length === 0) return null;
  return [...living].sort((a, b) => {
    const pd = productionOf(state, b.index) - productionOf(state, a.index);
    return pd !== 0 ? pd : a.index - b.index;
  })[0].index;
}

/** A single Wraith's scripted bounded input (§13 P0-8): spend strike-pool AMMO while any remains to
 *  it (intensify the telegraphed strike), else nudge the dark's existing target. Pure
 *  `f(observableState)` — the wraith reads only its own fogged projection. */
function decideWraithInput(_obs: ObservableState, cardsAvailable: number): 'nudge' | 'card_add' {
  return cardsAvailable > 0 ? 'card_add' : 'nudge';
}

/**
 * Plan every Wraith's ONE bounded input this round (§5.5/§12 #24, §7 D6): resolve in ascending
 * ORIGINAL-SEAT order, capped at WRAITH_INPUT_CAP TOTAL across all wraiths. Each wraith reads only
 * its own observable projection. A `card_add` decrements the live strike-pool budget so later
 * wraiths fall back to a `nudge` once the ammo is spent — the ordering is legible and reproducible.
 * Returns the plan; the sweep applies nudges BEFORE the telegraph, card-adds AFTER.
 *
 * BLOOD-PACT overlay (§10): the eliminated traitor's wraith is "especially charged" toward doom, so
 * in blood_pact mode it takes PRECEDENCE — it sorts FIRST and thus always secures one of the capped
 * slots — then the rest follow ascending-seat as §12 #24. This buys the traitor no EXTRA input (the
 * cap is still WRAITH_INPUT_CAP TOTAL), only the order. In competitive mode there is no traitor, so
 * the comparator collapses to pure ascending-seat — the plan is byte-identical to before.
 */
export function planWraithInputs(state: GameState): WraithDecision[] {
  const cap = getTunables().WRAITH_INPUT_CAP;
  const traitorSeat = traitorWraithSeat(state);
  const plan: WraithDecision[] = [];
  let cardsAvailable = state.shadowking.strikePool.length;
  const ordered = [...state.shadowking.wraiths].sort((a, b) => {
    const at = a.seat === traitorSeat ? 0 : 1;
    const bt = b.seat === traitorSeat ? 0 : 1;
    if (at !== bt) return at - bt; // the traitor wraith jumps the queue (blood_pact only)
    return a.seat - b.seat;        // else ascending original-seat (§12 #24)
  });
  for (const w of ordered) {
    if (plan.length >= cap) break;
    // Human-only override (§13 P0-11 UI): an eliminated human wraith may have picked its ONE input
    // via SET_WRAITH_INPUT. Honour it — but 'card_add' still needs ammo (else fall back to 'nudge'),
    // preserving the bounded-input invariant. The sim/AI never set `wraithInputs` ⇒ byte-identical.
    const wanted = state.wraithInputs?.[w.seat];
    const kind = wanted !== undefined
      ? (wanted === 'card_add' && cardsAvailable > 0 ? 'card_add' : 'nudge')
      : decideWraithInput(observableState(state, w.seat), cardsAvailable);
    if (kind === 'card_add') cardsAvailable -= 1;
    plan.push({ seat: w.seat, kind, isTraitor: w.seat === traitorSeat });
  }
  return plan;
}

/**
 * Apply the Wraith NUDGES (§13 P0-8) — BEFORE the telegraph is computed. Each nudge intensifies the
 * dark's grudge on the current BOARD LEADER (its existing precedence) — never a personal revenge
 * face. A loyal wraith nudges by WRAITH_GRUDGE_NUDGE; the eliminated BLOOD-PACT TRAITOR's wraith is
 * "especially charged" and nudges by the larger WRAITH_TRAITOR_NUDGE (§10) — same target, more
 * intensity (steering the dark harder toward doom). Resolved in the plan's order (§12 #24, traitor-
 * first overlay §10). Returns events.
 */
export function applyWraithNudges(state: GameState, plan: readonly WraithDecision[]): GameEvent[] {
  const events: GameEvent[] = [];
  for (const d of plan) {
    if (d.kind !== 'nudge') continue;
    const leader = boardLeaderSeat(state);
    if (leader === null) continue;
    const amount = d.isTraitor ? getTunables().WRAITH_TRAITOR_NUDGE : getTunables().WRAITH_GRUDGE_NUDGE;
    events.push(...addGrudge(state, leader, amount, d.isTraitor ? 'wraith_traitor_nudge' : 'wraith_nudge'));
  }
  return events;
}

/**
 * Apply the Wraith CARD-ADDS (§5.5/§12 #24) — AFTER the telegraph is computed. Each add consumes the
 * LOWEST-card-id strike-pool card (§13 P0-4 FIFO) and commits its power to THIS round's telegraphed
 * strike (`telegraph.wraithStrikeBonus`), so the Pledge must beat a higher threshold. Consumed cards
 * are removed-from-game (the conservation invariant holds). No-op without a telegraph. Returns events.
 */
export function applyWraithCardAdds(state: GameState, plan: readonly WraithDecision[]): GameEvent[] {
  const events: GameEvent[] = [];
  const telegraph = state.shadowking.telegraph;
  if (!telegraph) return events;
  for (const d of plan) {
    if (d.kind !== 'card_add') continue;
    sortPoolOldestFirst(state);
    const card = state.shadowking.strikePool.shift();
    if (!card) break; // ammo spent (the planner caps to availability; stay safe regardless)
    state.removed.push(card.power);
    telegraph.wraithStrikeBonus = (telegraph.wraithStrikeBonus ?? 0) + card.power;
    events.push({
      type: 'PLAYER_ACTED', playerIndex: d.seat, action: 'PASS',
      details: { wraith: 'card_add', power: card.power, strikeBonus: telegraph.wraithStrikeBonus, traitor: d.isTraitor },
    });
  }
  return events;
}
