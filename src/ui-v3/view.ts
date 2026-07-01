/**
 * View (v3) — render-from-state HUD, phase panels, and phase-flow input wiring
 * (Stage 3i-a scaffold).
 *
 * `mountView` attaches a single delegated click handler and re-renders the whole
 * app from `session.observable()` (the fog-applied §7 D2 projection) on every
 * change. The view NEVER mutates GameState directly and NEVER reads full state —
 * it renders only what the human is entitled to see.
 *
 * 3i-a wires the phase FLOW (reveal threat → pledge → end turn) so all four phase
 * panels render and the round loop turns; the human ACTION verbs (MARCH / CLAIM /
 * RAID / RANSOM / ASSAULT_HEART / oaths / audit) land in 3i-b.
 */

import type { GameSession } from './session.js';
import { renderBoard, PLAYER_COLORS } from './board-view.js';
import {
  TUNABLES,
  type Archetype,
  type ObservableState,
  type Oath,
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

const TIER_GLYPH: Record<string, string> = { none: '∅', low: '▁', medium: '▄', high: '█' };
const ARCH_SHORT: Record<Archetype, string> = {
  warlord: '♟W', marshal: '⚔M', steward: '⚖S', herald: '✉H',
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
  const render = (): void => { root.innerHTML = renderApp(session); };
  session.onChange = render;

  root.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (!action) return;

    const [verb, arg] = action.split(':');
    switch (verb) {
      case 'advance-threat': session.advanceFromThreat(); break;
      case 'pledge': session.submitHumanPledge(Number(arg)); break;
      case 'pass':
        session.humanAction({ type: 'PLAYER_ACTION', playerIndex: session.humanIndex, action: { type: 'PASS' } });
        break;
      case 'accuse': session.humanAccuse(Number(arg)); break;
      case 'new-game': location.reload(); break;
    }
  });

  render();
}

// ─── Top-level layout ─────────────────────────────────────────────

