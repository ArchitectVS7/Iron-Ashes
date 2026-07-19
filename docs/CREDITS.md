# Credits & Asset Licenses

All bundled assets for the Iron Throne of Ashes v3.1 presentation layer are CC0 or CC-BY,
committed to the repository (no runtime CDN / network fetches), and recorded here per the M2
guardrail (`docs/ROADMAP-V3.1-UI.md` §3). This file accrues entries as the sprint adds assets
(textures, fonts, icons, audio).

## Assets

| Asset | Description | Source | Author | License |
| --- | --- | --- | --- | --- |
| `src/ui-v3/assets/table-texture.svg` | Seamless dark-oak table surface under the board (procedural stitched-turbulence wood grain + plank seams). | Self-authored for this repo (T-201, 2026-07-18). | Iron Throne of Ashes project | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Fonts

Both faces are **self-hosted** under `src/ui-v3/assets/fonts/` (latin-subset woff2, committed) and
declared via `@font-face` in `src/ui-v3/ui-v3.css` — there is **no runtime CDN / network fetch**
(T-202, 2026-07-18). Each family ships its SIL Open Font License notice alongside the woff2.

| Font | Role | Weights | Source | Author | License |
| --- | --- | --- | --- | --- | --- |
| Cinzel | Display (titles, plaques) | 400, 700 | [github.com/google/fonts `ofl/cinzel`](https://github.com/google/fonts/tree/main/ofl/cinzel) | Natanael Gama / The Cinzel Project Authors | [OFL-1.1](https://openfontlicense.org) (`src/ui-v3/assets/fonts/Cinzel-OFL.txt`) |
| Inter | Body / UI | 400, 500, 600 | [github.com/google/fonts `ofl/inter`](https://github.com/google/fonts/tree/main/ofl/inter) | Rasmus Andersson / The Inter Project Authors | [OFL-1.1](https://openfontlicense.org) (`src/ui-v3/assets/fonts/Inter-OFL.txt`) |

Both are variable fonts; the committed latin-subset woff2 covers the declared weight range, so a
single file backs each family's `@font-face` weights.
