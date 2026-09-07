# Change 002 Design: Xiangqi Game Engine

## 1. Component Modularization

The Xiangqi engine is divided into cleanly separated single-responsibility modules under `src/games/xiangqi/`:

```text
src/games/xiangqi/
├── types.ts      # XiangqiState, XiangqiMove, Piece, PieceType
├── board.ts      # 9x10 grid, Palace bounds, River checks, inBounds()
├── setup.ts      # createInitialState(): 32 pieces, starting coordinates
├── rules.ts      # pseudoMoves(), isInCheck(), getLegalMoves(), applyMove(), getWinner()
└── engine.ts     # createXiangqiEngine(): GameEngine<XiangqiState, XiangqiMove>
```

## 2. Invariant & Algorithm Design

### 2.1 Pseudo-Move vs Legal-Move Separation
1. `pseudoMoves(state, piece)` generates physical destinations based solely on piece geometry and board obstructions:
   - General & Advisor: palace boundaries.
   - Elephant: $\pm 2$ diagonal, river boundary, eye check.
   - Horse: $\pm (2,1)$ or $\pm (1,2)$, leg check.
   - Chariot: orthogonal rays up to friendly block or enemy piece.
   - Cannon: orthogonal non-jump rays for steps; single screen requirement for captures.
   - Soldier: forward before river; forward/left/right after river; never backward.
2. `getLegalMoves(state, player)` filters all pseudo-moves by testing if the move leads to a state where `isInCheck(nextState, player)` is true.

### 2.2 Check & Flying General Detection
- `isInCheck(state, player)` evaluates:
  1. Flying General: Both Generals share the same file with zero intervening pieces (`countBetween === 0`).
  2. Direct attack: Any enemy piece has a pseudo-move landing on the General's intersection.

### 2.3 Game Over & Stalemate Resolution
```ts
export function isGameOver(state: XiangqiState): boolean {
  return state.winner !== null || getLegalMoves(state).length === 0;
}

export function getWinner(state: XiangqiState): Player | null {
  if (state.winner) return state.winner;
  if (getLegalMoves(state).length === 0) {
    // In Xiangqi, having no legal moves (Checkmate OR Stalemate) is a loss for current player
    return state.currentPlayer === "red" ? "black" : "red";
  }
  return null;
}
```

## 3. Serialization Protocol
- `serialize(state)`: JSON serialization.
- `deserialize(str)`: Reconstructs `XiangqiState`. Round-trip testing ensures equality of all board cells, turn, and move counter.
