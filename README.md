# Soopor Chess — Netlify Deploy

## Deploy via Netlify CLI

```bash
cd ~/Documents/Projects/chess-game
netlify deploy --prod
```

## Or deploy via Git

1. Push to GitHub
2. Connect repo to Netlify
3. Set publish directory to root (`.`)
4. No build command needed (static site)

## Files

- `index.html` — main game UI (imports engine.js as ES module)
- `engine.js` — chess engine (CommonJS + ES module export)
- `netlify.toml` — Netlify config (headers, caching)

## Requirements

- Both files must be in the same directory
- Server must serve `.js` files with `application/javascript` MIME type (Netlify does this by default)
- No external dependencies — fully self-contained
