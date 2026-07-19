// @vitest-environment jsdom
/**
 * T-204 — data-driven card-face generator. Proves the three accept criteria:
 *   1. A synthetic NEW piece type, registered via the public registry alone, yields a valid, complete
 *      face — with ZERO changes to any layout file (view.ts / board-view.ts / ui-v3.css).
 *   2. Card DOM is built ONLY via the generator (source-scan: no bespoke `.card` / `.card-btn` markup
 *      survives in the layout files, and view.ts imports the generator).
 *   3. The corner-index invariant (value + suit in BOTH the top-left and bottom-right corner groups)
 *      and the fog invariant (a face-DOWN token leaks no kind/name/archetype) hold.
 *
 * BOUNDARY (what counts as "a card"): the human's hand (power cards) and the last-stand toggles are
 * cards and route through the generator. Court retainers remain diegetic list rows (token-chip
 * territory), node/plaque labels are not cards — mirroring the T-203 audit's recorded scope note.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  cardFace,
  powerCardFace,
  pieceFace,
  tokenFace,
  registerFaceKind,
  getFaceMeta,
} from '../../src/ui-v3/card-face.js';

const ROOT = process.cwd();

function parse(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const err = doc.querySelector('parsererror');
  expect(err, `SVG did not parse: ${err?.textContent ?? ''}`).toBeNull();
  return doc.documentElement as unknown as SVGSVGElement;
}

/** A complete face: root .card-face, a frame, a name, rules text, and two well-formed corners. */
function assertValidFace(svg: string, expectValue: string): SVGSVGElement {
  const root = parse(svg);
  expect(root.classList.contains('card-face'), 'root is a .card-face svg').toBe(true);
  expect(root.getAttribute('data-face-kind'), 'has data-face-kind').toBeTruthy();
  expect(root.querySelector('.cf-frame'), 'has a frame element').not.toBeNull();
  expect((root.querySelector('.cf-name')?.textContent ?? '').length, 'has a name').toBeGreaterThan(
    0,
  );
  expect(root.querySelectorAll('.cf-rules').length, 'has rules text').toBeGreaterThan(0);

  const corners = root.querySelectorAll('.cf-corner');
  expect(corners.length, 'has exactly two corner indices').toBe(2);
  const positions = Array.from(corners)
    .map((c) => c.getAttribute('data-corner'))
    .sort();
  expect(positions, 'top-left + bottom-right corners').toEqual(['br', 'tl']);
  for (const corner of Array.from(corners)) {
    const val = corner.querySelector('.cf-corner-val')?.textContent ?? '';
    expect(val, `corner ${corner.getAttribute('data-corner')} carries the value`).toBe(expectValue);
    expect(
      corner.querySelector('svg'),
      `corner ${corner.getAttribute('data-corner')} carries a suit <svg>`,
    ).not.toBeNull();
  }
  return root;
}

describe('T-204 card-face generator — accept #1: synthetic new piece type, zero layout-file changes', () => {
  it('registers a brand-new kind and gets a valid, complete face via the public registry alone', () => {
    registerFaceKind('siege-engine', {
      displayName: 'Siege Engine',
      suit: 'embers',
      rules: 'A ponderous ram — it batters a stronghold gate but cannot hold ground.',
    });
    expect(getFaceMeta('siege-engine').displayName).toBe('Siege Engine');

    const svg = cardFace({ kind: 'siege-engine', value: 5, name: 'The Ram' });
    const root = assertValidFace(svg, '5');
    expect(root.getAttribute('data-face-kind')).toBe('siege-engine');
    expect(root.querySelector('.cf-name')?.textContent).toBe('The Ram');
  });

  it('an UNKNOWN kind still yields a valid (default) face — never throws, never a broken card', () => {
    const root = assertValidFace(cardFace({ kind: 'no-such-kind', value: 2 }), '2');
    expect(root.getAttribute('data-face-kind')).toBe('no-such-kind');
  });
});

describe('T-204 card-face generator — corner index invariant (Gate 0.5)', () => {
  it('powerCardFace(3) shows value + suit in both the top-left and bottom-right corner', () => {
    assertValidFace(powerCardFace(3), '3');
  });

  it('every shipped kind renders a valid face', () => {
    for (const kind of ['power', 'warlord', 'marshal', 'steward', 'herald'] as const) {
      assertValidFace(cardFace({ kind, value: 3 }), '3');
    }
  });

  it('pieceFace uses the piece name + its power as the corner value', () => {
    const root = assertValidFace(
      pieceFace({ archetype: 'marshal', name: 'Ser Kael', power: 3, identity: 'the tireless' }),
      '3',
    );
    expect(root.getAttribute('data-face-kind')).toBe('marshal');
    expect(root.querySelector('.cf-name')?.textContent).toBe('Ser Kael');
  });
});

