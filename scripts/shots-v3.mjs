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
 * seeds are pure insurance and cost nothing). Fully reproducible: seed 42 yields six of the seven
 * screens and seed 7 the mid-game Wraith scene; the rest are spares.
 */
const SEED_LIST = [42, 7, 99, 3, 17, 5, 23, 11];

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
  { key: 'election', file: '03-capture-election.png', scroll: ['.raid-block'] },
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
    const OURS = ['cinzel', 'inter'];
    // 1. Force-fetch every declared weight and prove it actually resolves. A face is only loaded once
    //    the page renders a glyph at that weight, so e.g. Cinzel-400 stays unloaded on a screen that
    //    only uses the 700 title — `load()` fetches it explicitly. A broken woff2 url() rejects here
    //    (caught → loaded=false), so this proves the self-hosted files load, not a silent fallback.
    let loaded = true;
    try {
      await Promise.all([
        document.fonts.load('400 16px Cinzel'),
        document.fonts.load('700 16px Cinzel'),
        document.fonts.load('400 16px Inter'),
        document.fonts.load('500 16px Inter'),
        document.fonts.load('600 16px Inter'),
      ]);
    } catch {
      loaded = false;
    }
    loaded =
      loaded &&
      document.fonts.check('400 16px Cinzel') &&
      document.fonts.check('700 16px Cinzel') &&
      document.fonts.check('16px Inter');
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
  // T-208: assert the carved chaos-star inlay is present on the live mid-game board.
  let starInlay = null;

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
      console.error('  document.fonts.check failed for Cinzel and/or Inter (check the woff2 url() paths).');
      fontFailed = true;
    }
    if (res.bad.length > 0) {
      console.error(`\nFONT AUDIT FAILED — ${res.bad.length} default-stack text node(s) on the ${label}:`);
      for (const b of res.bad.slice(0, 20)) console.error(`  <${b.tag}> class="${b.cls}" → "${b.first}"`);
      fontFailed = true;
    }
  }
  if (fontFailed) process.exit(1);
  console.log('font audit: every text node resolves to Cinzel/Inter; self-hosted faces loaded (start + board)');

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
