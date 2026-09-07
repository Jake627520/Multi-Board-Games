# Tasks: 002 Add Xiangqi Game Engine

## Phase 1: Board & Setup Specifications
- [x] RED: Create `tests/xiangqi/board.test.ts` testing 9x10 grid, in-bounds, palaces, river.
- [x] RED: Create `tests/xiangqi/setup.test.ts` testing 32 pieces, starting player, starting layout.
- [x] GREEN: Validate existing `board.ts` and `setup.ts` against tests.

## Phase 2: Piece Movement TDD
- [x] RED: Create `tests/xiangqi/general.test.ts` (palace confinement, 1 step orthogonal).
- [x] RED: Create `tests/xiangqi/advisor.test.ts` (palace confinement, 1 step diagonal).
- [x] RED: Create `tests/xiangqi/elephant.test.ts` (2 step diagonal, river boundary, eye blocking).
- [x] RED: Create `tests/xiangqi/horse.test.ts` (L shape, 8 targets, leg blocking).
- [x] RED: Create `tests/xiangqi/chariot.test.ts` (orthogonal sliding, blocking, capture).
- [x] RED: Create `tests/xiangqi/cannon.test.ts` (sliding quiet move, 1-screen capture, 0/2 screen invalid).
- [x] RED: Create `tests/xiangqi/soldier.test.ts` (forward before river, forward/left/right after river, no backward).

## Phase 3: King Safety & Legal Move Filtering
- [x] RED: Create `tests/xiangqi/check.test.ts` (direct check detection by all attacking piece types).
- [x] RED: Create `tests/xiangqi/flying-general.test.ts` (mutual check on open file, intervening piece shields).
- [x] RED: Create `tests/xiangqi/legal-moves.test.ts` (filtering self-check, pinned pieces cannot move off ray).

## Phase 4: Game Termination & Stalemate Correction
- [x] RED: Create `tests/xiangqi/game-end.test.ts` covering:
  - Checkmate: in check with 0 moves -> opponent wins.
  - Stalemate (困斃): NOT in check with 0 moves -> opponent wins (current player loses).
  - Ongoing match: >0 moves -> gameOver false, winner null.
- [x] GREEN: Correct `getWinner()` in `src/games/xiangqi/rules.ts` to award victory to opponent on Stalemate (困斃).
- [x] REFACTOR: Ensure clean invariant separation.

## Phase 5: Serialization
- [x] RED: Add serialization round-trip test in `tests/xiangqi/engine.test.ts`.
- [x] GREEN: Verify `engine.serialize` and `engine.deserialize` preserve identical board, turns, and moves.
