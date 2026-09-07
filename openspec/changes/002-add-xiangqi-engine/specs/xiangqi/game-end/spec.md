# Xiangqi Game End Spec (Change 002)

Reference living spec at `openspec/specs/xiangqi/game-end/spec.md`.

- Checkmate: In check + 0 legal moves -> Winner is opponent.
- Stalemate (困斃): NOT in check + 0 legal moves -> Winner is opponent (immobilized player loses).
- General capture: Capturing player wins.
- Ongoing match: >0 legal moves and both generals alive -> `isGameOver` is false, `getWinner` is null.
