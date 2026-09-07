# Change 002: Add Xiangqi Game Engine

## 1. Problem Statement
The platform requires its first production game engine: Chinese Chess (Xiangqi / 中國象棋).
The engine must faithfully implement all official board coordinates, piece movement rules, movement restrictions (horse legs, elephant eyes, cannon screens), king safety (flying general, check, self-check prohibition), and game termination conditions (checkmate, stalemate/困斃).

## 2. Proposed Change
Implement the complete Xiangqi engine under `src/games/xiangqi/` implementing `GameEngine<XiangqiState, XiangqiMove>`:
- `board.ts`: 9x10 grid metrics, river check, palace bounds.
- `setup.ts`: 32 initial piece allocations, positions, and red starting player.
- `rules.ts`: Pseudo-move generator, check detector, flying general detector, legal move filter, and win/loss evaluator.
- `engine.ts`: `createXiangqiEngine()` factory complying with `GameEngine`.

## 3. Scope & Invariants
- **In Scope**:
  - Full board, piece, and movement rules.
  - Checkmate & Stalemate (困斃判負) compliance with World/Asian Xiangqi Federation rules.
  - JSON state serialization round-trip.
- **Out of Scope**:
  - UI board components (located in `src/ui/`).
  - Threefold repetition / perpetual check rules (deferred to next rules refinement change).
  - AI / Minimax engines.

## 4. Acceptance Criteria
- 100% of the 7 piece types abide by movement and obstruction rules.
- Illegal self-check moves are strictly eliminated from `getLegalMoves()`.
- Flying General is detected as mutual check.
- When in check with 0 legal moves: Game Over, checked player loses.
- When NOT in check with 0 legal moves: Game Over, immobilized player loses (Stalemate / 困斃).
- Full suite of TDD tests passes with 0 regressions.
