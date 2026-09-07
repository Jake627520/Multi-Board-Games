# Tasks: 006 UI Multi-Game Platform

## Phase 1: Hooks & State Management
- [x] Create `src/ui/hooks/useGameSession.ts` wrapping `GameSession`.
- [x] Create `src/ui/components/StatusBar.tsx` for player turn, check, win/draw banners, undo, and reset.
- [x] Create `src/ui/components/GameSwitcher.tsx` for dynamic game selection.

## Phase 2: Board Components & Layout
- [x] Create `src/ui/components/GomokuBoard.tsx` (15x15 grid, stone rendering, click-to-move, gameover display).
- [x] Refactor `src/ui/XiangqiBoard.tsx` to maintain decoupled architecture.
- [x] Update `src/styles.css` with clean styles for 15x15 Gomoku board and status panels.
- [x] Update `src/App.tsx` to switch dynamically between `XiangqiBoard` and `GomokuBoard`.

## Phase 3: Automated Verification
- [x] Create unit/component integration test `tests/ui/game-switcher.test.ts`.
- [x] Run full vitest suite (72+ tests).
- [x] Run `tsc --noEmit` and Vite production build.
