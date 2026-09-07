# Specification: Banqi Engine

## Requirement 1: Board Setup & Piece Distribution
The Banqi board MUST be a $4 \times 8$ grid containing exactly 32 pieces:
- Red: 1 帥, 2 仕, 2 相, 2 俥, 2 傌, 2 炮, 5 兵.
- Black: 1 將, 2 士, 2 象, 2 車, 2 馬, 2 包, 5 卒.
- Every piece MUST start face-down (`isRevealed: false`).

---

## Requirement 2: Flip & Color Assignment
- **GIVEN** a freshly created initial state.
- **WHEN** any piece at `{ row, col }` is flipped.
- **THEN** that piece becomes revealed (`isRevealed: true`).
- **AND** the active player is assigned that piece's color.
- **AND** the turn advances to the opposing player.

---

## Requirement 3: Capture Hierarchy & Invariants
- **SCENARIO: General vs Soldier**:
  - Soldier (rank 1) CAN capture General (rank 7).
  - General (rank 7) CANNOT capture Soldier (rank 1).
- **SCENARIO: Equal Ranks**:
  - Two pieces of identical rank (e.g. Horse vs Horse) CAN capture each other.
- **SCENARIO: Face-down Safety**:
  - A face-down piece CANNOT be captured.
- **SCENARIO: Cannon Jump**:
  - Cannon CAN jump over exactly 1 piece to capture a revealed enemy piece.
  - Cannon CANNOT jump over 0 pieces or 2+ pieces.
  - Cannon non-capturing move is strictly 1 adjacent orthogonal step.

---

## Requirement 4: Game Termination
- A player wins when all enemy pieces have been captured.
- A player wins when the opponent has 0 legal moves on their turn (stalemate defeat).
