# Specification: AI Player Contract & Behavior

## Requirement 1: Generic AiPlayer Interface
The platform MUST define an `AiPlayer<State, Move>` interface with:
- `readonly id: string`
- `readonly name: string`
- `selectMove(state: State, legalMoves: Move[]): Promise<Move>`

### Invariants:
1. `selectMove` MUST return a move that is strictly contained within `legalMoves`.
2. If `legalMoves` is empty, `selectMove` MUST throw an `Error("No legal moves available")`.
3. The AI MUST NOT mutate the input `state` or elements of `legalMoves`.

---

## Requirement 2: Gomoku Level 1 AI
The Gomoku Level 1 AI MUST implement `AiPlayer<GomokuState, GomokuMove>`.

### Scenario 1: Immediate Winning Move
- **GIVEN** a board where current player has 4 stones in a row with an open end.
- **WHEN** `selectMove` is invoked.
- **THEN** it MUST select the winning move that completes 5-in-a-row.

### Scenario 2: Blocking Opponent Win
- **GIVEN** a board where opponent has 4 stones in a row and would win on the next turn.
- **WHEN** `selectMove` is invoked.
- **THEN** it MUST select the move that blocks the opponent from winning.

### Scenario 3: Opening Move
- **GIVEN** an empty $15 \times 15$ board.
- **WHEN** `selectMove` is invoked for Black.
- **THEN** it MUST select the central intersection $(7, 7)$.

---

## Requirement 3: Xiangqi Level 1 AI
The Xiangqi Level 1 AI MUST implement `AiPlayer<XiangqiState, XiangqiMove>`.

### Scenario 1: Under Check
- **GIVEN** a position where the active player's General is under check.
- **WHEN** `selectMove` is invoked.
- **THEN** the returned move MUST resolve the check and result in a valid legal move.

### Scenario 2: High Value Capture
- **GIVEN** a position where an undefended enemy Chariot can be captured.
- **WHEN** `selectMove` is invoked.
- **THEN** the AI MUST prioritize capturing the high-value target over passive non-capturing moves.

---

## Requirement 4: UI Game Mode and Fallbacks
1. The UI MUST provide a mode switcher between "雙人對戰 (PvP)" and "單人對電腦 (PvE)".
2. In PvE mode, the UI MUST allow selecting which side the human player controls.
3. When it is the AI's turn, the UI MUST dispatch the AI's selected move with an ergonomic visual delay (300ms–600ms).
4. If an AI returns an illegal move, the session MUST safely reject it without corrupting game state.
