/**
 * View — render-from-state HUD, phase panels, and input wiring (Stage 3e).
 *
 * `mountView` attaches a single delegated click handler and re-renders the whole
 * app from `session.state` on every change. Inputs map to `data-action` / data-
 * node attributes; the handler translates them into the session's reducer-routed
 * methods. The view NEVER mutates GameState directly.
 *
 * Legibility beats (STRESS-TEST §P2): the Pledge shows the Crown discount at
 * commit time, the resolution renders a threshold beat, every node carries a
 * blightLevel pip ladder, a Gambit alarm banner spans the top when contested,
 * and the villain's voice has its own narration layer.
 */

import type { GameSession } from './session.js';
import { renderBoard, PLAYER_COLORS } from './board-view.js';
import {
  areAdjacent,
  hasRivalAtNode,
  hasSKForcesAtNode,
  TUNABLES,
  type GameState,
} from '../v2/index.js';
import { findOath, parleyTarget } from '../v2/actions.js';
import { getTunables } from '../v2/tunables.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function oathPartner(oath: { a: number; b: number }, me: number): number {
  return oath.a === me ? oath.b : oath.a;
}

const TIER_GLYPH: Record<string, string> = { none: '∅', low: '▁', medium: '▄', high: '█' };

/** Living, owned production (Holdings + weighted Forges) for the standings. */
function territoryOf(state: GameState, idx: number): number {
  let t = 0;
  for (const [id, ns] of Object.entries(state.board.state.nodes)) {
    if (ns.owner !== idx || ns.ashed) continue;
    const tier = state.board.definition.nodes[id].tier;
    if (tier === 'forge') t += TUNABLES.FORGE_WEIGHT;
    else if (tier === 'keep' || tier === 'holding') t += 1;
  }
  return t;
}

export function mountView(root: HTMLElement, session: GameSession): void {
  const render = (): void => { root.innerHTML = renderApp(session); };
  session.onChange = render;

  root.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest('[data-action],[data-node]') as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    const node = target.getAttribute('data-node');

    if (node && session.isHumanTurn) {
      session.humanAction({
        type: 'PLAYER_ACTION',
        playerIndex: session.humanIndex,
        action: { type: 'MARCH', targetNodeId: node },
      });
      return;
    }
    if (!action) return;

    const [verb, arg] = action.split(':');
    const h = session.humanIndex;
    const act = (a: import('../v2/index.js').PlayerAction): void =>
      session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: a });
    switch (verb) {
      case 'advance-threat': session.advanceFromThreat(); break;
      case 'pledge': session.submitHumanPledge(Number(arg)); break;
      case 'claim': act({ type: 'CLAIM' }); break;
      case 'strike': act({ type: 'STRIKE' }); break;
      case 'pass': act({ type: 'PASS' }); break;
      case 'raid': act({ type: 'RAID', targetPlayerIndex: Number(arg) }); break;
      case 'rescue': act({ type: 'RESCUE', targetPlayerIndex: Number(arg) }); break;
      case 'audit': act({ type: 'AUDIT', targetPlayerIndex: Number(arg) }); break;
      case 'recruit': act({ type: 'RECRUIT' }); break;
      case 'parley': act({ type: 'PARLEY' }); break;
      case 'swear': act({ type: 'SWEAR_OATH', targetPlayerIndex: Number(arg) }); break;
      case 'break-oath': act({ type: 'BREAK_OATH' }); break;
      case 'herald-march': act({ type: 'MARCH', targetNodeId: arg, pieceId: 'herald' }); break;
      case 'accuse': session.humanAccuse(Number(arg)); break;
      case 'new-game': location.reload(); break;
    }
  });

  render();
}

// ─── Top-level layout ─────────────────────────────────────────────

export function renderApp(session: GameSession): string {
  const s = session.state;
  return `
    ${renderGambitBanner(s)}
    <div class="layout">
      <div class="board-pane">${renderBoard(s)}</div>
      <aside class="side-pane">
        ${renderHeader(s)}
        ${renderStandings(s, session.humanIndex)}
        ${renderHand(s, session.humanIndex)}
        ${renderPanel(session)}
        ${renderOaths(s)}
        ${renderLedger(s)}
        ${renderSuspicion(s, session.humanIndex)}
        ${renderAudits(s, session.humanIndex)}
        ${renderNarration(session)}
      </aside>
    </div>`;
}

function renderGambitBanner(s: GameState): string {
  if (!s.gambit) return '';
  const who = s.gambit.claimant + 1;
  const status = s.gambit.named ? 'NAMED — survive this Dawn to win' : 'seized — declared at Dawn';
  return `<div class="gambit-alarm">⚠ CROWN'S GAMBIT — Player ${who} on the Keystone (${status})</div>`;
}

