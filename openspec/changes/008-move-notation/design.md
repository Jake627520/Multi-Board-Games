# Design 008: Move Notation Architecture

## 1. Traditional Xiangqi Notation Rules

### Piece Labels:
- Red: 將, 士, 象, 馬, 車, 炮, 兵
- Black: 將, 士, 象, 馬, 車, 炮, 卒

### File Numbering (Columns $0 \dots 8$):
- **Red perspective** (plays from bottom rows 9 to 0):
  - Col 8 = 一, Col 7 = 二, Col 6 = 三, Col 5 = 四, Col 4 = 五, Col 3 = 六, Col 2 = 七, Col 1 = 八, Col 0 = 九.
  - Formula: `fileRed = 9 - col`, formatted as `["一","二","三","四","五","六","七","八","九"][fileRed - 1]`.
- **Black perspective** (plays from top rows 0 to 9):
  - Col 0 = 1, Col 1 = 2, Col 2 = 3, Col 3 = 4, Col 4 = 5, Col 5 = 6, Col 6 = 7, Col 7 = 8, Col 8 = 9.
  - Formula: `fileBlack = col + 1`, formatted as `["1","2","3","4","5","6","7","8","9"][fileBlack - 1]`.

### Movement Direction:
- **Red**:
  - `to.row < from.row` $\rightarrow$ `進` (advance toward enemy territory)
  - `to.row > from.row` $\rightarrow$ `退` (retreat toward home territory)
  - `to.row === from.row` $\rightarrow$ `平` (horizontal movement)
- **Black**:
  - `to.row > from.row` $\rightarrow$ `進`
  - `to.row < from.row` $\rightarrow$ `退`
  - `to.row === from.row` $\rightarrow$ `平`

### Fourth Character:
- **Straight-moving pieces** (車, 炮, 將, 兵/卒):
  - For `進` or `退`: number of steps moved $|to.row - from.row|$.
  - For `平`: destination file number.
- **Diagonal-moving pieces** (馬, 象, 士):
  - Always the destination file number.

### Disambiguation (同列雙子):
- When two pieces of the same player and same type occupy the same file:
  - Red: smaller row index is closer to opponent (front: `前`), larger row is `後`.
  - Black: larger row index is closer to opponent (front: `前`), smaller row is `後`.
  - Pattern becomes: `[前/後][棋子][進/退/平][目標/步數]`.

---

## 2. Gomoku Coordinate Notation

- Board size: $15 \times 15$.
- Col $0 \dots 14 \rightarrow$ `A` to `O`.
- Row $0 \dots 14 \rightarrow 15 - row$, so row 0 is 15 and row 14 is 1.
- Center $(7, 7) \rightarrow$ `H8`.

---

## 3. Component Architecture (`MoveHistory.tsx`)

- Displays sequential list: `1. 炮二平五`, `2. 馬8進7`, etc.
- Badges denote active player color (Red/Black, Black/White).
- `useRef` automatically scrolls to the bottom on each move addition.
