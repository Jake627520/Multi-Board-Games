# Change 004: Core Genericity and Xiangqi Advanced Rules

## 1. Problem Statement
1. **Core Genericity**: Currently, `src/core/game/types.ts` hard-codes `Player` to `"red" | "black"` and restricts `GameId` to a fixed 4-game union. Adding games with different player models (e.g., Gomoku using `"black" | "white"` or multiplayer checkers) requires altering platform core types.
2. **Xiangqi Rule Gaps**: The current Xiangqi engine lacks adjudication for cyclical board states:
   - Threefold Repetition (三次重複局面和棋)
   - Perpetual Check (長將判負)
   - Perpetual Chase (長捉判負)
   - Non-capture move counter / Sixty-move draw (自然限招)

## 2. Proposed Changes
1. **Core Platform**:
   - Generalize `Player` to `string` (backward-compatible with `"red" | "black"`).
   - Generalize `GameId` to `string` allowing arbitrary engine registration.
   - Clarify `GameEngine` contract for draw states (`isGameOver === true && getWinner === null`).
2. **Xiangqi Advanced Rules**:
   - Track `positionHistory`, `checkHistory`, and `nonCaptureCount` within `XiangqiState`.
   - Implement board signature hashing (`boardSignature`).
   - Implement **Perpetual Check detection**: if a cyclical repetition occurs and the repeating side gave check on every move in the cycle, that side loses immediately (`winner = opponent`).
   - Implement **Threefold Repetition detection**: if an identical board state with the same player turn occurs 3 times without one-sided violation, the game ends in a draw (`isDraw = true`, `winner = null`).
   - Implement **Non-capture count (自然限招)**: if 120 consecutive half-moves (60 full rounds) elapse without a capture, the game is declared a draw.

## 3. Non-Goals
- No UI modifications.
- No AI or bot integrations.
- No implementation of other board games in this change.
- No complex full-text Chinese notation engine (deferred to separate notation change).

## 4. Acceptance Criteria
- `GameRegistry` accepts arbitrary engine with custom `GameId` and custom `Player` without type errors.
- Threefold repetition triggers game over as a draw.
- Perpetual check (single-sided continuous check in a cycle) awards victory to the checked player.
- 120 non-capture half-moves triggers game over as a draw.
- All existing 52 tests continue to pass without regressions.
