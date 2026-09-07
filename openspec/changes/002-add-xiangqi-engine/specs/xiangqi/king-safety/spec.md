# Xiangqi King Safety Spec (Change 002)

Reference living spec at `openspec/specs/xiangqi/king-safety/spec.md`.

- Check: General attacked by enemy piece.
- Flying General: Generals facing along same file with 0 intervening pieces constitutes mutual check.
- Self-check rejection: Moves that result in `isInCheck(nextState, player) === true` are illegal and excluded from `getLegalMoves()`.
