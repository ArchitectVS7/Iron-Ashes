# Card-Art Descriptor Spec — parameterized image generation

**Status:** SPEC (descriptors frozen 2026-07-20, fifth Gate-1 review). The generation *workflow* is
deferred, not built — see "Deferred workflow" below. This file is the descriptor source that workflow
will consume; it is not wired to any code yet.

## Why this exists

Item #2 of `RUBRIC.md` (cards read as rich faces) is currently carried by the data-driven SVG
generator (`src/ui-v3/card-face.ts`), which yields correct-but-blank cream faces in the fan. Per the
user's fifth-review decision: the card **art areas** will be filled by **targeted, parameterized image
generation**, not hand-built UI assets. The lineage is **_Shadowlord_ (Parker Brothers, 1983)** — a
whole new game, but its character cards were its most memorable artifact, so the art carries real
weight here.

The generator's contract already reserves an **art area** per face and derives an ornament from the
face identity hash (`card-face.ts` §"Geometry"). A generated raster (or SVG) drops into that art
window with **zero layout change** — the frame, name banner, corner value/suit, and rules plate are
unaffected. This spec defines *what image* fills each art area.

## Parameter axes

Every card art request is a pure function of these axes (so it stays deterministic and cache-keyable):

| Axis | Values | Source of truth |
|---|---|---|
| `kind` | `warlord` · `marshal` · `steward` · `herald` · `power` (Muster) | `card-face.ts` REGISTRY keys |
| `house` | `emberfall` · `greyspear` · `ravenholt` · `duskmere` | `board-view.ts` House / CSS `--house-*` |
| `identity` | the card's name string (e.g. "Mira of the Fens") | piece `name` |
| `value` | Muster cards only — the corner strength number | piece datum |

`identity` seeds per-character variation (face, pose) so two Marshals of the same house still differ;
`kind` + `house` fix the archetype silhouette and palette.

## Global style descriptor (applies to every card)

> Candlelit dark-fantasy character portrait, oil-and-ash painterly render, single warm rim light from
> the lower left as if from a hearth, deep ash-black background with smouldering embers, muted
> desaturated palette (no saturated primaries), weathered and grim, painterly brushwork, 3/4 bust
> framing, textured like an old varnished panel. NOT clean, NOT glossy, NOT modern-illustration flat.

Aspect: the art window is the upper region of a 100×140 TCG face — request **~4:3 portrait** and let
the frame crop. Keep the subject centred with headroom for the name banner overlap.

## House palette modifiers (muted to the candlelit register)

| House | Accent (`--house-*`) | Descriptor modifier |
|---|---|---|
| Emberfall | ember-orange `#c15f2c` | ember-orange heat, forge-glow on metal, cinders rising, scorched banners |
| Greyspear | iron/steel `#8a93a3` | cold steel greys, hoarfrost, spear-and-shield, moonlit-iron sheen |
| Ravenholt | deep viridian `#2f7d5b` | mossy viridian shadow, raven motifs, ivy-choked stone, bog-lantern green |
| Duskmere | dusk-violet `#7a6aa0` | twilight violet haze, veils and sigils, arcane candle-smoke, dusk sky |

## Per-kind subject descriptors

Combine `global style` + `house modifier` + the kind line below + `identity` seed.

- **warlord** — "the house's leader, a battle-worn noble in scarred half-plate bearing the house sigil;
  crowned or helmed; commanding, weary, resolute; last-banner-of-a-ruined-house gravitas."
- **marshal** — "the muscle: a heavy, brutal warrior mid-stride, oversized weapon, grim set jaw,
  ready to make a last stand; kinetic, imposing."
- **steward** — "the economy-keeper: a robed administrator with ledgers, keys, granary and coin,
  quietly shrewd; hearth-warm, unmartial, patient."
- **herald** — "the political reach: a cloaked envoy with scroll and seal, half-lit, persuasive and
  ambiguous; never armed; whispering-at-court energy." *(Herald is default-OFF / advanced.)*
- **power (Muster Card)** — NOT a portrait: "a mustered force or omen — levied troops, a war-beacon,
  a pledge-oath scene, or an ill portent — scaled to the card's `value` (low value = a lone levy,
  high value = a marshalled host); house-tinted."

## Deferred workflow (later task, not now)

The generation pipeline is filed as later work (post-M2 UI polish / a dedicated art task). When built
it must:
1. Take `(kind, house, identity, value?)` and compose the descriptor above **deterministically** —
   no `Math.random`/`Date.now` in the prompt assembly (project determinism rule).
2. Emit assets into a committed art directory, credited CC0/CC-BY in `docs/CREDITS.md`, respecting the
   `vite build` ≤ 3 MB bundle budget (art may be lazy-loaded / externalized if it would blow the cap).
3. Drop each asset into the existing `card-face.ts` art window with **no layout-file edit** — the
   whole point of the T-204 data-driven face.
4. Keep the SVG generator as the guaranteed fallback for any identity without a generated asset.

Until then, item #2 is accepted as-is (blank painterly-frame fan) with this spec standing as the
recorded plan, not a silent gap.
