# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Arkanoid/Breakout clone built with plain HTML, CSS and JavaScript — zero external dependencies. Anyone should be able to open the page and play. **The game itself is not implemented yet** — this repo currently only contains the visual/audio asset scaffold (spritesheet loader, sprite sheet image, sound effects). There is no `index.html`, no game loop, and no build tooling yet.

## Development

No package manager, build step, linter, or test suite exists in this repo (and per the zero-dependency constraint, none should be introduced for the game itself). To run the game once it exists, simply open the HTML file in a browser (or serve the folder with any static file server) — do not add a bundler/transpiler.

## Assets and sprite system

- `assets/spritesheet-breakout.png` — the single sprite sheet image for all visual game objects.
- `assets/spritesheet.js` — loads the sprite sheet onto an offscreen canvas and exposes drawing helpers:
  - `loadSpritesheet(cb)` — loads the PNG once (queues callbacks if called again before ready).
  - `drawSprite(ctx, name, x, y, w, h)` — draws a static sprite by name onto a canvas context. Block color variants are looked up via the `block_<color>` naming convention (e.g. `block_red`), which maps into `SPRITES.blocks[<color>]`. Other names (`paddle`, `ball`) map directly into `SPRITES`.
  - `drawFrame(ctx, frame, x, y, w, h)` — draws a raw `{sx, sy, sw, sh}` frame rect, used for animations like explosions (`EXPLOSION_FRAMES`, keyed by color, with `EXPLOSION_DURATION` ms per full cycle).
  - Sprite coordinates (`SPRITES`, `EXPLOSION_FRAMES`) are hardcoded pixel rects into the sheet — when adding new visual elements, add their `{sx, sy, sw, sh}` coordinates here rather than reading pixels from the PNG at runtime.
- `assets/sounds/` — `ball-bounce.mp3` and `break-sound.mp3` for paddle/ball and block-break sound effects.

When implementing the game, build on top of `spritesheet.js` for rendering rather than introducing a separate asset pipeline.