export function renderApp(session: GameSession): string {
  const s = session.observable();
  return `
    ${renderGambitBanner(s)}
    <div class="layout">
      <div class="board-pane">${renderBoard(s)}</div>
      <aside class="side-pane">
        ${renderHeader(s)}
        ${renderStandings(s, session.humanIndex)}
        ${renderCourt(s, session.humanIndex)}
        ${renderHand(s, session.humanIndex)}
        ${renderPanel(session, s)}
        ${renderOaths(s)}
        ${renderLedger(s)}
        ${renderSuspicion(s, session.humanIndex)}
        ${renderAudits(s, session.humanIndex)}
        ${renderNarration(session)}
      </aside>
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
  const heart = sk.heart ? ` · <b>Heart ♥${sk.heart.hp}</b>` : '';
  return `
    <div class="header">
      <div class="title">Iron Throne of Ashes</div>
      <div class="clock">Round ${s.round}/${TUNABLES.ROUND_CAP} · Act <b>${s.act}</b> · Phase <b>${s.phase}</b>${heart}</div>
      <div class="sk-meter">Dark patience ${sk.patience}/${TUNABLES.PATIENCE_CAP}${s.mode === 'blood_pact' ? ' · <b>Blood Pact</b>' : ''} · Strike pool ${sk.strikePool.length}</div>
    </div>`;
}

function renderStandings(s: ObservableState, human: number): string {
  const rows = s.players.map(p => {
    const color = PLAYER_COLORS[p.index];
    const tags: string[] = [];
    if (p.crownHeld) tags.push('<span class="tag crown">♛</span>');
    if (p.isEliminated) tags.push('<span class="tag broken">Eliminated</span>');
    else if (p.deposed) tags.push('<span class="tag wounds" title="flagged for deposal at Dawn">deposed</span>');
    tags.push(p.stance === 'political' ? '<span class="tag stance">🕊</span>' : '<span class="tag stance">⚔</span>');
    const oath = findOath(s.oaths, p.index);
    if (oath) tags.push(`<span class="tag oath" title="sworn">⛓P${oathPartner(oath, p.index) + 1}</span>`);
    const g = s.shadowking.grudge[p.index] ?? 0;
    if (g > 0) tags.push(`<span class="tag grudge" title="the dark's Ledger — hunted">☠${g}</span>`);
    // Only surface the traitor flag for the human's OWN seat (never leak rivals' secret, §7 D2).
    if (p.index === human && p.hasBloodPact) tags.push('<span class="tag grudge" title="you hold the Blood Pact">traitor</span>');
    if (p.index === human) tags.push('<span class="tag you">You</span>');
    const living = p.court.filter(c => c.captiveOf === null).length;
    return `
      <tr class="${p.isEliminated ? 'dead' : ''}">
        <td><span class="dot" style="background:${color}"></span>P${p.index + 1}</td>
        <td>${territoryOf(s, p.index)}</td>
        <td>${p.banners}</td>
        <td>${p.hand.length}</td>
        <td>${living}</td>
        <td class="tags">${tags.join(' ')}</td>
      </tr>`;
  }).join('');
  return `
    <table class="standings">
      <thead><tr><th>Warlord</th><th>Land</th><th>⚑</th><th>Hand</th><th>Court</th><th>State</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** The human's Court (archetypes + where they sit) and any captives they hold (§2). */
function renderCourt(s: ObservableState, human: number): string {
  const me = s.players[human];
  const court = me.court
    .filter(c => c.captiveOf === null)
    .map(c => `<li>${ARCH_SHORT[c.archetype]} <small>@ ${esc(c.node)}</small></li>`)
    .join('');
  const held = s.captives.filter(c => c.captorSeat === human);
  const captives = held.length === 0
    ? ''
    : `<div class="block-title" style="margin-top:8px">Captives held</div><ul class="court-list">${
        held.map(c => `<li>piece of P${c.ownerSeat + 1} <small>(since R${c.capturedRound})</small></li>`).join('')
      }</ul>`;
  return `<div class="info-block">
    <div class="block-title">Your Court</div>
    <ul class="court-list">${court || '<li><i>only your Warlord</i></li>'}</ul>
    ${captives}
  </div>`;
}

/** The human's actual hand (card values) — needed to read pledge/combat strength. */
function renderHand(s: ObservableState, human: number): string {
  const hand = s.players[human].hand;
  const limit = s.players[human].handLimit;
  if (hand.length === 0) return `<div class="hand"><span class="hand-label">Your hand (0/${limit}):</span> <i>empty</i></div>`;
  const cards = hand.map(v => `<span class="card">${v}</span>`).join('');
  return `<div class="hand"><span class="hand-label">Your hand (${hand.length}/${limit}):</span> ${cards}</div>`;
}

function renderOaths(s: ObservableState): string {
  if (s.oaths.length === 0) return '';
  const dur = TUNABLES.OATH_DURATION;
  const items = s.oaths.map(o =>
    `<li>P${o.a + 1} ⛓ P${o.b + 1} <small>(matures in ${Math.max(0, dur - o.strain)})</small></li>`).join('');
  return `<div class="info-block"><div class="block-title">Oaths</div><ul class="oath-list">${items}</ul></div>`;
}

function renderLedger(s: ObservableState): string {
  const g = s.shadowking.grudge;
  const marked = g.map((v, i) => ({ v, i })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (marked.length === 0) return '';
  const items = marked.map(x => `<li>P${x.i + 1} <b>${x.v}</b></li>`).join('');
  return `<div class="info-block"><div class="block-title">The Ledger (the dark hunts)</div><ul class="ledger-list">${items}</ul></div>`;
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
  switch (s.phase) {
    case 'THREAT': return renderThreatPanel(s);
    case 'PLEDGE': return renderPledgePanel(session, s);
    case 'ACTION': return renderActionPanel(session, s);
    case 'DAWN': return `<div class="panel"><div class="panel-title">Dawn — the realm settles…</div></div>`;
    default: return '';
  }
}

function renderThreatPanel(s: ObservableState): string {
  const t = s.shadowking.telegraph;
  if (!t) {
    return `<div class="panel"><button class="primary" data-action="advance-threat">Reveal the dark's intent →</button></div>`;
  }
  const target = t.struckPlayerIndex === null ? 'the realm' : `Player ${t.struckPlayerIndex + 1}`;
  return `
    <div class="panel threat">
      <div class="villain-line">“${esc(t.firstPersonLine)}”</div>
      <div class="threat-detail">Effect <b>${esc(t.effect)}</b> · strikes <b>${esc(t.targetNodeId)}</b> · names <b>${target}</b> · threshold <b>${t.doomCost}</b></div>
      <button class="primary" data-action="advance-threat">To the Pledge →</button>
    </div>`;
}

function renderPledgePanel(session: GameSession, s: ObservableState): string {
  const human = s.players[session.humanIndex];
  const t = s.shadowking.telegraph;
  const C = t ? t.doomCost : 0;
  const weight = session.humanPledgeWeight();
  const suggested = session.suggestedHumanPledge();
  const max = human.hand.length;

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
      <div class="pledge-threshold">Table must reach <b>${C}</b> effective cards. ${weightNote}</div>
      <div class="pledge-grid">${buttons}</div>
      <div class="hint">Suggested: <b>${suggested}</b>. ${s.mode === 'blood_pact' ? 'Pledges are sealed — only the total is revealed.' : 'Pledges are open this round.'}</div>
    </div>`;
}

/**
 * ACTION panel — 3i-a scaffold. Shows whose turn it is and the human's stance /
 * resources; the human can only END TURN for now. The full verb controls (MARCH,
 * CLAIM, RAID, RANSOM, ASSAULT_HEART, oaths, audit, accuse) arrive in 3i-b.
 */
function renderActionPanel(session: GameSession, s: ObservableState): string {
  if (!session.isHumanTurn) {
    return `<div class="panel"><div class="panel-title">Rivals are moving…</div></div>`;
  }
  const human = s.players[session.humanIndex];
  const accuse = s.mode === 'blood_pact' ? renderAccusePanel(session, s) : '';
  return `
    <div class="panel action">
      <div class="panel-title">Your turn — ${human.actionsRemaining} action${human.actionsRemaining === 1 ? '' : 's'} · ⚑${human.banners} · ${human.stance === 'political' ? '🕊 political' : '⚔ martial'}</div>
      <div class="hint">Your Warlord is at <b>${esc(human.warlordNodeId)}</b>. Action controls arrive in 3i-b — end your turn to continue.</div>
      <button class="end-turn" data-action="pass">End turn</button>
      ${accuse}
    </div>`;
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
