// @ts-nocheck
/**
 * Headless screenshot script for the v3 UI — `npm run shots:v3` (M0, T-003).
 *
 * Boots the Vite dev server in-process, drives `/index-v3.html` through a fixed-seed scripted game
 * PURELY by dispatching real DOM click events on rendered controls (no direct engine calls — the
 * script never imports `src/v3` internals; it reaches the engine only through the served page's
 * fogged DOM, so §7 D2 fog is respected for free), and captures a PNG of each required screen the
 * first time it appears:
 *
 *   01-start-select · 02-board-midgame · 03-capture-election · 04-ransom
 *   05-wraith       · 06-bequest       · 07-endgame
 *
 * The seeds + click policy are fully deterministic, so a covering `SEED_LIST` reproduces the same 7
 * PNGs every run. Exits 0 only when all 7 are captured; otherwise prints the missing set and exits 1.
 *
 * Usage:  node scripts/shots-v3.mjs [--out <dir>]   (default --out shots/, gitignored)
 */

import { mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// ─── Config (deterministic; tune here if a screen ever goes missing) ─────────────────────────────

/**
 * Seeds tried in order until every screen is captured (the loop stops early once covered, so trailing
 * seeds are pure insurance and cost nothing). Fully reproducible: seeds 42/11 yield the first six
 * screens (start, board, election, ransom, endgame, and the human's Death-Bequest testament), and
 * seed 44 the mid-game Wraith scene (a Warlord falls at round ~8 while the game is still live, so
 * the sidebar Wraiths block renders pre-endgame); 96 and 124 are verified backups.
 *
 * NOTE: this seed set is topology- AND tunable-specific, and the Wraith seed is the fragile one. A
 * mid-game Warlord elimination is a genuinely rare state on the shipped board: measured at the shots
 * configuration (4p · competitive · warlord) the T-239 re-lock's cheaper doom path (DOOM_COST_MARCH
 * 14→11, SPREAD_AMOUNT_BASE 2.6→2.2) makes the dark complete doom BEFORE anyone is deposed — the
 * T-239 sweep records 0.07 eliminations/game pooled, ~0.04 in the 4p cell, with the elimination Act
 * mix 0/3/288 (Whisper/March/Reckoning) and a mean earliest deposal at round 12.8 of a 14-round cap,
 * i.e. usually simultaneous with the ending. So every board/tunable change since T-225 has retired
 * the then-current Wraith seed: T-222/T-224 (21 nodes) retired the original, T-231/T-236 retired 24
 * → 13 (T-237), and T-239 retired 13 → 44 (T-301 fix round 1, re-covered by a 1–200 browser sweep;
 * seeds 1–40 are ALL barren under the re-lock, which is why the previous list missed).
 *
 * If a future re-tune moves the trajectories once more, re-cover the missing screen by sweeping
 * seeds here (the loop's failure message points here); the driver policy below is deliberately left
 * untouched.
 */
const SEED_LIST = [42, 11, 44, 96, 124];

/** Per-seed hard step cap (each step is one observe+click evaluate) — mirrors the E2E 8000 guard. */
const STEP_CAP = 4000;

/** Fixed viewport keeps screenshots stable run-to-run. */
const VIEWPORT = { width: 1280, height: 900 };

/**
 * The seven required screens: a stable filename + a DOM signature predicate evaluated in the page.
 * Order is the capture priority within a single settled DOM (first match wins per screen).
 *
 * `scroll` is the ordered selector list scrolled into view (first match wins) BEFORE the screenshot.
 * The side-pane is an internally-scrolling column on a height-locked page (`#app` is `overflow:hidden`
 * at 100vh; `.side-pane { overflow-y:auto }`), so a screen's signature can render below the fold —
 * without this, the PNG would match the DOM signature yet not actually SHOW the scene.
 */
const SCREENS = [
  { key: 'start', file: '01-start-select.png', scroll: [] },
  { key: 'board', file: '02-board-midgame.png', scroll: ['.header'] },
  { key: 'election', file: '03-capture-election.png', scroll: ['.command-plaque', '.raid-block'] },
  { key: 'ransom', file: '04-ransom.png', scroll: ['[data-action^="ransom:"]'] },
  { key: 'wraith', file: '05-wraith.png', scroll: ['.wraith-input', '.wraith-list'] },
  { key: 'bequest', file: '06-bequest.png', scroll: ['.panel.bequest'] },
  { key: 'endgame', file: '07-endgame.png', scroll: ['.panel.game-over'] },
];

// ─── In-page driver (runs in the browser via addInitScript; re-inits on every navigation) ────────
//
// Defines window.__shotsObserve() (reads the fogged DOM → signatures) and window.__shotsStep()
// (dispatches ONE real click on a rendered control, per a deterministic decision ladder). The
// ladder is a sacrificial policy: it pledges LOW and Marches aggressively toward rivals so the human
// loses ground and reaches deposal → wraith → defeat (surfacing the bequest / wraith / endgame
// scenes), while co-location surfaces the capture election and captures feed the ransom scene.
const DRIVER_INIT = `
(() => {
  const HUMAN_COLOR = '#c15f2c'; // seat 0 = the human (House Emberfall ember-orange) — rivals are any other piece fill
  const st = { step: 0, lastRound: -1, nonPass: 0 };
  window.__shotsDriver = st;

  const app = () => document.getElementById('app');

  const parseRound = () => {
    // T-205 replaced the textual .clock with a visual turn track carrying data-round.
    const track = document.querySelector('.turn-track');
    if (track) return Number(track.getAttribute('data-round')) || 0;
    return 0;
  };

  window.__shotsObserve = () => {
    const root = app();
    const round = parseRound();
    const has = (sel) => !!(root && root.querySelector(sel));
    const over = has('.panel.game-over');
    return {
      over,
      round,
      sigs: {
        start: has('.start'),
        board: has('.panel.action') && round >= 2,
        election: has('.raid-block'),
        ransom: has('[data-action^="ransom:"]'),
        // Prefer the eliminated human's afterlife-input panel; else the sidebar Wraiths block, but
        // only pre-endgame so it is a DISTINCT mid-game scene (never the game-over frame).
        wraith: has('.wraith-input') || (has('.wraith-list') && !over),
        bequest: has('.panel.bequest'),
        endgame: over,
      },
    };
  };

  const fire = (el) => {
    if (!el) return null;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return el.getAttribute('data-action') || ('node:' + el.getAttribute('data-node'));
  };

  window.__shotsStep = () => {
    const root = app();
    if (!root) return null;
    st.step++;

    const round = parseRound();
    if (round !== st.lastRound) { st.lastRound = round; st.nonPass = 0; }

    const controls = Array.from(root.querySelectorAll('[data-action]:not([disabled]),[data-node]'))
      .filter((el) => el.getAttribute('data-action') !== 'new-game');
    if (controls.length === 0) return null;

    const byAction = (a) => controls.find((el) => (el.getAttribute('data-action') || '').startsWith(a));
    const exact = (a) => controls.find((el) => el.getAttribute('data-action') === a);

    // 1. BLOCKING Last Stand — YIELD (commit nothing). The sacrificial policy lets strongholds fall
    //    so the human is deposed → eliminated → reaches the Wraith afterlife-input scene.
    if (byAction('laststand-commit')) return fire(byAction('laststand-commit'));

    // 2. THREAT → PLEDGE.
    if (byAction('advance-threat')) return fire(byAction('advance-threat'));

    // 3. PLEDGE — deliberately LOW (0, then 1) so the human loses ground toward the losing scenes.
    if (byAction('pledge:')) {
      return fire(exact('pledge:0') || exact('pledge:1') || byAction('pledge:'));
    }

    // 4. BLOCKING Death Bequest — resolve it to unstick the flow (the scene is already screenshotted).
    const blockingBequest = root.querySelector('.panel.bequest.blocking [data-action^="bequest-"]');
    if (blockingBequest) return fire(blockingBequest);

    // 5. ACTION phase, human turn. Exercise up to 2 verbs, then end the turn.
    if (st.nonPass < 2) {
      // Prefer a RAID capture when co-located (feeds the capture beat + the ransom scene).
      const raid =
        byAction('raid:CAPTURE_PIECE') || byAction('raid:TAKE_LAND') ||
        byAction('raid:ROUT_PIECE') || byAction('raid:');
      if (raid) { st.nonPass++; return fire(raid); }

      // March toward a rival: co-locate to surface the capture election, else explore adjacency.
      const adj = Array.from(root.querySelectorAll('.adj-costs li'))
        .map((li) => (li.textContent || '').trim().split(/\\s+/)[0])
        .filter(Boolean);
      const rivalNodes = new Set();
      root.querySelectorAll('g[data-node]').forEach((g) => {
        const id = g.getAttribute('data-node');
        const hasRival = Array.from(g.querySelectorAll('circle.piece')).some((c) => {
          const f = (c.getAttribute('fill') || '').toLowerCase();
          return f && f !== HUMAN_COLOR;
        });
        if (hasRival) rivalNodes.add(id);
      });
      let target = adj.find((id) => rivalNodes.has(id));
      if (!target && adj.length) target = adj[st.step % adj.length];
      if (target) {
        const nodeEl = root.querySelector('[data-node="' + target + '"]');
        if (nodeEl) { st.nonPass++; return fire(nodeEl); }
      }

      // Otherwise take any non-turn-ending verb present (claim / strike / etc.).
      const other = controls.find((el) => {
        const a = el.getAttribute('data-action') || '';
        if (el.hasAttribute('data-node')) return true;
        if (a === 'pass' || a === 'accuse' || a.startsWith('accuse') || a.startsWith('audit')) return false;
        if (a.startsWith('bequest-') || a.startsWith('set-wraith')) return false;
        return a !== '';
      });
      if (other) { st.nonPass++; return fire(other); }
    }

    // End the turn.
    return fire(exact('pass') || controls[0]);
  };
})();
`;

// ─── Node-side orchestration ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  let out = 'shots';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out = argv[++i] ?? out;
    else if (argv[i].startsWith('--out=')) out = argv[i].slice('--out='.length);
  }
  return { out };
}