function renderHeader(s: GameState): string {
  const sk = s.shadowking;
  return `
    <div class="header">
      <div class="title">Iron Throne of Ashes</div>
      <div class="clock">Round ${s.round}/${TUNABLES.ROUND_CAP} · Act <b>${s.act}</b> · Phase <b>${s.phase}</b></div>
      <div class="sk-meter">Dark patience ${sk.patience}/${TUNABLES.PATIENCE_CAP}${s.mode === 'blood_pact' ? ' · <b>Blood Pact</b>' : ''}</div>
    </div>`;
}

function renderStandings(s: GameState, human: number): string {
  const brk = TUNABLES.BREAK_THRESHOLD;
  const rows = s.players.map(p => {
    const color = PLAYER_COLORS[p.index];
    const tags: string[] = [];
    if (p.crownHeld) tags.push('<span class="tag crown">♛</span>');
    if (p.isBroken) tags.push('<span class="tag broken">Broken</span>');
    else if (p.wounds > 0) tags.push(`<span class="tag wounds" title="wounds toward Break">${p.wounds}/${brk}✕</span>`);
    tags.push(p.stance === 'political' ? '<span class="tag stance">🕊</span>' : '<span class="tag stance">⚔</span>');
    const oath = findOath(s, p.index);
    if (oath) { tags.push(`<span class="tag oath" title="sworn">⛓P${oathPartner(oath, p.index) + 1}</span>`); }
    const g = s.shadowking.grudge[p.index] ?? 0;
    if (g > 0) tags.push(`<span class="tag grudge" title="the dark's Ledger — hunted">☠${g}</span>`);
    if (p.index === human) tags.push('<span class="tag you">You</span>');
    return `
      <tr>
        <td><span class="dot" style="background:${color}"></span>P${p.index + 1}</td>
        <td>${territoryOf(s, p.index)}</td>
        <td>${p.banners}</td>
        <td>${p.hand.length}</td>
        <td class="tags">${tags.join(' ')}</td>
      </tr>`;
  }).join('');
  return `
    <table class="standings">
      <thead><tr><th>Warlord</th><th>Land</th><th>⚑</th><th>Hand</th><th>State</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** The human's actual hand (card values) — needed to read pledge/combat strength. */
function renderHand(s: GameState, human: number): string {
  const hand = s.players[human].hand;
  if (hand.length === 0) return `<div class="hand"><span class="hand-label">Your hand:</span> <i>empty</i></div>`;
  const cards = hand.map(v => `<span class="card">${v}</span>`).join('');
  return `<div class="hand"><span class="hand-label">Your hand (${hand.length}):</span> ${cards}</div>`;
}

/** The Oaths in force (the social spine) — who is sworn to whom + rounds to maturity. */
function renderOaths(s: GameState): string {
  if (s.oaths.length === 0) return '';
  const dur = TUNABLES.OATH_DURATION;
  const items = s.oaths.map(o =>
    `<li>P${o.a + 1} ⛓ P${o.b + 1} <small>(matures in ${Math.max(0, dur - o.strain)})</small></li>`).join('');
  return `<div class="info-block"><div class="block-title">Oaths</div><ul class="oath-list">${items}</ul></div>`;
}

/** The dark's Ledger — per-player grudge weight (who the Shadowking hunts). */
function renderLedger(s: GameState): string {
  const g = s.shadowking.grudge;
  const marked = g.map((v, i) => ({ v, i })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (marked.length === 0) return '';
  const items = marked.map(x => `<li>P${x.i + 1} <b>${x.v}</b></li>`).join('');
  return `<div class="info-block"><div class="block-title">The Ledger (the dark hunts)</div><ul class="ledger-list">${items}</ul></div>`;
}

/** Blood Pact — the Suspicion Log (per-player pledge-tier history, the deduction surface). */
function renderSuspicion(s: GameState, human: number): string {
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

/** Blood Pact — what your Audits revealed (your paid evidence). */
function renderAudits(s: GameState, human: number): string {
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

function renderPanel(session: GameSession): string {
  const s = session.state;
  if (s.gameEndReason !== null) return renderGameOver(session);
  switch (s.phase) {
    case 'THREAT': return renderThreatPanel(s);
    case 'PLEDGE': return renderPledgePanel(session);
    case 'ACTION': return renderActionPanel(session);
    default: return '';
  }
}

/**
 * Whisper-act onboarding (STRESS-TEST §P2): during Act WHISPER (the opening
 * rounds), a coach explains the core verbs before the table tightens. Returns ''
 * once the dark escalates past WHISPER.
 */
function coachTip(s: GameState, where: 'threat' | 'pledge', crownHeld: boolean): string {
  if (s.act !== 'WHISPER') return '';
  let body: string;
  if (where === 'threat') {
    body = `The dark <b>telegraphs</b> every strike before it lands — usually at whoever leads. Next you'll <b>Pledge</b> cards to blunt it.`;
  } else if (crownHeld) {
    body = `You hold the <b>Crown</b>, so your pledged cards count for less (the leader pays a surcharge) — and the dark hunts you. Leading is dangerous.`;
  } else {
    body = `Pledge cards toward the <b>threshold</b>. Partial pledges still help — the block is proportional, and free-riding lets the strike through.`;
  }
  return `<div class="coach"><span class="coach-tag">Whisper</span> ${body}</div>`;
}

