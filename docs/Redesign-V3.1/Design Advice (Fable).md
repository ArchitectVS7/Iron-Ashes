That confirmed what I suspected: the v3 UI is vanilla TS with zero runtime dependencies and ~200
  lines of CSS — no animation library, no sound, no art assets anywhere in the stack. It looks like a
  web app because, materially, that's all it is. Here's my big-picture advice, in order of leverage.

  1. The biggest lever isn't a library — it's giving the agent eyes

  The single most effective thing you can install is a screenshot feedback loop. When I build UI blind,
  you get "semantically correct div soup." When I can render the page, screenshot it, look at the
  screenshot, and iterate, visual quality improves dramatically — the same way it does for a human
  designer.

  - Playwright MCP (claude mcp add playwright -- npx @playwright/mcp@latest) or Chrome DevTools MCP —
  lets me drive the running Vite app, take screenshots, and critique my own output. This is the "make
  it look like a game" workhorse: build → screenshot → "the hand fan overlaps the board, tokens have no
  drop shadow, the parchment texture didn't load" → fix → repeat.
  - Pair it with the frontend-design skill you already have — it's built exactly for pushing past
  templated web-app defaults toward an intentional aesthetic. The ui-implementer skill is also already
  available for when you have a mockup/screenshot to match pixel-for-pixel.

  2. Encode your house style as a custom skill

  You have multiple prototypes and one recurring complaint. That's the textbook case for a custom skill
  (e.g. ~/.claude/skills/tabletop-ui/SKILL.md) that every project session pulls in. It should state,
  once, things like:

  - "Games render on a textured table surface, never a white/flat background. Cards are cards: rounded
  corners, face/back, 3D flip on reveal, fanned in the hand. Resources are tokens with icons, never
  bare numbers. Every state change animates; every animation has a sound."
  - Your chosen libraries (below), asset sources, fonts, and layout conventions (board center-stage,
  HUD as diegetic overlays — not a sidebar of stats).

  That turns "please make it look like a game" from a per-project plea into a default I follow
  automatically.

  3. The library stack for "board game feel" (vanilla-TS friendly)

  You don't need a game engine for tabletop UIs — DOM + the right three libraries gets you 90% of the
  feel:

  ┌───────────┬─────────────────────────┬──────────────────────────────────────────────────────────┐
  │   Need    │     Recommendation      │                           Why                            │
  ├───────────┼─────────────────────────┼──────────────────────────────────────────────────────────┤
  │           │                         │ Timeline choreography — "token slides along path,        │
  │ Animation │ GSAP (or Motion One)    │ arrives, board shakes, score ticks up" as one sequenced  │
  │           │                         │ statement. Its Flip plugin animates a card moving from   │
  │           │                         │ hand → table automatically.                              │
  ├───────────┼─────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Sound     │ Howler.js               │ Sprite-based SFX, dead simple, no framework assumptions. │
  ├───────────┼─────────────────────────┼──────────────────────────────────────────────────────────┤
  │           │                         │ perspective + rotateY gives real card flips; a few lines │
  │ Cards     │ Plain CSS 3D transforms │  of math gives a fanned hand with hover-raise. No        │
  │           │                         │ library needed.                                          │
  ├───────────┼─────────────────────────┼──────────────────────────────────────────────────────────┤
  │ Juice     │ canvas-confetti, CSS    │ Victory moments, glow on legal moves.                    │
  │           │ filter/drop-shadow      │                                                          │
  └───────────┴─────────────────────────┴──────────────────────────────────────────────────────────┘

  Escalation ladder if a project outgrows the DOM: PixiJS (WebGL 2D — hundreds of animated tokens,
  particles, shaders, still just a rendering library so your engine/reducer architecture is untouched)
  → Phaser (full 2D game framework — better for action games than board games) → Three.js (3D table,
  physically tumbling dice). For your engine-first, reducer-driven architecture, DOM+GSAP now and
  PixiJS later is the right ladder; the UI stays a pure projection of GameState, which you already do
  well. When you do escalate, the standard endgame for browser board/card games is a hybrid: canvas
  (Pixi) for the board and pieces, DOM for hand/HUD/menus — you don't have to move everything at once.

  Two practical notes: GSAP's license is free for most use but check the terms for commercial games
  (anime.js is a lighter, MIT-licensed fallback if they bug you). And render card faces from data via a
  small SVG/canvas card-face generator rather than baking art into layout — that way swapping card art
  or adding a new card type never touches layout code, which matters when the same kit serves multiple
  prototypes.

  3b. The architectural fix for "it snaps instead of animates"

  A library alone won't make actions feel physical if the renderer just re-renders the new state — the
  web-app feel comes precisely from the UI snapping to new state instead of animating the transition
  from old state to new. The fix is a transition layer between reducer and renderer: diff old vs. new
  GameState, emit a list of semantic "moves" ("card flew from hand to discard", "token moved 3 spaces",
  "score ticked from 4 to 7"), and play those through an animation queue (GSAP timeline + a
  SoundManager.play() per move) before settling on the final rendered state. This fits your
  applyCommand/reducer architecture perfectly — the engine stays pure and deterministic; the queue is
  purely presentational. The GSAP animation presets in the kit (section 5) are exactly the vocabulary
  this layer speaks.

  4. Assets — the real reason it looks like a web app

  Numbers in a sidebar look like a web app because there's no art. Free, high-quality, license-safe
  sources:

  - Kenney.nl — CC0 board-game packs: cards, dice, tokens, meeples, entire UI packs (panels, buttons,
  banners). This alone transforms a prototype.
  - game-icons.net — ~4,000 CC-BY SVG icons: swords, crowns, shields, potions. Perfect for resource
  tokens; recolorable in CSS since they're SVG.
  - Kenney audio packs / freesound.org — card slides, token clacks, page turns.
  - itch.io asset packs — for anything more thematic than Kenney's generic style (fantasy court/throne
  imagery would fit Iron Ashes specifically); check licenses per pack.
  - Fonts: Google Fonts has strong thematic options (e.g. Cinzel/Pirata One for your dark-fantasy
  setting) — a display font on titles plus a readable body font instantly de-web-app-ifies a UI.
  - Textures: parchment/wood/stone backgrounds (ambientCG, Kenney) — a table texture under the board is
  possibly the highest impact-per-minute change available.
  - For bespoke art later: AI image generation for card illustrations and board art, batch-produced
  against a style prompt kept in the skill.

  5. Build the kit once, reuse everywhere

  Since this spans multiple projects, extract a small tabletop UI kit (its own repo/package):
  <game-card>, <token-stack>, hand-fan layout, turn-track ribbon, dice roller, SoundManager, GSAP
  animation presets (dealCard, moveToken, flipReveal, shake), plus the base theme (textures, fonts,
  shadows). Every future prototype starts at "looks like a game" instead of at zero. This is a
  genuinely good candidate for a dedicated session: point me at the kit repo, load frontend-design, and
  build it screenshot-driven with Playwright.

  Once the kit exists, the DesignSync tool (available in this environment) can sync it to a claude.ai
  Design System project — a versioned, browsable component library outside the repo. Not useful before
  the kit exists; worth wiring up after.

  Suggested first move

  Pilot on Iron Ashes v3: add GSAP + Howler, pull a Kenney UI pack + game-icons for resource tokens,
  put the board on a textured table with a thematic font, render the hand as fanned cards, and animate
  pledge/action resolution — all screenshot-iterated via Playwright MCP. That gives you a concrete
  before/after to judge, and the working patterns get lifted into the shared kit and the tabletop-ui
  skill.

  ---
  Incorporated from the Sonnet review (2026-07-18): the state-diff → semantic-moves animation queue
  (§3b — its strongest point), the hybrid Pixi-board/DOM-HUD endgame pattern, the GSAP license caveat +
  anime.js fallback, the data-driven card-face generator, itch.io as a thematic asset source, and
  DesignSync for the shared kit.