/**
 * T-201 accept criterion — verify the board is the LARGEST top-level region of the table stage.
 * jsdom has no layout engine, so this must run in the real Playwright page. Returns null if the
 * stage/board is not present yet (caller retries), else `{ ok, boardArea, others }`.
 */
async function measureBoardDominance(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.table-stage');
    if (!stage) return null;
    const board = stage.querySelector(':scope > .board-region');
    if (!board) return null;
    const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
    const boardArea = area(board);
    const others = Array.from(stage.children)
      .filter((el) => el !== board)
      .map((el) => ({ cls: el.className || el.tagName, area: Math.round(area(el)) }));
    const ok = boardArea > 0 && others.every((o) => boardArea > o.area);
    return { ok, boardArea: Math.round(boardArea), others };
  });
}

/**
 * T-202 accept criterion — no rendered text node may compute to the browser default font stack.
 * jsdom does not resolve @font-face, so this must run in the real Playwright page. Returns
 * `{ loaded, bad }`: `loaded` proves the self-hosted faces actually loaded (not a silent fallback),
 * `bad` lists every visible-text element whose FIRST computed family is not one of ours.
 */
async function auditFonts(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const OURS = ['cinzel', 'alegreya'];
    // 1. Force-fetch every declared weight and prove it actually resolves. A face is only loaded once
    //    the page renders a glyph at that weight, so e.g. Cinzel-400 stays unloaded on a screen that
    //    only uses the 700 title — `load()` fetches it explicitly. A broken woff2 url() rejects here
    //    (caught → loaded=false), so this proves the self-hosted files load, not a silent fallback.
    let loaded = true;
    try {
      await Promise.all([
        document.fonts.load('400 16px Cinzel'),
        document.fonts.load('700 16px Cinzel'),
        document.fonts.load('400 16px Alegreya'),
        document.fonts.load('500 16px Alegreya'),
        document.fonts.load('700 16px Alegreya'),
      ]);
    } catch {
      loaded = false;
    }
    loaded =
      loaded &&
      document.fonts.check('400 16px Cinzel') &&
      document.fonts.check('700 16px Cinzel') &&
      document.fonts.check('16px Alegreya');
    // 2. Every element bearing visible text must resolve to one of our families first.
    const bad = [];
    const root = document.getElementById('app');
    if (root) {
      for (const el of root.querySelectorAll('*')) {
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) continue;
        const first = getComputedStyle(el)
          .fontFamily.split(',')[0]
          .trim()
          .replace(/['"]/g, '')
          .toLowerCase();
        if (!OURS.includes(first)) bad.push({ tag: el.tagName, cls: String(el.className), first });
      }
    }
    return { loaded, bad };
  });
}

