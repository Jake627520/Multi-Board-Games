# Design 010: Banqi Rules & Hidden Information Masking

## 1. Information Masking Architecture

```text
┌────────────────────────────────────────┐
│             Internal State             │
│ Full board: contains real piece types  │
│ (Used strictly inside engine/referee)  │
└──────────────────┬─────────────────────┘
                   │
                   ▼ maskHiddenState()
┌────────────────────────────────────────┐
│              Masked View               │
│ Face-down: { isRevealed: false, ... }  │
│ player: "unknown", type: "unknown"     │
│ (Safe for UI, Spectator, Network, Log) │
└────────────────────────────────────────┘
```

### Masking Contract:
For any cell `(r, c)` where `board[r][c] !== null`:
- If `piece.isRevealed === true`: keep authentic `{ id, player, type, rank, isRevealed }`.
- If `piece.isRevealed === false`: replace with safe masked representation:
  - `id`: preserved or generalized (e.g. `hidden-${r}-${c}`)
  - `isRevealed`: `false`
  - `player`: `undefined` or `"unknown"`
  - `type`: `undefined` or `"unknown"`
  - `rank`: `0`

## 2. Invariant Rules Formally Codified

1. **Piece Count**: Exactly 32 pieces on a $4 \times 8$ grid.
2. **First Flip Assignment**:
   - Before first flip: `player1Color = null`, `currentPlayer = "red"`.
   - On first flip at `{ row, col }`: piece flipped has color $C$.
   - `player1Color` becomes $C$; next turn becomes $opponent(C)$.
3. **Capture Hierarchy**:
   - `rank(帥/將)=7 > rank(仕/士)=6 > rank(相/象)=5 > rank(俥/車)=4 > rank(傌/馬)=3 > rank(炮/包)=2 > rank(兵/卒)=1`.
   - `canCapture(A, D)` is true if:
     - `D.isRevealed === true` AND `A.player !== D.player` AND
     - `(A.rank === 1 && D.rank === 7)` OR `(A.rank !== 7 && A.rank >= D.rank)`.
4. **Cannon Jump**:
   - Jump path has `countBetween === 1`.
   - Screen can be face-up or face-down, friend or foe.
   - Destination target MUST be a revealed enemy piece (`target.isRevealed === true && target.player !== cannon.player`).
5. **Undo Consistency**:
   - `session.undo()` pops previous snapshot.
   - Flipped piece reverts to `isRevealed = false`, retaining its genuine underlying piece data.