function renderThreatPanel(s: GameState): string {
  const t = s.shadowking.telegraph;
  if (!t) {
    return `<div class="panel"><button class="primary" data-action="advance-threat">Reveal the dark's intent →</button></div>`;
  }
  const target = t.struckPlayerIndex === null ? 'the realm' : `Player ${t.struckPlayerIndex + 1}`;
  return `
    <div class="panel threat">
      <div class="villain-line">“${esc(t.firstPersonLine)}”</div>
      <div class="threat-detail">Strikes <b>${esc(t.targetNodeId)}</b> · names <b>${target}</b> · threshold <b>${t.doomCost}</b></div>
      ${coachTip(s, 'threat', false)}
      <button class="primary" data-action="advance-threat">To the Pledge →</button>
    </div>`;
}

function renderPledgePanel(session: GameSession): string {
  const s = session.state;
  const human = s.players[session.humanIndex];
  const t = s.shadowking.telegraph;
  const C = t ? t.doomCost : 0;
  const weight = session.humanPledgeWeight();
  const suggested = session.suggestedHumanPledge();
  const max = human.hand.length;

  const weightNote = weight < 1
    ? `<span class="discount">your cards count ×${weight} (${weight === 0.25 ? 'Gambit surcharge' : 'Crown discount'}) — ${max} → ${(max * weight).toFixed(1)}</span>`
    : `<span class="discount full">your cards count at full value</span>`;

  let buttons = '';
  for (let n = 0; n <= max; n++) {
    const eff = (n * weight).toFixed(weight === 1 ? 0 : 1);
    buttons += `<button class="pledge-btn${n === suggested ? ' suggested' : ''}" data-action="pledge:${n}">${n}<small>→${eff}</small></button>`;
  }

  return `
    <div class="panel pledge">
      <div class="panel-title">The Pledge — hold back the strike</div>
      <div class="pledge-threshold">Table must reach <b>${C}</b> effective cards. ${weightNote}</div>
      <div class="pledge-grid">${buttons}</div>
      <div class="hint">Suggested: <b>${suggested}</b>. ${s.mode === 'blood_pact' ? 'Pledges are sealed — only the total is revealed.' : 'Pledges are open this round.'}</div>
      ${coachTip(s, 'pledge', human.crownHeld)}
    </div>`;
}

