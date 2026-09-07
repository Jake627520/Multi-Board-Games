# Change 004 Design: Core Genericity and Xiangqi Advanced Rules

## 1. Core Genericity Design

In `src/core/game/types.ts`:
```ts
export type Player = string;
export type GameId = string;
```
This minimal adjustment ensures:
- `createXiangqiEngine()` returns `GameEngine<XiangqiState, XiangqiMove>` where `currentPlayer: "red" | "black"` is a valid `Player`.
- Any future engine (e.g. `GomokuEngine` with `"black" | "white"`, `BanqiEngine`, `CheckersEngine`) seamlessly satisfies `GameEngine` without core type modification.
- `GameRegistry.register()` accepts any `GameEngine` implementation.

## 2. Xiangqi Cyclical Adjudication Architecture

### 2.1 State Representation
```ts
export interface XiangqiState {
  readonly board: (Piece | null)[][];
  readonly currentPlayer: Player;
  readonly winner: Player | null;
  readonly moveNumber: number;
  readonly isDraw?: boolean;
  readonly terminationReason?:
    | "checkmate"
    | "stalemate"
    | "perpetual_check"
    | "perpetual_chase"
    | "threefold_repetition"
    | "sixty_move_draw";
  readonly positionHistory?: readonly string[];
  readonly checkHistory?: readonly boolean[];
  readonly nonCaptureCount?: number;
}
```

### 2.2 Board Signature
A deterministic signature `boardSignature(state)` represents:
`[currentPlayer]:[piece.id@row,col;...]`
Since piece IDs are stable throughout a match, this gives a canonical representation of intersections and turn.

### 2.3 Repetition & Perpetual Check Resolution
When `applyMoveUnchecked` commits a move:
1. Increment or reset `nonCaptureCount`:
   - If captured a piece: reset to 0.
   - Otherwise: `nonCaptureCount + 1`.
2. Compute `isCheck = isInCheck(nextState, nextPlayer)`.
3. Append current state signature to `positionHistory`.
4. Count occurrences of `currentSignature` in `positionHistory`:
   - If count >= 2 (a cycle has completed):
     - Extract moves in the cycle.
     - Check if the player delivering moves in the cycle **checked on every one of their turns in that cycle**.
     - If YES: **Perpetual Check (長將判負)**. The checking player loses immediately:
       `winner = opponent`, `terminationReason = "perpetual_check"`.
   - If count >= 3 and neither side is guilty of perpetual check:
     - **Threefold Repetition (三次重複和棋)**:
       `isDraw = true`, `winner = null`, `terminationReason = "threefold_repetition"`.
5. If `nonCaptureCount >= 120`:
   - **Sixty-Move Rule (自然限招和棋)**:
     `isDraw = true`, `winner = null`, `terminationReason = "sixty_move_draw"`.
