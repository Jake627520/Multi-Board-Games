# Change 005: Add Gomoku Game Engine

## 1. Problem Statement
To validate the multi-game architecture of the platform, a second complete game engine—Gomoku (五子棋)—is required. Gomoku provides distinct characteristics from Xiangqi:
- $15 \times 15$ grid instead of $9 \times 10$.
- Simple stone placement mechanics rather than piece traversal.
- Player set `"black" | "white"` rather than `"red" | "black"`.
- Winning line detection (5-in-a-row) across all 4 axes.

## 2. Proposed Change
Implement a dedicated `GomokuEngine` under `src/games/gomoku/`:
1. `types.ts`: `GomokuPlayer`, `GomokuState`, `GomokuMove`.
2. `board.ts`: 15x15 boundary checks and grid helpers.
3. `rules.ts`: Stone placement legality, 5-in-a-row detection (`checkWin`), board full draw detection.
4. `engine.ts`: Implementation of `GameEngine<GomokuState, GomokuMove>`.
5. Register `"gomoku"` into `src/games/registry.ts`.
6. Add unit and session integration tests in `tests/gomoku/`.

## 3. Non-Goals
- No UI board component for Gomoku in this change (engine first via TDD).
- No Renju opening rules (swap/restricted fouls like double-threes, double-fours, overlines); standard Free-style Gomoku only.
- No AI or bot opponent.
- No modifications to Core Platform or Xiangqi Engine.

## 4. Acceptance Criteria
- 15x15 board starts empty with Black to move.
- All empty points are legal moves; occupied points are rejected with `"Illegal move"`.
- 5-in-a-row in horizontal, vertical, and both diagonal orientations terminates the game with the correct winner.
- Full board with no 5-in-a-row results in a draw.
- Engine registers successfully in `GameRegistry` and works with generic `GameSession`.
- All existing 56 tests and all new Gomoku tests pass.
