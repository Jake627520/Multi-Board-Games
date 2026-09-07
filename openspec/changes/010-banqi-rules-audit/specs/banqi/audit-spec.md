# Specification: Banqi Rules Audit & Hidden Information

## Requirement 1: Hidden Information Masking
`maskHiddenState(state: BanqiState): BanqiState`

### Invariants:
1. Every piece with `isRevealed === false` MUST NOT reveal its true `player`, `type`, or `rank`.
2. Every piece with `isRevealed === true` MUST retain its original attributes.
3. Stringifying the output of `maskHiddenState` MUST NOT contain the real piece names (e.g. `"general"`) for face-down pieces.

---

## Requirement 2: Strict Face-Down Immunity
- **GIVEN** any piece (General, Chariot, Soldier, or Cannon).
- **WHEN** attacking or jumping towards a cell containing a piece with `isRevealed === false`.
- **THEN** that move MUST NOT be included in `getLegalMoves(state)`.

---

## Requirement 3: Reversible Flip in GameSession
- **GIVEN** an unrevealed piece at `{ row, col }` with true identity $P$.
- **WHEN** `session.move({ type: "flip", pos: { row, col } })` is executed.
- **AND** `session.undo()` is subsequently executed.
- **THEN** the piece at `{ row, col }` MUST have `isRevealed === false`.
- **AND** the piece's underlying identity MUST remain equal to $P$.
