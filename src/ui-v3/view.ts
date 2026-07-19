/**
 * View (v3) — render-from-state HUD, phase panels, and full input wiring (Stage 3i-b).
 *
 * `mountView` attaches a single delegated click handler and re-renders the whole app from
 * `session.observable()` (the fog-applied §7 D2 projection) on every change. The view NEVER mutates
 * GameState and NEVER reads full state — it renders only what the human is entitled to see, and
 * routes every input through `applyCommand` via the session.
 *
 * 3i-b wires EVERY discrete action to a control (MARCH via node click, CLAIM, RAID → the capture
 * ELECTION, STRIKE, RANSOM, SWEAR/BREAK oath, RECRUIT, PARLEY, Herald MARCH, ASSAULT_HEART, PASS,
 * PLEDGE, AUDIT, ACCUSE, the WRAITH input, and the DEATH BEQUEST), and surfaces the ALGORITHM §13
 * P0-11 legibility: a persistent per-player EXPOSURE meter, the projected combat MARGIN before a
 * RAID/STRIKE/capture, and CAPTURE / KILL-THE-DARK scene beats.
 */

import type { GameSession, Exposure } from './session.js';
import { renderBoard, PLAYER_COLORS, HOUSES, houseSigilSvg } from './board-view.js';
import { AnimationQueue } from './queue.js';
import { SoundManager } from './sound.js';
import { diffObservable } from './moves.js';
import { tokenChip, gauge } from './token-chip.js';
import { powerCardFace } from './card-face.js';
import {
  TUNABLES,
  HERALD_RECRUIT_COST,
  type Archetype,
  type ObservableState,
  type Oath,
  type PlayerAction,
  type RaidEffect,
  type BequestChoiceInput,
} from '../v3/index.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function findOath(oaths: readonly Oath[], me: number): Oath | undefined {
  return oaths.find(o => o.a === me || o.b === me);
}

function oathPartner(oath: Oath, me: number): number {
  return oath.a === me ? oath.b : oath.a;
}

/** Local adjacency check off the observable board definition (no full-state reach). */
function adjacent(s: ObservableState, a: string, b: string): boolean {
  return s.board.definition.nodes[a]?.connections.includes(b) ?? false;
}

const TIER_GLYPH: Record<string, string> = { none: '∅', low: '▁', medium: '▄', high: '█' };
const ARCH_SHORT: Record<Archetype, string> = {
  warlord: '♟W', marshal: '⚔M', steward: '⚖S', herald: '✉H',
};

const EXPOSURE_LABEL: Record<Exposure, string> = {
  safe: 'SAFE',
  'can-lose-land': 'CAN LOSE LAND',
  'can-be-deposed': 'CAN BE DEPOSED',
  deposed: 'DEPOSED — falls at Dawn',
  eliminated: 'ELIMINATED',
};

/** Living, owned production (Holdings/Keeps + weighted Forges) for the standings. */
function territoryOf(s: ObservableState, idx: number): number {
  let t = 0;
  for (const [id, ns] of Object.entries(s.board.state.nodes)) {
    if (ns.owner !== idx || ns.ashed) continue;
    const tier = s.board.definition.nodes[id].tier;
    if (tier === 'forge') t += TUNABLES.FORGE_WEIGHT;
    else if (tier === 'keep' || tier === 'holding') t += 1;
  }
  return t;
}

export function mountView(root: HTMLElement, session: GameSession): void {
  // The SINGLE render path: `renderApp(session)` is invoked ONLY here, inside `settle`, which is
  // owned and called ONLY by the queue. Every state change routes `diffObservable` → queue →
  // settle; there is no direct re-render call left. Instant mode (jsdom / prefers-reduced-motion)
  // makes `enqueue` settle synchronously, preserving the E2E click-then-requery drive.
  const settle = (): void => { root.innerHTML = renderApp(session); };
  // Silent under jsdom (no Web Audio) — the E2E / parity suites are unaffected.
  const sound = new SoundManager();
  const queue = new AnimationQueue(settle, 'auto', sound);

  let prev = session.observable();
  session.onChange = (): void => {
    const next = session.observable();
    queue.enqueue(diffObservable(prev, next));
    prev = next; // advance bookkeeping synchronously at enqueue time (several onChange per action)
  };

  root.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest('[data-action],[data-node]') as HTMLElement | null;
    if (!target) return;
    const nodeAttr = target.getAttribute('data-node');

    // A board-node click Marches the Warlord there (only on the human's live turn).
    if (nodeAttr && session.isHumanTurn) {
      session.humanAction({ type: 'PLAYER_ACTION', playerIndex: session.humanIndex, action: { type: 'MARCH', targetNodeId: nodeAttr } });
      return;
    }

    const action = target.getAttribute('data-action');
    if (!action) return;
    const [verb, ...args] = action.split(':');
    const h = session.humanIndex;
    const act = (a: PlayerAction): void =>
      session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: a });

    switch (verb) {
      case 'advance-threat': session.advanceFromThreat(); break;
      case 'pledge': session.submitHumanPledge(Number(args[0])); break;
      case 'claim': act({ type: 'CLAIM' }); break;
      case 'strike': act({ type: 'STRIKE' }); break;
      case 'pass': act({ type: 'PASS' }); break;
      case 'raid': act({ type: 'RAID', targetPlayerIndex: Number(args[1]), raidEffect: args[0] as RaidEffect }); break;
      case 'ransom': act({ type: 'RANSOM', pieceId: args[0] }); break;
      case 'assault-heart': act({ type: 'ASSAULT_HEART' }); break;
      case 'recruit': act({ type: 'RECRUIT' }); break;
      case 'parley': act({ type: 'PARLEY' }); break;
      case 'herald-march': act({ type: 'MARCH', targetNodeId: args[0], pieceId: 'herald' }); break;
      case 'swear': act({ type: 'SWEAR_OATH', targetPlayerIndex: Number(args[0]) }); break;
      case 'break-oath': act({ type: 'BREAK_OATH' }); break;
      case 'audit': act({ type: 'AUDIT', targetPlayerIndex: Number(args[0]) }); break;
      case 'accuse': session.humanAccuse(Number(args[0])); break;
      case 'set-wraith': session.setWraithInput(args[0] as 'nudge' | 'card_add'); break;
      case 'bequest-cards': session.setBequest({ kind: 'bequeath_cards', beneficiary: Number(args[0]) }); break;
      case 'bequest-captive': session.setBequest({ kind: 'bequeath_captive', pieceId: args[0], beneficiary: Number(args[1]) }); break;
      case 'bequest-curse': session.setBequest({ kind: 'death_curse', target: args[0] === 'none' ? null : Number(args[0]) }); break;
      case 'laststand-toggle': session.toggleLastStandCard(Number(args[0])); break;
      case 'laststand-commit': session.commitLastStand(); break;
      case 'new-game': location.reload(); break;
    }
  });

  // Initial paint also routes through the queue (an empty diff → settle → first render).
  queue.enqueue([]);
}