/**
 * T-211 accept criterion — the "appearance" half of the start-screen audit: no default-styled
 * (UA-chromed) controls may be visible. Every start-screen `<select>` and `<input>` must compute
 * `appearance: none` (its UA menulist arrow / number spinners / checkbox glyph stripped and replaced
 * by the CSS-drawn caret/box). Scope is deliberately `select, input`: those are the widgets with
 * visible UA chrome; the primary `<button>` reads as themed via its own gradient/border regardless of
 * the `appearance` keyword, so it is not required to be `none`. Returns `{ bad: [...] }` listing any
 * offender whose computed appearance is not `none`. jsdom cannot compute `appearance`, so this runs
 * only in the real Playwright page (mirrored structurally by tests/v3/start-screen.test.ts).
 */
async function auditControls(page) {
  return page.evaluate(() => {
    const bad = [];
    const root = document.querySelector('.start');
    if (!root) return { bad: [{ tag: '(none)', cls: '', appearance: 'no .start found' }] };
    for (const el of root.querySelectorAll('select, input')) {
      const cs = getComputedStyle(el);
      const appearance = cs.appearance || cs.webkitAppearance || 'auto';
      if (appearance !== 'none') {
        bad.push({ tag: el.tagName, cls: String(el.className), id: el.id, appearance });
      }
    }
    return { bad };
  });
}

/**
 * T-208 accept criterion — the carved chaos-star inlay must actually be present in the live board
 * DOM (not just faint scratches). jsdom-agnostic: runs in the real Playwright page. Returns
 * `{ present }` — the decorative `.star-inlay` rays AND the burned `.star-carve` fill both exist.
 */
async function auditStarInlay(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('.board-svg');
    if (!svg) return null;
    const rays = svg.querySelectorAll('.star-inlay').length;
    const carve = svg.querySelector('.star-carve');
    const carveFill = carve ? carve.getAttribute('fill') || '' : '';
    return { present: rays > 0 && !!carve && carveFill !== '' && carveFill !== 'none' };
  });
}

