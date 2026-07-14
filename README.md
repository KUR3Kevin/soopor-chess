# Soopor Chess

Soopor Chess is a self-contained browser chess game with standard chess rules,
local Player vs Player (PvP), Player vs Computer (PvC), and an optional SUPER
mode with charge-based abilities.

## Game modes

- **Player vs Player** — two players share the same device.
- **Player vs Computer** — the human plays White and the computer plays Black.
- **SUPER mode** — enables Recall, Firewall, Overclock, Glitch, and Scan perks.

PvC supports paired undo: after the computer replies, Undo rolls back both the
computer move and the human move so control returns to the human.

## Deploy via Netlify CLI

```bash
npx netlify deploy
npx netlify deploy --prod
```

## Or deploy via Git

1. Push to GitHub
2. Connect repo to Netlify
3. Set publish directory to root (`.`)
4. No build command needed (static site)

## Files

- `index.html` — main game UI (imports engine.js as ES module)
- `engine.js` — chess rules and state engine
- `computer.js` — deterministic computer move selection for PvC
- `engine.test.js` — chess-rule and variant regression tests
- `computer.test.js` — computer-player regression tests
- `netlify.toml` — Netlify config (headers, caching)

## Test

```bash
npm test
```

The suite covers standard move generation, castling, promotion, en passant,
undo, checkmate, stalemate, computer replies, and SUPER variant operations.

## Requirements

- The HTML and JavaScript modules must be published together
- Server must serve `.js` files with `application/javascript` MIME type (Netlify does this by default)
- No external dependencies — fully self-contained
