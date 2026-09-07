# Change 005 Design: Gomoku Game Engine

## 1. Modular Directory Structure

```text
src/games/gomoku/
├── types.ts      # GomokuPlayer, GomokuState, GomokuMove
├── board.ts      # BOARD_SIZE = 15, emptyBoard, inBounds
├── rules.ts      # checkWin, getLegalMoves, applyMove, isGameOver, getWinner
├── engine.ts     # createGomokuEngine(): GameEngine<GomokuState, GomokuMove>
└── index.ts      # Public exports
```

## 2. Algorithm & State Management

### 2.1 State Representation
```ts
export type GomokuPlayer = "black" | "white";

export interface GomokuMove {
  readonly row: number;
  readonly col: number;
}

export interface GomokuState {
  readonly board: (GomokuPlayer | null)[][];
  readonly currentPlayer: GomokuPlayer;
  readonly winner: GomokuPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
}
```

### 2.2 Directional 5-in-a-Row Detection (`checkWin`)
When a move is played at `(r, c)` by `player`:
Check 4 directional axes:
1. Horizontal: `[0, 1]` & `[0, -1]`
2. Vertical: `[1, 0]` & `[-1, 0]`
3. Main diagonal: `[1, 1]` & `[-1, -1]`
4. Anti-diagonal: `[1, -1]` & `[-1, 1]`

Count consecutive matching stones radiating from `(r, c)` in both directions along each axis. If `count >= 5`, the player wins.
This $O(1)$ directional check is executed only around the newly placed stone, maximizing performance.

### 2.3 Legal Moves Generation
Iterate all 225 cells: any cell with `board[r][c] === null` is legal unless `winner !== null || isDraw === true`.
If `isGameOver`, `getLegalMoves()` returns empty array `[]`.

### 2.4 Draw Condition
If `getLegalMoves().length === 0` and `winner === null`, `isDraw` becomes `true`.
