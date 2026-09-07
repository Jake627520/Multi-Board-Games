# Change 006: UI Multi-Game Platform

## 1. Problem Statement
The platform now has two robust, fully tested game engines—Xiangqi (中國象棋) and Gomoku (五子棋)—operating behind generic `GameEngine` and `GameSession` abstractions. However, the user interface currently only renders Xiangqi, showing a placeholder for any other game. A generic, componentized frontend is needed to allow players to switch between games, play full matches, undo moves, and view game statuses.

## 2. Proposed Change
1. **Generic Session Hook (`useGameSession`)**:
   Encapsulate `GameSession` lifecycle, legal move querying, error handling, undo, and reset operations in a clean React hook.
2. **GomokuBoard Component (`src/ui/components/GomokuBoard.tsx`)**:
   Render a $15 \times 15$ grid board with stone placement, hover hints, turn indicator, win/draw banners, and click handling.
3. **StatusBar Component (`src/ui/components/StatusBar.tsx`)**:
   Reusable game status panel indicating current player, victory, draw, check warning, and control buttons (Undo, Reset).
4. **GameSwitcher & App Update (`src/ui/components/GameSwitcher.tsx`, `src/App.tsx`)**:
   Allow switching dynamically between Xiangqi and Gomoku, instantiating fresh game sessions.

## 3. Non-Goals
- No UI modifications to engine rules (rules remain strictly inside engine/session).
- No network multiplayer or WebSockets.
- No AI opponent UI.
- No sound synthesis or external heavy sprite packs.

## 4. Acceptance Criteria
- Game switcher permits selecting between Xiangqi and Gomoku.
- Gomoku renders a 15x15 board where users can click empty intersections to alternate black and white stones.
- Five-in-a-row or full-board draw immediately displays outcome and disables further moves.
- Undo and Reset controls work for both games.
- All unit, integration, and UI tests pass with zero regressions.
