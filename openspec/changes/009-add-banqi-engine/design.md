# Design 009: Banqi Engine Architecture

## 1. Types & State Specification (`src/games/banqi/types.ts`)

```typescript
export type BanqiPlayer = "red" | "black";

export interface BanqiPiece {
  readonly id: string;
  readonly player: BanqiPlayer;
  readonly type: PieceType;
  readonly rank: number;       // 7 (General) down to 1 (Soldier)
  readonly isRevealed: boolean;
}

export type BanqiMove =
  | { readonly type: "flip"; readonly pos: Position }
  | { readonly type: "move"; readonly from: Position; readonly to: Position };

export interface BanqiState {
  readonly board: (BanqiPiece | null)[][]; // 4 rows x 8 cols
  readonly currentPlayer: BanqiPlayer;
  readonly player1Color: BanqiPlayer | null; // assigned on first flip
  readonly winner: BanqiPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
}
```

## 2. Capture & Move Invariants

### 2.1 Piece Hierarchy & Standard Captures
- `rank`: General (7), Advisor (6), Elephant (5), Chariot (4), Horse (3), Cannon (2), Soldier (1).
- Non-cannon pieces:
  - Can move 1 square orthogonally into an empty square (`board[to.row][to.col] === null`).
  - Can capture an adjacent orthogonal target if:
    1. Target is face-up (`target.isRevealed === true`).
    2. Target is enemy (`target.player !== attacker.player`).
    3. `(attacker.rank === 1 && target.rank === 7)` OR `(attacker.rank !== 7 && attacker.rank >= target.rank)`.
    4. General (7) CANNOT capture Soldier (1).

### 2.2 Cannon (炮/包) Mechanics
- Non-capture move: exactly 1 square orthogonally into an adjacent empty square.
- Capture move:
  - Must move along straight row or column.
  - Exactly 1 screen piece (can be face-up or face-down, friend or foe) between Cannon and Target.
  - Target must be a face-up enemy piece (`target.isRevealed === true && target.player !== cannon.player`).
  - Rank hierarchy is ignored (Cannon can capture General, Advisor, etc.).

### 2.3 Face-Down Invariant
- A face-down piece (`isRevealed === false`) CANNOT be captured by any piece (neither adjacent capture nor cannon jump).

## 3. Game Lifecycle & Win Condition

- **Initial State**: 32 pieces shuffled across $4 \times 8$ grid, all with `isRevealed = false`. `player1Color = null`, `currentPlayer = "red"` (placeholder until first flip).
- **First Move**: Must be a `flip`. If Player 1 flips a piece with color `C`, then:
  - Player 1 = `C`, Player 2 = `opponent(C)`.
  - Next turn becomes `opponent(C)`.
- **Game Over**:
  - A player loses when they have 0 pieces remaining on the board (both face-up and face-down belonging to their color).
  - A player loses if it is their turn and `getLegalMoves(state).length === 0`.
