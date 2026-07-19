# Credits & Asset Licenses

All bundled assets for the Iron Throne of Ashes v3.1 presentation layer are CC0 or CC-BY,
committed to the repository (no runtime CDN / network fetches), and recorded here per the M2
guardrail (`docs/ROADMAP-V3.1-UI.md` §3). This file accrues entries as the sprint adds assets
(textures, fonts, icons, audio).

## Assets

| Asset | Description | Source | Author | License |
| --- | --- | --- | --- | --- |
| `src/ui-v3/assets/table-texture.svg` | Seamless dark-oak table surface under the board (procedural stitched-turbulence wood grain + plank seams). | Self-authored for this repo (T-201, 2026-07-18). | Iron Throne of Ashes project | [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## Icons

All resource/stat icons are **game-icons.net** SVGs (T-203, 2026-07-18), committed under
`src/ui-v3/assets/icons/` and rendered inline as `<svg>` via a `?raw` import (no runtime CDN /
network fetch). Each is licensed **CC-BY 3.0**. **Modifications:** the opaque black background
rectangle was stripped and the icon path's fill was set to `currentColor` so CSS recolors it — no
other change. Attribution note (required by CC-BY 3.0): icons by the listed authors from
[game-icons.net](https://game-icons.net), licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

| Asset | Description | Source (game-icons.net) | Author | License |
| --- | --- | --- | --- | --- |
| `src/ui-v3/assets/icons/banner.svg` | Banners resource (the muster ⚑). | [flying-flag](https://game-icons.net/1x1/lorc/flying-flag.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/holdings.svg` | Living land / holdings (castle tower + flag). | [tower-flag](https://game-icons.net/1x1/delapouite/tower-flag.html) | Delapouite | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/cards.svg` | Cards in hand. | [card-pick](https://game-icons.net/1x1/faithtoken/card-pick.html) | Faithtoken | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/retinue.svg` | Living court retainers (crossed swords). | [crossed-swords](https://game-icons.net/1x1/lorc/crossed-swords.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/skull.svg` | The dark's Ledger grudge (skull & bones). | [skull-crossed-bones](https://game-icons.net/1x1/lorc/skull-crossed-bones.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/hourglass.svg` | The dark's patience clock (sands of time). | [sands-of-time](https://game-icons.net/1x1/lorc/sands-of-time.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/embers.svg` | The dark's strike-pool (burning embers). | [burning-embers](https://game-icons.net/1x1/lorc/burning-embers.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/heart.svg` | The dark's heart HP (heart). | [heart-inside](https://game-icons.net/1x1/lorc/heart-inside.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |
| `src/ui-v3/assets/icons/action.svg` | Actions remaining (walking boot). | [walking-boot](https://game-icons.net/1x1/lorc/walking-boot.html) | Lorc | [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/) |

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
