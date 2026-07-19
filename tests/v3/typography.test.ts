import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// T-202 — structural guard for the self-hosted typography + palette system. jsdom does not resolve
// @font-face (the real computed-font audit lives in `npm run shots:v3`), so this reads the committed
// artifacts as text/bytes and keeps the deliverable enforced by the standard `npm run verify` suite
// even when the browser gate is not run. No engine surface is touched — CSS/HTML/asset only.
const ROOT = process.cwd();
const CSS = readFileSync(resolve(ROOT, 'src/ui-v3/ui-v3.css'), 'utf8');
const HTML = readFileSync(resolve(ROOT, 'index-v3.html'), 'utf8');
const FONT_DIR = 'src/ui-v3/assets/fonts';
const WOFF2 = ['Cinzel-400', 'Cinzel-700', 'Alegreya-400', 'Alegreya-500', 'Alegreya-700'];
const LICENSES = ['Cinzel-OFL.txt', 'Alegreya-OFL.txt'];

describe('T-202 typography + palette system', () => {
  it('index-v3.html loads no font from a CDN (no runtime network fetch)', () => {
    expect(HTML).not.toMatch(/fonts\.googleapis\.com/);
    expect(HTML).not.toMatch(/fonts\.gstatic\.com/);
  });

  it('ui-v3.css self-hosts Cinzel + Alegreya via @font-face with local woff2 (no http src)', () => {
    for (const family of ['Cinzel', 'Alegreya']) {
      const face = new RegExp(
        `@font-face\\s*\\{[^}]*font-family:\\s*'${family}'[^}]*url\\('\\.\\/assets\\/fonts\\/${family}-\\d+\\.woff2'\\)`,
        's',
      );
      expect(CSS, `@font-face for ${family}`).toMatch(face);
    }
    // No @font-face may pull a remote font.
    expect(CSS).not.toMatch(/src:\s*url\(\s*['"]?https?:/);
  });

  it(':root defines the font + house palette custom properties', () => {
    expect(CSS).toMatch(/--font-display:\s*'Cinzel'/);
    expect(CSS).toMatch(/--font-body:\s*'Alegreya'/);
    for (const house of ['emberfall', 'greyspear', 'ravenholt', 'duskmere']) {
      expect(CSS, `--house-${house}`).toMatch(new RegExp(`--house-${house}:`));
    }
  });

  it('font usage routes through the custom properties (no bare Cinzel/Alegreya literals outside @font-face/:root)', () => {
    // Strip the @font-face blocks and the :root block; whatever remains must not name the raw families.
    const stripped = CSS.replace(/@font-face\s*\{[^}]*\}/gs, '').replace(/:root\s*\{[^}]*\}/s, '');
    expect(stripped).not.toMatch(/font-family:\s*'Cinzel'/);
    expect(stripped).not.toMatch(/font-family:\s*'Alegreya'/);
    // Form controls must inherit the family (else they compute to the UA default and fail the audit).
    expect(CSS).toMatch(/input,\s*select,\s*textarea[^{]*\{[^}]*font-family:\s*inherit/);
  });

  it('rejects Inter entirely — the full-serif decision leaves no Inter reference in the v3 CSS (T-214)', () => {
    // Gate 1 (2026-07-19): body text is full old-style serif; a neutral web sans now FAILS the rubric.
    // This is the unit-level "audit rejects Inter" signal that mirrors shots-v3.mjs dropping it from OURS.
    // Word-bounded so it flags the font family / file names but not incidental words like "Interactive".
    expect(CSS).not.toMatch(/\bInter\b/);
  });

  it('all five woff2 files and both OFL licenses are committed and non-empty', () => {
    for (const base of WOFF2) {
      const st = statSync(resolve(ROOT, FONT_DIR, `${base}.woff2`));
      expect(st.size, `${base}.woff2 size`).toBeGreaterThan(0);
    }
    for (const lic of LICENSES) {
      const st = statSync(resolve(ROOT, FONT_DIR, lic));
      expect(st.size, `${lic} size`).toBeGreaterThan(0);
    }
  });

  it('each committed woff2 begins with the wOF2 magic (a real font, not an error page)', () => {
    for (const base of WOFF2) {
      const buf = readFileSync(resolve(ROOT, FONT_DIR, `${base}.woff2`));
      expect(buf.subarray(0, 4).toString('latin1'), `${base}.woff2 magic`).toBe('wOF2');
    }
  });
});
