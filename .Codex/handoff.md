# Handoff — Soopor Chess

## Done so far
- Built `engine.js` chess engine with legal move rules.
- Built `index.html` cyberpunk UI.
- Added SUPER mode with perk panel and perk definitions.
- Added mobile layout fixes and a couple of perk-related patches.
- Confirmed the current code still contains perk system wiring in `index.html`.

## Current user ask
- Add a toggleable help/info section explaining all game modes and perks.
- Add PvP and PvC modes (play against computer).
- Make the game work well on phones.
- Remove SUPER from the title banner area.
- Fix perks so they actually work.
- Keep single static-site / Netlify compatibility.

## What I found in code
- `index.html` currently contains:
  - `superSwitch` toggle
  - `perkReveal` / `perkGrid`
  - `PerkSystem` class
  - `buildPerkGrid()`, `updatePerkGrid()`, `onPerkClick()`
- There is no help/info tab or PvP/PvC mode control yet.
- Perk logic exists, but the user reports it still fails in practice, so the activation path needs re-checking and likely simplification.

## Next steps
1. Inspect current move/perk activation flow end-to-end.
2. Add a toggleable help/info drawer/tab with descriptions for:
   - Classic vs Super mode
   - PvP vs PvC
   - Each perk and how charges work
3. Add a mode selector for PvP/PvC.
4. Fix perk activation and ensure it works on mobile.
5. Re-test in Brave and on a phone-sized viewport.
