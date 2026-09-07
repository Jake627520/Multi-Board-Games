# Tasks: 005 Add Gomoku Engine

## Phase 1: Specifications & TDD RED
- [x] RED: Create `tests/gomoku/board.test.ts` (15x15 size, inBounds).
- [x] RED: Create `tests/gomoku/rules.test.ts` (empty start, legal moves, invalid placement on occupied/out-of-bounds, 5-in-a-row wins in 4 directions, board full draw).
- [x] RED: Create `tests/gomoku/engine.test.ts` (GameEngine protocol conformance, serialize/deserialize, GameSession integration).

## Phase 2: Implementation (TDD GREEN)
- [x] Implement `src/games/gomoku/types.ts`.
- [x] Implement `src/games/gomoku/board.ts`.
- [x] Implement `src/games/gomoku/rules.ts`.
- [x] Implement `src/games/gomoku/engine.ts`.
- [x] Implement `src/games/gomoku/index.ts`.
- [x] Register `createGomokuEngine` in `src/games/registry.ts`.

## Phase 3: Verification
- [x] Verify all tests in `tests/gomoku/` pass.
- [x] Verify all existing 56 tests in `tests/core/` and `tests/xiangqi/` continue to pass (zero regressions).
- [x] Run `tsc --noEmit` and Vite production build.
- [x] Commit changes with clean git status.
