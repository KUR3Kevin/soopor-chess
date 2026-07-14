# Soopor Chess

> Chess with optional perks, in a red / white / mellow-orange theme

## Concept
A chess implementation with non-standard rules through 6 unique one-time-use abilities ("perks") that change gameplay strategy:

- **Pawn Sprint**: Advance pawn 4 squares on first move
- **Double Turn**: Take two moves per turn (excluding king/queen)
- **Pawn Recall**: Recapture piece when pawn promotes
- **Firewall**: Shield piece from capture for one turn
- **Scan**: Highlight opponent's attack squares
- **Triple Advance**: Setup phase only — before your first regular move, send one pawn three squares forward

## PvC Difficulty
Beginner (random/1-ply), Pro (3-ply minimax), and Expert (4+ ply with tactical extensions and cross-game memory).

## Improvements Needed
- [ ] Implement sound effects for check/move/perks
- [ ] Add 3D piece animations when capturing

## Getting Started
```bash
python3 -m http.server 8090
cd ~/Documents/Projects/chess-game && open http://localhost:8090
```