// ─── Top-level layout ─────────────────────────────────────────────

export function renderApp(session: GameSession): string {
  const s = session.observable();
  // FULL diegetic dissolution (Gate 0.5): NO persistent status column. The board is centre-stage
  // on the textured table; every datum the old side-pane showed now lives in edge HUD regions —
  // a top turn ribbon, four house plaques (right), the human's realm plaques (left), and a
  // bottom action tray. Zero information loss: each renderer below is still called exactly once.
  return `
    ${renderGambitBanner(s)}
    <div class="table-stage">
      ${renderHeader(s)}
      <div class="hud hud-realm">
        <div class="realm-title">Your Realm</div>
        ${renderCourt(s, session.humanIndex)}
        ${renderHand(s, session.humanIndex)}
        ${renderHoldRail(s)}
        ${renderOaths(s)}
        ${renderLedger(s)}
        ${renderWraiths(s)}
        ${renderSuspicion(s, session.humanIndex)}
        ${renderAudits(s, session.humanIndex)}
      </div>
      <div class="board-region">${renderBoard(s)}</div>
      <div class="hud hud-houses">
        ${renderHousePlaques(session, s)}
      </div>
      <div class="hud-tray">
        ${renderPanel(session, s)}
        ${renderNarration(session)}
      </div>
    </div>`;
}

function renderGambitBanner(s: ObservableState): string {
  if (!s.gambit) return '';
  const who = s.gambit.claimant + 1;
  const status = s.gambit.named ? 'NAMED — survive this Dawn to win' : 'seized — declared at Dawn';
  return `<div class="gambit-alarm">⚠ CROWN'S GAMBIT — Player ${who} on the Keystone (${status})</div>`;
}

function renderHeader(s: ObservableState): string {
  const sk = s.shadowking;
  const heart = sk.heart
    ? ` · <span class="header-stat">Heart ${gauge('heart', sk.heart.hp, TUNABLES.HEART_HP, { stat: 'heartHp', title: sk.heart.exposed ? "the dark's heart HP" : "the dark's heart (broken)" })}${sk.heart.exposed ? '' : ' (broken)'}</span>`
    : '';
  return `
    <div class="header">
      <div class="title">Iron Throne of Ashes <span class="v-tag">v3</span></div>
      <div class="clock">Round ${s.round}/${TUNABLES.ROUND_CAP} · Act <b>${s.act}</b> · Phase <b>${s.phase}</b>${heart}</div>
      <div class="sk-meter">Dark patience ${gauge('hourglass', sk.patience, TUNABLES.PATIENCE_CAP, { stat: 'patience', title: "the dark's patience clock" })}${s.mode === 'blood_pact' ? ' · <b>Blood Pact</b>' : ''} · Strike pool ${tokenChip('embers', sk.strikePool.length, { stat: 'strikepool', title: "the dark's strike-pool cards" })}</div>
    </div>`;
}

/**
 * The four HOUSE PLAQUES (Gate 0.5 full dissolution) — the old standings table + the persistent
 * per-player EXPOSURE meter (§13 P0-11), dissolved into one diegetic heraldry plaque per house.
 * Zero information loss: land / ⚑banners / hand / living court as token chips, every state tag,
 * and the SAFE / can-lose-land / can-be-DEPOSED exposure band, all per house.
 */