/**
 * T-217 accept criterion — every house sigil must render as a LEGIBLE glyph, not an invisible or
 * hairline path. The HUD renders all four houses' plaque crests (`houseSigilPath` for flame / spear /
 * raven / crescent), so a live board carries every sigil in the DOM. jsdom cannot rasterize, so this
 * rasterizes each `.plaque-crest .sigil-svg` to a canvas and counts filled (opaque) pixels; the floor
 * catches the class of bug where an SVG arc self-cancels under the nonzero fill-rule (e.g. an inner
 * arc radius < half its chord) and leaves ~zero fill area. Returns `{ sigils: [{ sigil, fill }] }`
 * (fill = filled px at a fixed 96px raster) or null if the plaques are not rendered yet.
 */
async function auditSigils(page) {
  return page.evaluate(async () => {
    const crests = Array.from(document.querySelectorAll('.house-plaque .plaque-crest .sigil-svg'));
    if (crests.length === 0) return null;
    const SIZE = 96;
    const results = [];
    for (const svg of crests) {
      // Re-render at a fixed size on an opaque-agnostic canvas and count non-transparent pixels.
      const clone = svg.cloneNode(true);
      clone.setAttribute('width', String(SIZE));
      clone.setAttribute('height', String(SIZE));
      const sigil = svg.getAttribute('data-sigil') || '(unknown)';
      const markup = new XMLSerializer().serializeToString(clone);
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(markup)));
      const img = new Image();
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const cv = document.createElement('canvas');
      cv.width = SIZE;
      cv.height = SIZE;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      let fill = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 16) fill++;
      results.push({ sigil, fill });
    }
    return { sigils: results };
  });
}

/**
 * T-209 accept criterion — a full 6-card hand must render fully inside its container (no clipping off
 * the edge). Post fifth-review dissolution the hand lives in the bottom `.hand-dock`, not the old
 * `.hud-realm` column. jsdom has no layout engine, so this must run in the real Playwright page.
 * Returns `{ count, allInside }`: every `.card-slot` rect's left/right edge lies within the
 * `.hand-dock` region rect (± epsilon). Returns null if the hand is not present yet (caller retries).
 */
async function auditHandFit(page) {
  return page.evaluate(() => {
    const dock = document.querySelector('.hand-dock');
    const fan = dock && dock.querySelector('.hand-fan');
    if (!dock || !fan) return null;
    const slots = Array.from(fan.querySelectorAll('.card-slot'));
    if (slots.length === 0) return null;
    const EPS = 1; // sub-pixel rounding tolerance
    const rr = dock.getBoundingClientRect();
    const allInside = slots.every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= rr.left - EPS && r.right <= rr.right + EPS;
    });
    return { count: slots.length, allInside };
  });
}

/**
 * Fifth-review request #3 — a clean board-only PNG (`board-clean.png`): the board SVG with NO turn
 * marker (the header) and NO HUD overlays, for easiest study of the node/edge layout. (Sixth review:
 * the MAP KEY left the board for a collapsible plaque in the edge cluster, so this export is now pure
 * board.) Hides the header + edge overlays, screenshots just the `.board-svg` element, then restores.
 */
async function captureCleanBoard(page, outDir) {
  const HIDE = ['.header', '.edge-cluster', '.hand-dock', '.command-plaque', '.chronicle', '.gambit-alarm'];
  await page.evaluate((sels) => {
    for (const s of sels)
      document.querySelectorAll(s).forEach((el) => {
        el.dataset.prevVis = el.style.visibility;
        el.style.visibility = 'hidden';
      });
  }, HIDE);
  const board = await page.$('.board-svg');
  if (board) await board.screenshot({ path: join(outDir, 'board-clean.png') });
  await page.evaluate((sels) => {
    for (const s of sels)
      document.querySelectorAll(s).forEach((el) => {
        el.style.visibility = el.dataset.prevVis || '';
        delete el.dataset.prevVis;
      });
  }, HIDE);
  console.log('  captured board-clean.png (clean board — no turn marker / HUD)');
}

/**
 * T-210 accept criterion — NO persistent full-width bottom panel on any shots screen (a single-line
 * `.chronicle` toast region is exempt). jsdom has no layout, so this runs in the real Playwright page.
 * Fails if any panel-like element is simultaneously (a) ~full stage width, (b) bottom-anchored, and
 * (c) taller than one text line. Returns `{ offenders: [...] }` (empty ⇒ clean) for the current DOM.
 */