describe('T-209 — rich hand faces (distinct, legible corner index)', () => {
  const HAND = [1, 2, 3, 4, 2, 4];

  it('each hand card shows its own value + suit + name, on a legible backing plate', () => {
    for (const v of HAND) {
      const root = assertValidFace(powerCardFace(v), String(v));
      // A non-empty name reads.
      expect((root.querySelector('.cf-name')?.textContent ?? '').length).toBeGreaterThan(0);
      // Both corners carry a light backing lozenge — the structural guarantee the dark value + suit
      // are not rendered dark-on-dark (the Gate 1 regression). One plate + one suit <svg> per corner.
      const corners = root.querySelectorAll('.cf-corner');
      expect(corners.length).toBe(2);
      for (const corner of Array.from(corners)) {
        expect(
          corner.querySelector('.cf-corner-plate'),
          `corner ${corner.getAttribute('data-corner')} has a backing plate`,
        ).not.toBeNull();
        // The plate is a <rect>, so the suit <svg> stays uniquely resolvable.
        expect(corner.querySelector('rect.cf-corner-plate')?.tagName.toLowerCase()).toBe('rect');
        expect(corner.querySelector('svg')).not.toBeNull();
      }
    }
  });

  it('distinctness — each rendered card carries its OWN datum (value tracks the hand)', () => {
    const shown = HAND.map((v) => {
      const root = parse(powerCardFace(v));
      const tl = Array.from(root.querySelectorAll('.cf-corner')).find(
        (c) => c.getAttribute('data-corner') === 'tl',
      );
      return tl?.querySelector('.cf-corner-val')?.textContent ?? '';
    });
    expect(shown).toEqual(HAND.map(String));
  });
});

describe('T-204 card-face generator — fog invariant (§7 D2 / §13 P0-12)', () => {
  it('a face-DOWN token leaks no kind/name/archetype — only the sigil back', () => {
    const backDark = tokenFace({ flipped: false, sigil: 'dark' });
    const backBright = tokenFace({ flipped: false, sigil: 'bright' });
    for (const back of [backDark, backBright]) {
      const root = parse(back);
      expect(root.getAttribute('data-face-kind')).toBe('token-back');
      const text = back.toLowerCase();
      // None of the hidden payload vocabulary may appear on a back face.
      for (const banned of [
        'warlord',
        'marshal',
        'steward',
        'herald',
        'recruit',
        'blight',
        'knight',
        'death',
      ]) {
        expect(text.includes(banned), `back face must not contain "${banned}"`).toBe(false);
      }
    }
    expect(parse(backDark).getAttribute('data-sigil')).toBe('dark');
    expect(parse(backBright).getAttribute('data-sigil')).toBe('bright');
    // The TokenFaceInput union makes passing hidden content on a back face a COMPILE-TIME error:
    // `{ flipped: false, kind: 'warlord' }` does not type-check (documented, enforced by tsc).
  });

  it('a flipped token may show its revealed content (public once revealed)', () => {
    const front = tokenFace({
      flipped: true,
      kind: 'marshal',
      name: 'The Sworn',
      archetype: 'marshal',
    });
    const root = parse(front);
    expect(root.classList.contains('card-face')).toBe(true);
    expect(root.querySelector('.cf-name')?.textContent).toBe('The Sworn');
  });
});

describe('T-204 card-face generator — determinism (no RNG / no Date)', () => {
  it('identical input yields byte-identical output', () => {
    expect(cardFace({ kind: 'warlord', value: 3, name: 'Aldric' })).toBe(
      cardFace({ kind: 'warlord', value: 3, name: 'Aldric' }),
    );
    expect(powerCardFace(4)).toBe(powerCardFace(4));
  });

  it('the generator source uses no Math.random / Date.now', () => {
    // Strip comments first — the module's own doc comment legitimately NAMES these to explain their
    // absence; the ban is on actual code use.
    const code = readFileSync(resolve(ROOT, 'src/ui-v3/card-face.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/Math\.random/);
    expect(code).not.toMatch(/Date\.now/);
  });
});

describe('T-204 — accept #2: card DOM built ONLY via the generator', () => {
  const VIEW = readFileSync(resolve(ROOT, 'src/ui-v3/view.ts'), 'utf8');
  const BOARD = readFileSync(resolve(ROOT, 'src/ui-v3/board-view.ts'), 'utf8');

  it('no bespoke card markup survives in the layout files', () => {
    // The old bare-card renders — `class="card"` and `class="card-btn"` — must be gone.
    for (const [name, src] of [
      ['view.ts', VIEW],
      ['board-view.ts', BOARD],
    ] as const) {
      expect(src.includes('class="card"'), `${name} has no raw card span`).toBe(false);
      expect(src.includes('class="card-btn"'), `${name} has no raw card-btn`).toBe(false);
      expect(
        /`<svg class="card-face/.test(src),
        `${name} does not hand-build a card-face svg`,
      ).toBe(false);
    }
  });

  it('view.ts renders cards through the generator import', () => {
    expect(VIEW).toMatch(/from '\.\/card-face\.js'/);
    expect(VIEW).toMatch(/powerCardFace\(/);
  });

  it('the removed CSS classes are gone from ui-v3.css', () => {
    const CSS = readFileSync(resolve(ROOT, 'src/ui-v3/ui-v3.css'), 'utf8');
    expect(/^\.card\s*\{/m.test(CSS), 'no leftover .card rule').toBe(false);
    expect(/^\.card-btn\s*\{/m.test(CSS), 'no leftover .card-btn rule').toBe(false);
    expect(CSS).toMatch(/\.card-face\s*\{/);
  });
});

describe('T-204 — committed frame asset', () => {
  it('the CC0 frame SVG is committed and non-empty', () => {
    const frame = readFileSync(resolve(ROOT, 'src/ui-v3/assets/frames/card-frame.svg'), 'utf8');
    expect(frame.trim().length).toBeGreaterThan(0);
    expect(frame).toMatch(/<svg/);
  });

  it('CREDITS.md records the frame asset', () => {
    const credits = readFileSync(resolve(ROOT, 'docs/CREDITS.md'), 'utf8');
    expect(credits).toMatch(/card-frame\.svg/);
  });
});