function renderHousePlaques(session: GameSession, s: ObservableState): string {
  const human = session.humanIndex;
  const note = s.act === 'WHISPER'
    ? 'Whisper protects every last stronghold — no one can be deposed yet.'
    : 'The dark can DEPOSE a Warlord who loses its last stronghold — it falls at Dawn.';

  const plaques = s.players.map(p => {
    const color = PLAYER_COLORS[p.index] ?? '#888';
    const house = HOUSES[p.index];
    const level = session.exposure(p.index);
    const isYou = p.index === human;

    const tags: string[] = [];
    if (p.crownHeld) tags.push('<span class="tag crown" title="holds the Crown">♛</span>');
    if (p.isEliminated) tags.push('<span class="tag broken">Eliminated</span>');
    else if (p.deposed) tags.push('<span class="tag wounds" title="flagged for deposal at Dawn">deposed</span>');
    tags.push(p.stance === 'political' ? '<span class="tag stance" title="political build">🕊</span>' : '<span class="tag stance" title="martial build">⚔</span>');
    const oath = findOath(s.oaths, p.index);
    if (oath) tags.push(`<span class="tag oath" title="sworn oath">⛓P${oathPartner(oath, p.index) + 1}</span>`);
    const g = s.shadowking.grudge[p.index] ?? 0;
    if (g > 0) tags.push(tokenChip('skull', g, { stat: 'grudge', cls: 'tag grudge', title: "the dark's Ledger — hunted" }));
    // Only surface the traitor flag for the human's OWN seat (never leak rivals' secret, §7 D2).
    if (isYou && p.hasBloodPact) tags.push('<span class="tag grudge" title="you hold the Blood Pact">traitor</span>');

    const warlordName = p.court.find(c => c.archetype === 'warlord')?.name;
    const living = p.court.filter(c => c.captiveOf === null).length;

    return `<div class="house-plaque${isYou ? ' you' : ''}${p.isEliminated ? ' dead' : ''}" style="--house:${color}"
        title="${esc(house?.name ?? `P${p.index + 1}`)}${isYou ? ' (you)' : ''}${warlordName ? ` · Warlord ${esc(warlordName)}` : ''} — ${esc(EXPOSURE_LABEL[level])}">
      <div class="plaque-crest">${houseSigilSvg(p.index, 22, color)}</div>
      <div class="plaque-body">
        <div class="plaque-name">${esc(house?.name ?? `Player ${p.index + 1}`)}<small> P${p.index + 1}${isYou ? ' · you' : ''}</small></div>
        ${warlordName ? `<div class="plaque-warlord">${esc(warlordName)}</div>` : ''}
        <div class="chips">
          ${tokenChip('holdings', territoryOf(s, p.index), { stat: 'land', title: 'living land (holdings/keeps + weighted forges)' })}
          ${tokenChip('banner', p.banners, { stat: 'banners', title: 'banners (the muster resource)' })}
          ${tokenChip('cards', p.hand.length, { stat: 'hand', title: 'cards in hand' })}
          ${tokenChip('retinue', living, { stat: 'court', title: 'living court retainers' })}
        </div>
        <div class="plaque-tags">${tags.join(' ')}</div>
        <div class="plaque-exposure exp-${level}" title="${esc(EXPOSURE_LABEL[level])}">${EXPOSURE_LABEL[level]}</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="houses-title">The Warlords</div>
    ${plaques}
    <div class="hint houses-note">${note}</div>`;
}

/** The human's Court — names first (§2: names are state), archetype + node + the identity line. */
function renderCourt(s: ObservableState, human: number): string {
  const me = s.players[human];
  const court = me.court
    .filter(c => c.captiveOf === null)
    .map(c => `<li>${ARCH_SHORT[c.archetype]} <b>${esc(c.name)}</b> <small>@ ${esc(c.node)}</small>
      <br><small class="identity"><i>${esc(c.identity)}</i></small></li>`)
    .join('');
  const held = me.court.filter(c => c.captiveOf !== null)
    .map(c => `<li class="held">⛓ <b>${esc(c.name)}</b> <small>held by P${(c.captiveOf ?? 0) + 1}</small></li>`)
    .join('');
  return `<div class="info-block">
    <div class="block-title">Your Court</div>
    <ul class="court-list">${(court + held) || '<li><i>only your Warlord</i></li>'}</ul>
  </div>`;
}

/** The HOLD RAIL (§13 P0-11) — EVERY hostage in the game, visible all game long. */
function renderHoldRail(s: ObservableState): string {
  if (s.captives.length === 0) return '';
  const items = s.captives.map(c => {
    const piece = s.players[c.ownerSeat].court.find(x => x.id === c.pieceId);
    const glyph = piece ? ARCH_SHORT[piece.archetype] : '?';
    const name = piece ? `<b>${esc(piece.name)}</b> ` : '';
    const immune = c.recaptureImmuneUntil > s.round ? ' <small class="immune">(immune)</small>' : '';
    return `<li><span class="dot" style="background:${PLAYER_COLORS[c.ownerSeat]}"></span>${name}${glyph} of P${c.ownerSeat + 1}
      <small>held by P${c.captorSeat + 1} · since R${c.capturedRound}</small>${immune}</li>`;
  }).join('');
  return `<div class="info-block hold-rail">
    <div class="block-title">Hold Rail — hostages (${s.captives.length})</div>
    <ul class="captive-list">${items}</ul>
  </div>`;
}

/** The human's actual hand (card values) — needed to read pledge/combat strength. */
function renderHand(s: ObservableState, human: number): string {
  const hand = s.players[human].hand;
  const limit = s.players[human].handLimit;
  if (hand.length === 0) return `<div class="hand"><span class="hand-label">Your hand (0/${limit}):</span> <i>empty</i></div>`;
  // Every card renders through the data-driven generator (T-204) — no bespoke card markup here.
  const cards = hand.map(v => `<span class="card-slot">${powerCardFace(v)}</span>`).join('');
  return `<div class="hand"><span class="hand-label">Your hand (${hand.length}/${limit}):</span> <span class="hand-fan">${cards}</span></div>`;
}

function renderOaths(s: ObservableState): string {
  if (s.oaths.length === 0) return '';
  const dur = TUNABLES.OATH_DURATION;
  const items = s.oaths.map(o =>
    `<li>P${o.a + 1} ⛓ P${o.b + 1} <small>(${o.viaBequest ? 'posthumous' : `matures in ${Math.max(0, dur - o.strain)}`})</small></li>`).join('');
  return `<div class="info-block"><div class="block-title">Oaths</div><ul class="oath-list">${items}</ul></div>`;
}

function renderLedger(s: ObservableState): string {
  const g = s.shadowking.grudge;
  const marked = g.map((v, i) => ({ v, i })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (marked.length === 0) return '';
  const items = marked
    .map(x => `<li>P${x.i + 1} ${tokenChip('skull', x.v, { stat: 'grudge', title: "the dark's grudge weight" })}</li>`)
    .join('');
  return `<div class="info-block"><div class="block-title">The Ledger (the dark hunts)</div><ul class="ledger-list">${items}</ul></div>`;
}

function renderWraiths(s: ObservableState): string {
  const w = s.shadowking.wraiths;
  if (w.length === 0) return '';
  const items = w.map(x => `<li>P${x.seat + 1} <small>(fell R${x.eliminatedRound})</small></li>`).join('');
  return `<div class="info-block"><div class="block-title">Wraiths (serve the dark)</div><ul class="wraith-list">${items}</ul></div>`;
}

function renderSuspicion(s: ObservableState, human: number): string {
  if (s.mode !== 'blood_pact' || s.suspicionLog.length === 0) return '';
  const rows = s.players.map(p => {
    const hist = s.suspicionLog.map(round => {
      const e = round.find(x => x.playerIndex === p.index);
      return `<span class="tier tier-${e?.tier ?? 'na'}" title="${e?.tier ?? 'n/a'}">${e ? TIER_GLYPH[e.tier] : '·'}</span>`;
    }).join('');
    return `<tr><td>P${p.index + 1}${p.index === human ? ' (you)' : ''}</td><td class="tier-row">${hist}</td></tr>`;
  }).join('');
  return `<div class="info-block"><div class="block-title">Suspicion Log (last ${s.suspicionLog.length} pledges)</div>
    <table class="suspicion"><tbody>${rows}</tbody></table>
    <div class="hint">∅ none · ▁ low · ▄ medium · █ high — a pattern of low/none is the traitor's tell.</div></div>`;
}

function renderAudits(s: ObservableState, human: number): string {
  if (s.mode !== 'blood_pact') return '';
  const mine = s.auditLog.filter(a => a.auditor === human);
  if (mine.length === 0) return '';
  const items = mine.slice(-6).map(a => `<li>R${a.round}: P${a.target + 1} pledged <b>${a.amount}</b> (${a.tier})</li>`).join('');
  return `<div class="info-block"><div class="block-title">Your audits</div><ul class="audit-list">${items}</ul></div>`;
}

function renderNarration(session: GameSession): string {
  const items = session.narration.map(n => `<li class="narr ${n.kind}">${esc(n.text)}</li>`).join('');
  const err = session.lastError ? `<div class="error">⛔ ${esc(session.lastError)}</div>` : '';
  return `${err}<ul class="narration">${items}</ul>`;
}

// ─── Phase-specific control panel ─────────────────────────────────

function renderPanel(session: GameSession, s: ObservableState): string {
  if (s.gameEndReason !== null) return renderGameOver(session);
  // A HALTED combat pre-empts everything (§5.3, T1-4): the human's stronghold is falling and the
  // engine is paused on its Last Stand — a BLOCKING prompt (every other command is rejected).
  if (s.pendingLastStand !== undefined && s.pendingLastStand.defenderIndex === session.humanIndex) {
    return renderLastStandPanel(session, s);
  }
  // A pending Death Bequest pre-empts everything: the human must name its exit beat first.
  if (session.awaitingBequest) return renderBequestPanel(session, s, true);
  switch (s.phase) {
    case 'THREAT': return renderThreatPanel(session, s);
    case 'PLEDGE': return renderPledgePanel(session, s);
    case 'ACTION': return renderActionPanel(session, s);
    case 'DAWN': return `<div class="panel"><div class="panel-title">Dawn — the realm settles…</div></div>`;
    default: return '';
  }
}

function renderThreatPanel(session: GameSession, s: ObservableState): string {
  // As a Wraith, the human sets its ONE afterlife input before letting the round begin.
  const wraith = session.isWraithWindow ? renderWraithPanel(session, s) : '';
  const label = session.isHumanAlive ? 'Face the threat →' : 'Let the round begin →';
  return `
    <div class="panel threat">
      <div class="panel-title">The dark gathers its will…</div>
      <div class="hint">The Shadowking's telegraph is revealed at the Pledge, where you can still hold it back.</div>
      ${wraith}
      <button class="primary" data-action="advance-threat">${label}</button>
    </div>`;
}

/** The eliminated human's Wraith input (§5.5, §13 P0-11) — ONE bounded afterlife nudge, via a cmd. */
function renderWraithPanel(session: GameSession, s: ObservableState): string {
  const chosen = session.wraithInput();
  const ammo = s.shadowking.strikePool.length;
  const sel = (k: string): string => (chosen === k ? ' selected' : '');
  const cardBtn = ammo > 0
    ? `<button class="wraith-btn${sel('card_add')}" data-action="set-wraith:card_add">Spend a strike-pool card — intensify the strike (${ammo} left)</button>`
    : `<button class="wraith-btn" disabled>No strike-pool ammo — nudge only</button>`;
  return `<div class="wraith-input">
    <div class="panel-subtitle">Your afterlife input (one per round):</div>
    ${cardBtn}
    <button class="wraith-btn${sel('nudge')}" data-action="set-wraith:nudge">Nudge the dark's grudge onto the leader</button>
    <div class="hint">${chosen ? `Chosen: <b>${chosen === 'card_add' ? 'card add' : 'grudge nudge'}</b>.` : 'Pick one, then let the round begin. (Unset ⇒ the dark decides for you.)'}</div>
  </div>`;
}

function renderPledgePanel(session: GameSession, s: ObservableState): string {
  const human = s.players[session.humanIndex];
  const t = s.shadowking.telegraph;
  const C = t ? t.doomCost + (t.wraithStrikeBonus ?? 0) : 0;
  const weight = session.humanPledgeWeight();
  const suggested = session.suggestedHumanPledge();
  const max = human.hand.length;

  const telegraph = t
    ? `<div class="villain-line">“${esc(t.firstPersonLine)}”</div>
       <div class="threat-detail">Effect <b>${esc(t.effect)}</b> · strikes <b>${esc(t.targetNodeId)}</b> · names <b>${t.struckPlayerIndex === null ? 'the realm' : `Player ${t.struckPlayerIndex + 1}`}</b>${t.wraithStrikeBonus ? ` · <b>+${t.wraithStrikeBonus}</b> wraith-fuelled` : ''}</div>`
    : '';

  const weightNote = weight < 1
    ? `<span class="discount">your cards count ×${weight} (${weight === TUNABLES.GAMBIT_SURCHARGE ? 'Gambit surcharge' : 'Crown discount'}) — ${max} → ${(max * weight).toFixed(1)}</span>`
    : `<span class="discount full">your cards count at full value</span>`;

  let buttons = '';
  for (let n = 0; n <= max; n++) {
    const eff = (n * weight).toFixed(weight === 1 ? 0 : 1);
    buttons += `<button class="pledge-btn${n === suggested ? ' suggested' : ''}" data-action="pledge:${n}">${n}<small>→${eff}</small></button>`;
  }

  return `
    <div class="panel pledge">
      <div class="panel-title">The Pledge — hold back the strike</div>
      ${telegraph}
      <div class="pledge-threshold">Table must reach <b>${C}</b> effective cards. ${weightNote}</div>
      <div class="pledge-grid">${buttons}</div>
      <div class="hint">Suggested: <b>${suggested}</b>. ${s.mode === 'blood_pact' ? 'Pledges are sealed — only the total is revealed.' : 'Pledges are open this round.'}</div>
    </div>`;
}

/** Full ACTION panel (§13 P0-11) — every legal verb as a control, with projected margins. */
function renderActionPanel(session: GameSession, s: ObservableState): string {
  if (!session.isHumanTurn) {
    return `<div class="panel"><div class="panel-title">Rivals are moving…</div></div>`;
  }
  const human = s.players[session.humanIndex];
  const here = human.warlordNodeId;
  const nodeDef = s.board.definition.nodes[here];
  const nodeState = s.board.state.nodes[here];
  const btns: string[] = [];

  // CLAIM
  const claimable = (nodeDef.tier === 'holding' || nodeDef.tier === 'forge') && nodeState.owner === null && !nodeState.ashed;
  if (claimable && human.banners >= TUNABLES.ACTION_BASE_COST) {
    btns.push(`<button data-action="claim">Claim this ${nodeDef.tier} (⚑${TUNABLES.ACTION_BASE_COST})</button>`);
  }

  // STRIKE the dark here — with projected margin.
  if (nodeState.shadowkingForces.length > 0) {
    const sp = session.strikeProjection();
    const verdict = sp.margin > 0 ? `win by ${sp.margin}` : `LOSE by ${-sp.margin}`;
    btns.push(`<button data-action="strike">Strike the dark here <small>(you ${sp.atkPower} vs ${sp.skPower} — projected ${verdict})</small></button>`);
  }

  // ASSAULT_HEART — Reckoning only, at the heart node, exposed.
  const heart = s.shadowking.heart;
  if (heart && heart.exposed && here === heart.nodeId) {
    const hp = session.heartProjection();
    btns.push(`<button data-action="assault-heart">⚔ Assault the dark's heart <small>(commit ~${hp?.commit ?? 0} vs ♥${heart.hp})</small></button>`);
  }

  // RAID — the capture ELECTION, gated by the projected margin (§5.2 / §13 P0-11).
  btns.push(...renderRaidElection(session, s, here));

  // RANSOM — any captive the human can reach (owner, or Warlord at/adjacent the captor's hold).
  btns.push(...renderRansom(session, s, here));

  // Herald verbs (T2-3): only when the ADVANCED toggle is on — the default 3-archetype game
  // never shows RECRUIT / PARLEY / March-Herald (the whole concept stays out of the first game).
  if (s.heraldEnabled) {
    // RECRUIT a Herald — commit to the political build (martial → political).
    if (human.stance !== 'political' && human.banners >= HERALD_RECRUIT_COST) {
      btns.push(`<button data-action="recruit">Recruit a Herald (⚑${HERALD_RECRUIT_COST}) — political build</button>`);
    }

    // PARLEY — the Herald pushes back the dark, but only from a blighted front.
    if (human.stance === 'political' && human.heraldNodeId !== null && parleyReachable(s, human.heraldNodeId)) {
      btns.push(`<button data-action="parley">Parley — push back the dark (Herald at ${esc(human.heraldNodeId)})</button>`);
    }

    // MARCH the Herald toward the front (independent of the Warlord).
    if (human.heraldNodeId !== null) {
      for (const adj of s.board.definition.nodes[human.heraldNodeId].connections) {
        if (s.board.state.nodes[adj]?.ashed) continue;
        btns.push(`<button data-action="herald-march:${adj}">March Herald → ${esc(adj)}</button>`);
      }
    }
  }

  // Oaths — SWEAR (free) / BREAK.
  const myOath = findOath(s.oaths, session.humanIndex);
  if (!myOath) {
    for (const p of s.players) {
      if (p.index === session.humanIndex || p.isEliminated || findOath(s.oaths, p.index)) continue;
      btns.push(`<button data-action="swear:${p.index}">Swear an Oath with P${p.index + 1} (free)</button>`);
    }
  } else if (s.round > myOath.swornRound) {
    btns.push(`<button data-action="break-oath">Break your Oath with P${oathPartner(myOath, session.humanIndex) + 1} (betray)</button>`);
  }

  // AUDIT (Blood Pact).
  if (s.mode === 'blood_pact' && human.banners >= TUNABLES.AUDIT_COST && s.pledgeHistory.length > 0) {
    for (const p of s.players) {
      if (p.index === session.humanIndex || p.isEliminated) continue;
      btns.push(`<button data-action="audit:${p.index}">Audit P${p.index + 1} (⚑${TUNABLES.AUDIT_COST})</button>`);
    }
  }

  // MARCH cost readout per adjacent node (Forge tolls + ash surcharge made visible).
  const adjCosts = nodeDef.connections.map(adj => {
    const ns = s.board.state.nodes[adj];
    const adjDef = s.board.definition.nodes[adj];
    let cost = TUNABLES.ACTION_BASE_COST;
    if (ns?.ashed) cost += TUNABLES.ASHED_TRAVERSE_EXTRA_COST;
    let toll = 0;
    if (adjDef.tier === 'forge' && ns && ns.owner !== null && ns.owner !== session.humanIndex && !ns.ashed) {
      toll = TUNABLES.FORGE_TOLL_COST;
    }
    const tollNote = toll > 0 ? ` <span class="toll">+${toll} toll→P${(ns!.owner ?? 0) + 1}</span>` : '';
    return `<li>${esc(adj)} <b>⚑${cost + toll}</b>${tollNote}</li>`;
  }).join('');

  const marchHint = `<div class="hint">Click an adjacent board node to <b>March</b> your Warlord. From <b>${esc(here)}</b>:<ul class="adj-costs">${adjCosts}</ul></div>`;
  const bequest = (session.exposure(session.humanIndex) === 'can-be-deposed' || session.exposure(session.humanIndex) === 'deposed')
    ? renderBequestPanel(session, s, false) : '';
  const accuse = s.mode === 'blood_pact' ? renderAccusePanel(session, s) : '';

  return `
    <div class="panel action">
      <div class="panel-title">Your turn — ${tokenChip('action', human.actionsRemaining, { stat: 'actions', title: 'actions remaining this turn' })} ${tokenChip('banner', human.banners, { stat: 'banners', title: 'your banners' })} · ${human.stance === 'political' ? '🕊 political' : '⚔ martial'}</div>
      ${marchHint}
      <div class="action-btns">${btns.join('')}</div>
      <button class="end-turn" data-action="pass">End turn</button>
      ${bequest}
      ${accuse}
    </div>`;
}

/** RAID capture ELECTION for any co-located rival, gated by the projected combat margin (§13 P0-11). */
function renderRaidElection(session: GameSession, s: ObservableState, here: string): string[] {
  const out: string[] = [];
  const nodePieces = s.board.state.nodes[here]?.pieces ?? [];
  const rivals = new Set<number>();
  for (const p of nodePieces) if (p.owner !== session.humanIndex) rivals.add(p.owner);
  for (const rival of rivals) {
    if (s.players[rival].isEliminated) continue;
    if (findOath(s.oaths, session.humanIndex) && findOath(s.oaths, rival)
      && oathPartner(findOath(s.oaths, session.humanIndex)!, session.humanIndex) === rival) {
      out.push(`<div class="raid-block"><b>P${rival + 1}</b> is here — but you are sworn (Break your Oath to raid).</div>`);
      continue;
    }
    const pr = session.raidProjection(rival);
    const verdict = pr.margin > 0 ? `projected win by ${pr.margin}` : `projected LOSE by ${-pr.margin}`;
    const elects: string[] = [];
    if (pr.takeLand) elects.push(`<button data-action="raid:TAKE_LAND:${rival}">→ take land</button>`);
    if (pr.rout) elects.push(`<button data-action="raid:ROUT_PIECE:${rival}">→ rout a retainer</button>`);
    if (pr.capture) elects.push(`<button data-action="raid:CAPTURE_PIECE:${rival}">⛓ → capture a retainer</button>`);
    else elects.push(`<button disabled title="win by ≥ ${pr.captureMargin} to capture">⛓ capture (need margin ${pr.captureMargin})</button>`);
    if (!pr.takeLand && !pr.rout) {
      // Still let the human commit a (likely losing) raid — the engine resolves it honestly.
      // Under the Whisper last-stronghold gate (§13 P0-10) TAKE_LAND is ILLEGAL, so the
      // fallback elect is a ROUT (when a retainer stands); with neither, no raid is possible.
      if (!pr.landGated) {
        elects.push(`<button data-action="raid:TAKE_LAND:${rival}">→ raid anyway</button>`);
      } else if (pr.routLegal) {
        elects.push(`<button data-action="raid:ROUT_PIECE:${rival}">→ raid anyway (rout)</button>`);
      }
    }
    const gateNote = pr.landGated
      ? `<div class="hint">Whisper protects P${rival + 1}'s LAST stronghold — their land cannot be taken before March.</div>`
      : '';
    out.push(`<div class="raid-block">
      <div class="raid-head">Raid <b>P${rival + 1}</b> — you ${pr.atkPower} vs ${pr.defPower} (${verdict})</div>
      <div class="raid-elects">${elects.join('')}</div>
      ${gateNote}
    </div>`);
  }
  return out;
}

/** RANSOM controls — a captive the human owns, or one whose captor is in reach (§5.3). */
function renderRansom(session: GameSession, s: ObservableState, here: string): string[] {
  const out: string[] = [];
  const human = s.players[session.humanIndex];
  for (const c of s.captives) {
    const isOwner = c.ownerSeat === session.humanIndex;
    const captorHold = s.players[c.captorSeat].warlordNodeId;
    const inReach = here === captorHold || adjacent(s, here, captorHold);
    if (!isOwner && !inReach) continue;
    const affordable = human.hand.length >= TUNABLES.RANSOM_COST && human.banners >= TUNABLES.RANSOM_BANNERS;
    const piece = s.players[c.ownerSeat].court.find(x => x.id === c.pieceId);
    const who = piece ? `${piece.name} (${piece.archetype})` : 'piece';
    const label = `${isOwner ? 'Ransom back' : `Ransom P${c.ownerSeat + 1}'s`} ${who} from P${c.captorSeat + 1} (${TUNABLES.RANSOM_COST} cards, ⚑${TUNABLES.RANSOM_BANNERS})`;
    out.push(`<button data-action="ransom:${c.pieceId}" ${affordable ? '' : 'disabled title="need cards + banners"'}>${esc(label)}</button>`);
  }
  return out;
}

/** Is a blighted (non-ashed) front on or adjacent to the Herald's node? (PARLEY reach.) */
function parleyReachable(s: ObservableState, heraldNode: string): boolean {
  const candidates = [heraldNode, ...s.board.definition.nodes[heraldNode].connections];
  return candidates.some(id => {
    const ns = s.board.state.nodes[id];
    return ns && !ns.ashed && ns.blightLevel > 0;
  });
}

/**
 * The BLOCKING Last Stand prompt (§5.3, backlog T1-4): the human's stronghold is falling — pick
 * 0..hand extra cards to pour in, see the projected totals live, and commit. Committed cards are
 * destroyed: they are next round's Pledge cards. Ties go to the defender (§5.3).
 */
function renderLastStandPanel(session: GameSession, s: ObservableState): string {
  const p = s.pendingLastStand!;
  const remaining = session.lastStandRemainingHand();
  const chosen = session.lastStandSelectedValues();
  const committed = chosen.reduce((a, b) => a + b, 0);
  const projected = p.defensePower + committed;
  const holds = projected >= p.attackPower; // ties go to the defender in a Last Stand

  const cards = remaining.map((v, i) => {
    const sel = session.lastStandSelection.includes(i) ? ' selected' : '';
    // The interactive last-stand card is the generator face inside the toggle button (T-204).
    return `<button class="card-face-btn${sel}" data-action="laststand-toggle:${i}">${powerCardFace(v)}</button>`;
  }).join('');

  const verdict = holds
    ? `<b class="hold">you HOLD ${esc(p.nodeId)}</b> (${projected} vs ${p.attackPower} — ties go to the defender)`
    : `<b class="fall">the stronghold FALLS</b> (${projected} vs ${p.attackPower})`;
  const commitLabel = chosen.length === 0
    ? 'Yield — commit nothing'
    : `Commit ${chosen.length} card${chosen.length === 1 ? '' : 's'} (+${committed})`;

  return `<div class="panel laststand blocking">
    <div class="panel-title">🛡 LAST STAND — Player ${p.attackerIndex + 1} is taking ${esc(p.nodeId)}</div>
    <div class="raid-head">Their ${p.attackPower} vs your ${p.defensePower} — pour in extra cards to reverse it.</div>
    <div class="ls-cards">${cards.length > 0 ? cards : '<i>no cards left</i>'}</div>
    <div class="ls-projection">Projected: ${verdict}</div>
    <div class="hint warning">⚠ Committed cards are DESTROYED — these are next round's Pledge cards. Spend them here and the dark's strike gets harder to hold.</div>
    <button class="primary" data-action="laststand-commit">${commitLabel}</button>
  </div>`;
}

/** The DEATH BEQUEST panel (§5.5, §13 P0-11): bequeath to a standing ally, or lay a death-curse. */
function renderBequestPanel(session: GameSession, s: ObservableState, blocking: boolean): string {
  const me = session.humanIndex;
  const oath = findOath(s.oaths, me);
  const ally = oath ? oathPartner(oath, me) : null;
  const allyLiving = ally !== null && !s.players[ally].isEliminated;
  const current = session.pendingBequest();

  const opts: string[] = [];
  if (allyLiving) {
    if (s.players[me].hand.length > 0) {
      opts.push(`<button data-action="bequest-cards:${ally}">Bequeath your cards to P${ally! + 1}</button>`);
    }
    for (const c of s.captives.filter(c => c.captorSeat === me && c.ownerSeat !== ally)) {
      const piece = s.players[c.ownerSeat].court.find(x => x.id === c.pieceId);
      const who = piece ? `${esc(piece.name)} the ${piece.archetype}` : 'piece';
      opts.push(`<button data-action="bequest-captive:${c.pieceId}:${ally}">Bequeath ${who} (of P${c.ownerSeat + 1}) to P${ally! + 1}</button>`);
    }
  }
  for (const p of s.players) {
    if (p.index === me || p.isEliminated) continue;
    opts.push(`<button data-action="bequest-curse:${p.index}">☠ Death-curse P${p.index + 1}</button>`);
  }
  opts.push(`<button data-action="bequest-curse:none">Fall silently (no curse)</button>`);

  const chosen = current
    ? `<div class="hint">Recorded: <b>${describeBequest(current)}</b>.</div>`
    : `<div class="hint">${allyLiving ? 'Reward your ally, or' : 'You hold no standing ally —'} mark a rival for the dark.</div>`;

  return `<div class="panel bequest${blocking ? ' blocking' : ''}">
    <div class="panel-title">${blocking ? '☠ You fall this Dawn — your final act' : 'Your will (you are in the dark\'s reach)'}</div>
    <div class="action-btns">${opts.join('')}</div>
    ${chosen}
    ${blocking && current ? '<div class="hint">The flow resumes once you have chosen. Change it above if you wish.</div>' : ''}
  </div>`;
}

function describeBequest(c: BequestChoiceInput): string {
  switch (c.kind) {
    case 'bequeath_cards': return `bequeath cards to P${c.beneficiary + 1}`;
    case 'bequeath_captive': return `bequeath a captive to P${c.beneficiary + 1}`;
    case 'death_curse': return c.target === null ? 'fall without a curse' : `death-curse P${c.target + 1}`;
  }
}

function renderAccusePanel(session: GameSession, s: ObservableState): string {
  if (s.bloodPactExposed) return `<div class="accuse"><div class="panel-title">Traitor exposed.</div></div>`;
  const acc = s.accusationState;
  if (acc && !acc.resolved) {
    const votes = acc.votes.map(v => `P${v.playerIndex + 1} ${v.agree ? '✓' : '✗'}`).join(' · ');
    return `<div class="accuse"><div class="panel-title">Accusation: P${acc.accuser + 1} → P${acc.accused + 1}</div>
      <div class="hint">Votes (all must agree): ${votes || '—'}</div></div>`;
  }
  const locked = s.round < s.accusationLockoutUntilRound;
  const opts = s.players
    .filter(p => p.index !== session.humanIndex && !p.isEliminated)
    .map(p => `<button class="accuse-btn" data-action="accuse:${p.index}" ${locked ? 'disabled' : ''}>Accuse P${p.index + 1}</button>`)
    .join('');
  const note = locked ? `<div class="hint">Accusations locked until round ${s.accusationLockoutUntilRound}.</div>` : '';
  return `<div class="accuse"><div class="panel-title">Blood Pact — name the traitor</div><div class="action-btns">${opts}</div>${note}</div>`;
}

function renderGameOver(session: GameSession): string {
  return `
    <div class="panel game-over">
      <div class="panel-title">Game over</div>
      <div class="ending">${esc(session.describeEnding())}</div>
      <button class="primary" data-action="new-game">New game</button>
    </div>`;
}