async function auditNoBottomBar(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.table-stage');
    if (!stage) return { offenders: [] };
    const sr = stage.getBoundingClientRect();
    if (sr.width <= 0 || sr.height <= 0) return { offenders: [] };
    // The chronicle toast strip is the ONE exempt bottom region (kept ≤ one line tall by CSS).
    const exempt = new Set(['CHRONICLE', 'TABLE-STAGE', 'BOARD-REGION']);
    const cls = (el) => (typeof el.className === 'string' ? el.className : '');
    const isExempt = (el) =>
      el.closest('.chronicle') || exempt.has((cls(el).split(/\s+/)[0] || '').toUpperCase());
    const candidates = document.querySelectorAll(
      '.command-plaque, .panel, .action, .pledge, .bequest, [class*="panel"], .hud-tray',
    );
    const offenders = [];
    for (const el of candidates) {
      if (isExempt(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const fullWidth = r.width >= sr.width * 0.9;
      const bottomAnchored = sr.bottom - r.bottom <= sr.height * 0.03;
      const tallerThanLine = r.height > 48;
      if (fullWidth && bottomAnchored && tallerThanLine) {
        offenders.push({ cls: cls(el) || el.tagName, w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    return { offenders };
  });
}

/**
 * T-210 accept criterion — the capture-election screen renders WITHOUT clipped text. Runs only when a
 * `.raid-block` is present. Asserts (a) the command plaque hides nothing via overflow
 * (`scrollHeight <= clientHeight`), and (b) every `.raid-block` + the `.panel-title` lies within the
 * plaque's client rect and within the viewport (no vertical slice). Returns `{ ok, why }`.
 */
async function auditElectionUnclipped(page) {
  return page.evaluate((vh) => {
    const raid = document.querySelector('.raid-block');
    if (!raid) return { ok: true, why: 'no election on screen' };
    const plaque = document.querySelector('.command-plaque');
    if (!plaque) return { ok: false, why: 'no .command-plaque present on the election screen' };
    if (plaque.scrollHeight > plaque.clientHeight + 1) {
      return { ok: false, why: `plaque overflow-clips content (scrollH ${plaque.scrollHeight} > clientH ${plaque.clientHeight})` };
    }
    const pr = plaque.getBoundingClientRect();
    const EPS = 1;
    const within = (el, label) => {
      const r = el.getBoundingClientRect();
      if (r.top < pr.top - EPS || r.bottom > pr.bottom + EPS) return `${label} escapes the plaque vertically`;
      if (r.top < -EPS || r.bottom > vh + EPS) return `${label} is clipped by the viewport`;
      return null;
    };
    const targets = [
      [plaque.querySelector('.panel-title'), 'panel-title'],
      ...Array.from(plaque.querySelectorAll('.raid-block')).map((b, i) => [b, `raid-block[${i}]`]),
    ].filter(([el]) => el);
    for (const [el, label] of targets) {
      const why = within(el, label);
      if (why) return { ok: false, why };
    }
    return { ok: true, why: 'election renders fully within the plaque + viewport' };
  }, VIEWPORT.height);
}

/**
 * T-311 accept criterion — the player-orientation affordance is present and honest on a live board:
 * a first-time viewer can read (a) TURN ORDER / whose turn, (b) HOW to move, (c) WHICH house is
 * theirs, from the screen alone, without leaking rivals' hidden info. jsdom has no layout engine, so
 * the "visible prompt" half runs in the real Playwright page. Returns a verdict bag hard-asserted by
 * the caller. `playerCount` is the configured seat count (the seat-chip row must have one per seat).
 */
async function auditOrientation(page, playerCount) {
  return page.evaluate((pc) => {
    const bar = document.querySelector('.orientation[data-active-seat]');
    if (!bar) return { ok: false, why: 'no .orientation[data-active-seat] on the board' };
    const seats = Array.from(bar.querySelectorAll('.orient-seats .orient-seat'));
    if (seats.length !== pc) return { ok: false, why: `seat chips ${seats.length} != player count ${pc}` };
    // Exactly one "you" self-marker in the ribbon, and it names a house + carries an ordinal.
    const you = bar.querySelectorAll('.orient-seat.is-you');
    if (you.length !== 1) return { ok: false, why: `expected exactly one .orient-seat.is-you, got ${you.length}` };
    const youHouse = you[0].querySelector('.orient-house');
    const youOrd = you[0].querySelector('.orient-ord');
    if (!youHouse || !youHouse.textContent.trim()) return { ok: false, why: 'the "you" seat chip has no house label' };
    if (!youOrd || !youOrd.textContent.trim()) return { ok: false, why: 'the "you" seat chip has no turn-order ordinal' };
    // The prompt (how to move) is on-screen with real text + a non-zero client rect.
    const prompt = bar.querySelector('.orient-prompt[data-phase]');
    if (!prompt || !prompt.textContent.trim()) return { ok: false, why: 'no visible .orient-prompt text' };
    const pr = prompt.getBoundingClientRect();
    if (pr.width <= 0 || pr.height <= 0) return { ok: false, why: 'the .orient-prompt has a zero client rect (not visible)' };
    // During ACTION, the active seat must be the one lit as `is-acting` (guarded on phase so a
    // THREAT/PLEDGE capture cannot false-fail). Turn order is public — this leaks nothing.
    const phase = prompt.getAttribute('data-phase');
    if (phase === 'ACTION') {
      const activeSeat = bar.getAttribute('data-active-seat');
      const acting = bar.querySelectorAll('.orient-seat.is-acting');
      if (acting.length !== 1) return { ok: false, why: `ACTION: expected one .is-acting seat, got ${acting.length}` };
      if (acting[0].getAttribute('data-seat') !== activeSeat) {
        return { ok: false, why: `ACTION: is-acting seat ${acting[0].getAttribute('data-seat')} != data-active-seat ${activeSeat}` };
      }
    }
    // The board self-locator (c): exactly one `[data-you]` on the board — the human's Warlord — and
    // no rival piece carries it (proves it is self-info, not a fog leak).
    const boardYou = document.querySelectorAll('.board-svg [data-you]');
    if (boardYou.length !== 1) return { ok: false, why: `board [data-you] count ${boardYou.length} != 1` };
    return { ok: true, why: `orientation intact — ${seats.length} seat chips, one "you", visible prompt (${phase}), one board self-marker`, phase };
  }, playerCount);
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const outDir = resolve(process.cwd(), out);
  await mkdir(outDir, { recursive: true });

  // Clear stale PNGs so the produced file SET is deterministic run-to-run (accept criterion 2).
  for (const f of await readdir(outDir)) {
    if (f.toLowerCase().endsWith('.png')) await rm(join(outDir, f));
  }

  const server = await createServer({ server: { port: 0 }, logLevel: 'warn' });
  await server.listen();
  const base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error('Vite did not report a local URL');
  const pageUrl = new URL('index-v3.html', base).href;

  const browser = await chromium.launch({ headless: true });
  // Emulate `prefers-reduced-motion: reduce` so the v3 UI's AnimationQueue resolves to INSTANT mode
  // (queue.ts `resolveMode()`): settlement is synchronous, so the deterministic click-then-requery
  // ladder below stays in lockstep with real game state. This is the SAME accessibility path the
  // design makes load-bearing (ROADMAP-V3.1-UI §3) — not a workaround. Without it, a real headless
  // Chromium page reports `no-preference`, the queue plays animated holds, and `__shotsObserve()`
  // reads mid/pre-commit DOM — the playthrough desyncs and never reaches the later screens.
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(DRIVER_INIT);
  const page = await context.newPage();

  const needed = new Set(SCREENS.map((s) => s.key));
  const captured = new Set();
  let dominance = null; // T-201: measured once the board layout is live
  // T-202: font audit run on the start screen (holds the <select>/<input> controls) and once on a
  // live mid-game board; both must load our faces and expose zero default-stack text nodes.
  let fontStart = null;
  let fontBoard = null;
  // T-211: appearance audit — no default-styled (UA-chromed) controls on the start screen.
  let controlsStart = null;
  // T-208: assert the carved chaos-star inlay is present on the live mid-game board.
  let starInlay = null;
  // T-217: assert every house sigil rasterizes to a legible (non-empty) glyph on the live board.
  let sigilAudit = null;
  // T-209: track the fullest hand seen on a live mid-game board — a full 6-card hand must fit the
  // hand dock. Keep the max-count sample so a mid-turn spend can't hide the full-hand case.
  let handFit = null;
  // T-210: accumulate any full-width bottom-bar offenders across every captured screen, and record
  // the election-unclipped verdict on the election screen. Both hard-assert at the end.
  const bottomBarViolations = [];
  let electionAudit = null;
  // T-311: assert the player-orientation affordance (turn order · self-marker · move prompt) once on
  // a live mid-game board. Prefer an ACTION frame so the whose-turn `is-acting` invariant is checked.
  let orientation = null;

  const captureIfNeeded = async (sigs) => {
    for (const screen of SCREENS) {
      if (!needed.has(screen.key)) continue;
      if (!sigs[screen.key]) continue;
      // Scroll the scene's signature element into view first — the side-pane scrolls internally, so
      // a matched signature can otherwise sit below the fold (the PNG must SHOW the scene, not just
      // satisfy the DOM predicate).
      if (screen.scroll.length > 0) {
        await page.evaluate((selectors) => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.scrollIntoView({ block: 'center', inline: 'nearest' }); return; }
          }
        }, screen.scroll);
      }
      await page.screenshot({ path: join(outDir, screen.file), fullPage: true });
      // Fifth-review request #3: a clean board-only image (no turn marker / HUD) for easiest viewing.
      // Captured off the early mid-game board (round ~2) so every node is PRISTINE — an endgame
      // capture scorches nodes to ash (keystone/holdings/forges), which vanish into the dark star.
      if (screen.key === 'board') await captureCleanBoard(page, outDir);
      // T-210: every captured shots screen must be free of a persistent full-width bottom panel.
      if (screen.key !== 'start') {
        const bar = await auditNoBottomBar(page);
        for (const o of bar.offenders) bottomBarViolations.push({ screen: screen.key, ...o });
      }
      // T-210: the election screen must render without clipped text.
      if (screen.key === 'election') electionAudit = await auditElectionUnclipped(page);
      needed.delete(screen.key);
      captured.add(screen.key);
      console.log(`  captured ${screen.file} (${screen.key})`);
    }
  };

  try {
    for (const seed of SEED_LIST) {
      if (needed.size === 0) break;
      console.log(`seed ${seed} — screens still needed: ${[...needed].join(', ')}`);

      await page.goto(pageUrl, { waitUntil: 'load' });
      await page.waitForSelector('.start', { timeout: 15000 });

      // Capture the start/difficulty-select screen before beginning.
      const startObs = await page.evaluate(() => window.__shotsObserve());
      await captureIfNeeded(startObs.sigs);

      // T-202: audit the start screen once (its <select>/<input> are the highest-risk default nodes).
      if (fontStart === null) fontStart = await auditFonts(page);
      // T-211: audit the start-screen controls once — none may keep its default UA appearance.
      if (controlsStart === null) controlsStart = await auditControls(page);

      // Configure the fixed-seed game and begin (competitive · 4p · warlord).
      await page.evaluate((s) => {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('player-count', '4');
        set('mode', 'competitive');
        set('difficulty', 'warlord');
        set('seed', String(s));
        document.getElementById('start-btn')
          .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }, seed);
      await page.waitForSelector('.table-stage', { timeout: 15000 });

      // Drive the game, screenshotting each still-needed screen on first sighting.
      for (let i = 0; i < STEP_CAP && needed.size > 0; i++) {
        const obs = await page.evaluate(() => window.__shotsObserve());
        await captureIfNeeded(obs.sigs);
        // Measure board dominance once the mid-game board layout is live (round >= 2).
        if (dominance === null && obs.round >= 2) {
          dominance = await measureBoardDominance(page);
        }
        // T-202: audit fonts once on the live mid-game board (round >= 2).
        if (fontBoard === null && obs.round >= 2 && obs.sigs.board) {
          fontBoard = await auditFonts(page);
        }
        // T-208: assert the carved chaos-star inlay once on the live mid-game board (round >= 2).
        if (starInlay === null && obs.round >= 2 && obs.sigs.board) {
          starInlay = await auditStarInlay(page);
        }
        // T-217: audit house-sigil legibility once on the live mid-game board (all four plaques up).
        if (sigilAudit === null && obs.round >= 2 && obs.sigs.board) {
          sigilAudit = await auditSigils(page);
        }
        // T-311: audit the orientation affordance once on the live mid-game board. `obs.sigs.board`
        // is the human's ACTION turn (round >= 2), so the ACTION whose-turn invariant is exercised.
        if (orientation === null && obs.round >= 2 && obs.sigs.board) {
          orientation = await auditOrientation(page, 4);
        }
        // T-209: sample the hand fit on every live mid-game board, keeping the fullest hand seen.
        if (obs.round >= 2 && obs.sigs.board) {
          const fit = await auditHandFit(page);
          if (fit && (handFit === null || fit.count > handFit.count)) handFit = fit;
        }
        if (needed.size === 0 || obs.over) break;
        const clicked = await page.evaluate(() => window.__shotsStep());
        if (clicked === null) break; // no progress possible — move to the next seed
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // T-201 accept: the board must be the largest top-level region of the table stage.
  if (dominance === null) {
    console.error('\nboard-dominance assertion never ran (no live board layout at round >= 2)');
    process.exit(1);
  }
  if (!dominance.ok) {
    console.error('\nBOARD-DOMINANCE FAILED — board is not the largest top-level region.');
    console.error(`  board area: ${dominance.boardArea}px²`);
    for (const o of dominance.others) console.error(`  ${o.cls}: ${o.area}px²`);
    process.exit(1);
  }
  console.log(`board dominates: ${dominance.boardArea}px² > [${dominance.others.map((o) => o.area).join(', ')}]`);

  // T-202 accept: no rendered text node computes to the browser default font stack (start + board).
  const fontChecks = [
    ['start screen', fontStart],
    ['mid-game board', fontBoard],
  ];
  let fontFailed = false;
  for (const [label, res] of fontChecks) {
    if (res === null) {
      console.error(`\nFONT AUDIT FAILED — ${label} audit never ran.`);
      fontFailed = true;
      continue;
    }
    if (!res.loaded) {
      console.error(`\nFONT AUDIT FAILED — self-hosted faces did not load on the ${label}`);
      console.error('  document.fonts.check failed for Cinzel and/or Alegreya (check the woff2 url() paths).');
      fontFailed = true;
    }
    if (res.bad.length > 0) {
      console.error(`\nFONT AUDIT FAILED — ${res.bad.length} default-stack text node(s) on the ${label}:`);
      for (const b of res.bad.slice(0, 20)) console.error(`  <${b.tag}> class="${b.cls}" → "${b.first}"`);
      fontFailed = true;
    }
  }
  if (fontFailed) process.exit(1);
  console.log('font audit: every text node resolves to Cinzel/Alegreya; self-hosted faces loaded (start + board)');

  // T-211 accept: the appearance audit must have run and found no default-styled control.
  if (controlsStart === null) {
    console.error('\nAPPEARANCE AUDIT FAILED — the start-screen control audit never ran.');
    process.exit(1);
  }
  if (controlsStart.bad.length > 0) {
    console.error(`\nAPPEARANCE AUDIT FAILED — ${controlsStart.bad.length} default-styled control(s) on the start screen:`);
    for (const b of controlsStart.bad.slice(0, 20)) {
      console.error(`  <${b.tag}> class="${b.cls}"${b.id ? ` id="${b.id}"` : ''} → appearance:"${b.appearance}"`);
    }
    process.exit(1);
  }
  console.log('appearance audit: every start-screen select/input computes appearance:none (no default UA widgets)');

  // T-208 accept: the carved chaos-star inlay must be present in the shots run.
  if (starInlay === null) {
    console.error('\nSTAR-INLAY assertion never ran (no live board at round >= 2)');
    process.exit(1);
  }
  if (!starInlay.present) {
    console.error('\nSTAR-INLAY FAILED — the decorative rays and/or the burned .star-carve fill are absent from the board.');
    process.exit(1);
  }
  console.log('star inlay: decorative chaos-star rays + burned carved-wood fill present on the board');

  // T-217 accept: every house sigil must rasterize to a legible glyph (not an invisible/hairline path).
  // Floor is a fraction of the 96×96 raster — the buggy self-cancelling crescent measured ~0 filled px,
  // while a real glyph fills hundreds. 300px (~3% of the box) sits safely above hairline noise, below
  // every legible sigil.
  const SIGIL_FILL_FLOOR = 300;
  if (sigilAudit === null) {
    console.error('\nSIGIL-LEGIBILITY assertion never ran (no live board with house plaques at round >= 2)');
    process.exit(1);
  }
  if (sigilAudit.sigils.length < 4) {
    console.error(`\nSIGIL-LEGIBILITY FAILED — only ${sigilAudit.sigils.length}/4 house sigils rendered.`);
    process.exit(1);
  }
  const faintSigils = sigilAudit.sigils.filter((s) => s.fill < SIGIL_FILL_FLOOR);
  if (faintSigils.length > 0) {
    console.error('\nSIGIL-LEGIBILITY FAILED — a house sigil renders as an invisible/hairline glyph:');
    for (const s of faintSigils) console.error(`  sigil "${s.sigil}": ${s.fill} filled px (floor ${SIGIL_FILL_FLOOR})`);
    process.exit(1);
  }
  console.log(`sigil legibility: all ${sigilAudit.sigils.length} house sigils fill ≥ ${SIGIL_FILL_FLOOR}px [${sigilAudit.sigils.map((s) => `${s.sigil}:${s.fill}`).join(', ')}]`);

  // T-209 accept: a full 6-card hand must render fully inside the bottom hand dock (no clipping).
  if (handFit === null) {
    console.error('\nHAND-FIT assertion never ran (no hand rendered on a live board at round >= 2)');
    process.exit(1);
  }
  if (handFit.count < 6 || !handFit.allInside) {
    console.error('\nHAND-FIT FAILED — a full hand does not fit inside the hand dock.');
    console.error(`  fullest hand seen: ${handFit.count} card(s); allInside=${handFit.allInside}`);
    process.exit(1);
  }
  console.log(`hand fit: a ${handFit.count}-card hand renders fully inside the hand dock`);

  // T-210 accept: no persistent full-width bottom panel on any captured screen (chronicle exempt).
  if (bottomBarViolations.length > 0) {
    console.error('\nBOTTOM-BAR FAILED — a persistent full-width bottom panel is present:');
    for (const v of bottomBarViolations) console.error(`  [${v.screen}] ${v.cls} — ${v.w}×${v.h}px`);
    process.exit(1);
  }
  console.log('bottom-bar: no persistent full-width bottom panel on any captured screen');

  // T-210 accept: the capture-election screen renders without clipped text.
  if (electionAudit === null) {
    console.error('\nELECTION-UNCLIPPED assertion never ran (the capture-election screen was not captured)');
    process.exit(1);
  }
  if (!electionAudit.ok) {
    console.error(`\nELECTION-UNCLIPPED FAILED — ${electionAudit.why}`);
    process.exit(1);
  }
  console.log(`election unclipped: ${electionAudit.why}`);

  // T-311 accept: the player-orientation affordance (turn order · self-marker · move prompt) is present.
  if (orientation === null) {
    console.error('\nORIENTATION assertion never ran (no live board at round >= 2)');
    process.exit(1);
  }
  if (!orientation.ok) {
    console.error(`\nORIENTATION FAILED — ${orientation.why}`);
    process.exit(1);
  }
  console.log(`orientation: ${orientation.why}`);

  if (needed.size === 0) {
    console.log(`\ncaptured ${captured.size}/${SCREENS.length} screens → ${outDir}`);
    process.exit(0);
  } else {
    console.error(`\nMISSING ${needed.size} screen(s): ${[...needed].join(', ')}`);
    console.error(`captured: ${[...captured].join(', ') || '(none)'}`);
    console.error('Add seeds to SEED_LIST (or adjust the driver policy) until all 7 are captured.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
