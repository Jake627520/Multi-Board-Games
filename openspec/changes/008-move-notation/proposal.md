# Change 008: Move Notation (008-move-notation)

## 1. Problem Statement
The platform tracks move histories inside `GameSession.getHistory()`, but records only raw move objects (e.g. `{ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }`). Players have no human-readable record of their match, such as traditional Chinese chess notation (e.g., 「炮二平五」「馬8進7」) or Gomoku coordinate notation (e.g., `H8`). Providing standard notation improves usability, enables clear match review, and prepares the platform for future PGN export and game replay.

## 2. Proposed Change
1. **Xiangqi Move Notation (`src/games/xiangqi/notation.ts`)**:
   - Function: `toXiangqiNotation(move: XiangqiMove, stateBefore: XiangqiState): string`.
   - Red uses Chinese numerals (`一` to `九`), Black uses Arabic numerals (`1` to `9`).
   - Handles advance (`進`), retreat (`退`), and traverse (`平`).
   - Distinguishes straight-moving pieces (step distance) vs diagonal-moving pieces (target file).
   - Resolves ambiguous same-file pieces (`前` / `後`).
2. **Gomoku Move Notation (`src/games/gomoku/notation.ts`)**:
   - Function: `toGomokuNotation(move: GomokuMove): string`.
   - Maps $15 \times 15$ grid coordinates to algebraic format (`A`–`O`, `1`–`15`), e.g., center $(7, 7) \rightarrow$ `H8`.
3. **MoveHistory Component (`src/ui/components/MoveHistory.tsx`)**:
   - Display a scrollable, sequentially numbered move list with player identification and latest move auto-scroll.
4. **UI Integration**:
   - Embed `MoveHistory` into `XiangqiBoard` and `GomokuBoard` side panels.

## 3. Non-Goals
- No interactive board state jumping/scrubbing by clicking past moves.
- No external PGN/FEN file import or export dialogs.
- No modifications to core engine rules or AI decision logic.

## 4. Acceptance Criteria
- Xiangqi moves are accurately translated into traditional Chinese notation.
- Gomoku moves are translated into algebraic coordinates.
- Move history updates live on each move and cleanly unwinds on undo/reset.
- All unit and regression tests pass with 0 errors.