function renderActionPanel(session: GameSession): string {
  const s = session.state;
  if (!session.isHumanTurn) {
    return `<div class="panel"><div class="panel-title">Rivals are moving…</div></div>`;
  }
  const t = getTunables();
  const human = s.players[session.humanIndex];
  const here = human.warlordNodeId;
  const nodeDef = s.board.definition.nodes[here];
  const nodeState = s.board.state.nodes[here];

  const btns: string[] = [];

  // CLAIM
  const claimable = (nodeDef.tier === 'holding' || nodeDef.tier === 'forge') && nodeState.owner === null && !nodeState.ashed;
  if (claimable && human.banners >= 1) btns.push(`<button data-action="claim">Claim this ${nodeDef.tier} (⚑1)</button>`);

  // STRIKE
  if (hasSKForcesAtNode(s, here)) btns.push(`<button data-action="strike">Strike the dark here</button>`);

  // RAID
  const rival = hasRivalAtNode(s, session.humanIndex, here);
  if (rival !== null) btns.push(`<button data-action="raid:${rival}">Raid Player ${rival + 1}</button>`);

  // RESCUE (co-located or adjacent Broken ally)
  for (const p of s.players) {
    if (p.index === session.humanIndex || !p.isBroken) continue;
    if (p.warlordNodeId === here || areAdjacent(s, here, p.warlordNodeId)) {
      btns.push(`<button data-action="rescue:${p.index}">Rescue Player ${p.index + 1} (${t.RESCUE_COST} cards)</button>`);
    }
  }

  // RECRUIT a Herald — commit to the political build (martial → political).
  if (human.stance !== 'political' && human.banners >= t.HERALD_RECRUIT_COST) {
    btns.push(`<button data-action="recruit">Recruit a Herald (⚑${t.HERALD_RECRUIT_COST}) — political build</button>`);
  }

  // PARLEY — the Herald (lone runner) pushes back the dark, but only from the front.
  if (human.stance === 'political' && human.heraldNodeId !== null && parleyTarget(s, session.humanIndex) !== null) {
    btns.push(`<button data-action="parley">Parley — push back the dark (Herald at ${esc(human.heraldNodeId)})</button>`);
  }

  // MARCH HERALD — move the lone runner toward the front (independent of the Warlord).
  if (human.heraldNodeId !== null) {
    for (const adj of s.board.definition.nodes[human.heraldNodeId].connections) {
      if (s.board.state.nodes[adj]?.ashed) continue;
      btns.push(`<button data-action="herald-march:${adj}">March Herald → ${esc(adj)}</button>`);
    }
  }

  const myOath = findOath(s, session.humanIndex);

  // SWEAR_OATH — a free public pact with any oath-free, unbroken rival (the social spine).
  if (myOath === null) {
    for (const p of s.players) {
      if (p.index === session.humanIndex || p.isBroken || findOath(s, p.index) !== null) continue;
      btns.push(`<button data-action="swear:${p.index}">Swear an Oath with P${p.index + 1} (free)</button>`);
    }
  }

  // BREAK_OATH — betray a sworn ally (after at least one Dawn): a banner burst + the dark's Ledger.
  if (myOath !== null && s.round > myOath.swornRound) {
    btns.push(`<button data-action="break-oath">Break your Oath with P${oathPartner(myOath, session.humanIndex) + 1} (betray)</button>`);
  }

  // AUDIT (Blood Pact)
  if (s.mode === 'blood_pact' && human.banners >= TUNABLES.AUDIT_COST && s.pledgeHistory.length > 0) {
    for (const p of s.players) {
      if (p.index === session.humanIndex) continue;
      btns.push(`<button data-action="audit:${p.index}">Audit Player ${p.index + 1} (⚑${TUNABLES.AUDIT_COST})</button>`);
    }
  }

  // March cost readout per adjacent node (Forge tolls + ash surcharge made visible).
  const adjCosts = nodeDef.connections.map(adj => {
    const ns = s.board.state.nodes[adj];
    const adjDef = s.board.definition.nodes[adj];
    let cost = 1;
    if (ns?.ashed) cost += TUNABLES.ASHED_TRAVERSE_EXTRA_COST;
    let toll = 0;
    if (adjDef.tier === 'forge' && ns && ns.owner !== null && ns.owner !== session.humanIndex && !ns.ashed) {
      toll = t.FORGE_TOLL_COST; // (waived for sworn allies — engine enforces)
    }
    const tollNote = toll > 0 ? ` <span class="toll">+${toll} toll→P${(ns!.owner ?? 0) + 1}</span>` : '';
    return `<li>${esc(adj)} <b>⚑${cost + toll}</b>${tollNote}</li>`;
  }).join('');

  const marchHint = `<div class="hint">Click an adjacent node to <b>March</b> your Warlord. At <b>${esc(here)}</b>:<ul class="adj-costs">${adjCosts}</ul></div>`;
  const accuse = s.mode === 'blood_pact' ? renderAccusePanel(session) : '';

  return `
    <div class="panel action">
      <div class="panel-title">Your turn — ${human.actionsRemaining} action${human.actionsRemaining === 1 ? '' : 's'} · ⚑${human.banners} · ${human.stance === 'political' ? '🕊 political' : '⚔ martial'}</div>
      ${marchHint}
      <div class="action-btns">${btns.join('')}</div>
      <button class="end-turn" data-action="pass">End turn</button>
      ${accuse}
    </div>`;
}

function renderAccusePanel(session: GameSession): string {
  const s = session.state;
  if (s.bloodPactExposed) return `<div class="accuse"><div class="panel-title">Traitor exposed.</div></div>`;
  // A live accusation in progress — show who's voting which way (unanimity needed to convict).
  const acc = s.accusationState;
  if (acc && !acc.resolved) {
    const votes = acc.votes.map(v => `P${v.playerIndex + 1} ${v.agree ? '✓' : '✗'}`).join(' · ');
    return `<div class="accuse"><div class="panel-title">Accusation: P${acc.accuser + 1} → P${acc.accused + 1}</div>
      <div class="hint">Votes (all must agree): ${votes || '—'}</div></div>`;
  }
  const locked = s.round < s.accusationLockoutUntilRound;
  const opts = s.players
    .filter(p => p.index !== session.humanIndex)
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
