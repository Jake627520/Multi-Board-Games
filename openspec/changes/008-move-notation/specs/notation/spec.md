# Specification: Move Notation

## Requirement 1: Xiangqi Notation Generator
`toXiangqiNotation(move: XiangqiMove, stateBefore: XiangqiState): string`

### Invariants:
1. Returns a 4-character traditional Chinese string.
2. Throws an error if no piece exists at `move.from` in `stateBefore`.
3. For Red:
   - First character is piece type or `前`/`後`.
   - File numbers and step counts use Chinese digits (`一`至`九`).
4. For Black:
   - First character is piece type or `前`/`後`.
   - File numbers and step counts use Arabic digits (`1`至`9`).

### Scenario 1: Red Cannon Central Traverse
- **GIVEN** an initial Xiangqi board.
- **WHEN** Red moves Cannon from `(7, 1)` to `(7, 4)`.
- **THEN** notation MUST be `"炮二平五"`.

### Scenario 2: Black Knight Advance
- **GIVEN** an initial Xiangqi board.
- **WHEN** Black moves Horse from `(0, 1)` to `(2, 2)`.
- **THEN** notation MUST be `"馬2進3"`.

### Scenario 3: Red Same-File Double Chariot
- **GIVEN** Red has two chariots on col 8 at row 9 and row 5.
- **WHEN** Red moves the front chariot at row 5 to row 4.
- **THEN** notation MUST be `"前車進一"`.

---

## Requirement 2: Gomoku Notation Generator
`toGomokuNotation(move: GomokuMove): string`

### Invariants:
1. Returns uppercase column letter followed by row number ($1 \dots 15$).

### Scenario 1: Center Placement
- **GIVEN** a move at `{ row: 7, col: 7 }`.
- **WHEN** `toGomokuNotation` is called.
- **THEN** it MUST return `"H8"`.
