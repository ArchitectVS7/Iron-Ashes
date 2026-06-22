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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
    switch (verb) {
      case 'advance-threat': session.advanceFromThreat(); break;
      case 'pledge': session.submitHumanPledge(Number(arg)); break;
      case 'claim': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'CLAIM' } }); break;
      case 'strike': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'STRIKE' } }); break;
      case 'pass': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'PASS' } }); break;
      case 'raid': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'RAID', targetPlayerIndex: Number(arg) } }); break;
      case 'rescue': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'RESCUE', targetPlayerIndex: Number(arg) } }); break;
      case 'audit': session.humanAction({ type: 'PLAYER_ACTION', playerIndex: h, action: { type: 'AUDIT', targetPlayerIndex: Number(arg) } }); break;
      case 'accuse': session.humanAccuse(Number(arg)); break;
      case 'new-game': location.reload(); break;
    }
  });

  render();
}

// ─── Top-level layout ─────────────────────────────────────────────

function renderApp(session: GameSession): string {
  const s = session.state;
  return `
    ${renderGambitBanner(s)}
    <div class="layout">
      <div class="board-pane">${renderBoard(s)}</div>
      <aside class="side-pane">
        ${renderHeader(s)}
        ${renderStandings(s, session.humanIndex)}
        ${renderPanel(session)}
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
      <div class="clock">Round ${s.round} · Act <b>${s.act}</b> · Phase <b>${s.phase}</b></div>
      <div class="sk-meter">Dark patience ${sk.patience}/${TUNABLES.PATIENCE_CAP}${s.mode === 'blood_pact' ? ' · <b>Blood Pact</b>' : ''}</div>
    </div>`;
}

function renderStandings(s: GameState, human: number): string {
  const rows = s.players.map(p => {
    const color = PLAYER_COLORS[p.index];
    const tags: string[] = [];
    if (p.crownHeld) tags.push('<span class="tag crown">♛ Crown</span>');
    if (p.isBroken) tags.push('<span class="tag broken">Broken</span>');
    if (p.index === human) tags.push('<span class="tag you">You</span>');
    return `
      <tr>
        <td><span class="dot" style="background:${color}"></span>P${p.index + 1}</td>
        <td>${territoryOf(s, p.index)}</td>
        <td>${p.banners}</td>
        <td>${p.hand.length}</td>
        <td>${tags.join(' ')}</td>
      </tr>`;
  }).join('');
  return `
    <table class="standings">
      <thead><tr><th>Warlord</th><th>Land</th><th>⚑</th><th>Hand</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
      btns.push(`<button data-action="rescue:${p.index}">Rescue Player ${p.index + 1} (${TUNABLES.RESCUE_COST} cards)</button>`);
    }
  }

  // AUDIT (Blood Pact)
  if (s.mode === 'blood_pact' && human.banners >= TUNABLES.AUDIT_COST && s.pledgeHistory.length > 0) {
    for (const p of s.players) {
      if (p.index === session.humanIndex) continue;
      btns.push(`<button data-action="audit:${p.index}">Audit Player ${p.index + 1} (⚑${TUNABLES.AUDIT_COST})</button>`);
    }
  }

  const marchHint = `<div class="hint">Click an adjacent node to <b>March</b> (⚑1, +1 through ash). At <b>${esc(here)}</b>.</div>`;
  const accuse = s.mode === 'blood_pact' ? renderAccusePanel(session) : '';

  return `
    <div class="panel action">
      <div class="panel-title">Your turn — ${human.actionsRemaining} action${human.actionsRemaining === 1 ? '' : 's'} · ⚑${human.banners}</div>
      ${marchHint}
      <div class="action-btns">${btns.join('')}</div>
      <button class="end-turn" data-action="pass">End turn</button>
      ${accuse}
    </div>`;
}

function renderAccusePanel(session: GameSession): string {
  const s = session.state;
  if (s.bloodPactExposed) return `<div class="accuse"><div class="panel-title">Traitor exposed.</div></div>`;
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
