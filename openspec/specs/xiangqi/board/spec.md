# Xiangqi Board Specification

## 1. Grid Definition & Coordinate System

The Chinese Chess (Xiangqi / 中國象棋) board is defined as a grid of intersections (points), consisting of:
- **10 horizontal lines (ranks / rows)**: indexed `0` through `9` from top (Black side) to bottom (Red side).
- **9 vertical lines (files / cols)**: indexed `0` through `8` from left to right (from Red's perspective).
- Total intersections: $10 \times 9 = 90$ points.

```text
       col:  0   1   2   3   4   5   6   7   8
row 0  ─── [車][馬][象][士][將][士][象][馬][車]  (Black Back Rank)
row 1  ───  │   │   │   ╲ │ ╱   │   │   │
row 2  ───  │  [砲] │   │ ╳ │   │  [砲] │
row 3  ─── [卒] │  [卒] ╱ │ ╲  [卒] │  [卒]
row 4  ───  │   │   │   │   │   │   │   │   │   (Black Riverbank)
====== ══════════════ 楚 河   漢 界 ══════════════ (River Boundary)
row 5  ───  │   │   │   │   │   │   │   │   │   (Red Riverbank)
row 6  ─── [兵] │  [兵] ╲ │ ╱  [兵] │  [兵]
row 7  ───  │  [炮] │   │ ╳ │   │  [炮] │
row 8  ───  │   │   │   ╱ │ ╲   │   │   │
row 9  ─── [俥][傌][相][仕][帥][仕][相][傌][俥]  (Red Back Rank)
```

---

## 2. Regions and Territories

### 2.1 River (楚河漢界)
- Divides the board horizontally between row 4 and row 5.
- **Black Territory**: rows `0` to `4`.
- **Red Territory**: rows `5` to `9`.

### 2.2 Palaces (九宮格)
Each side has a $3 \times 3$ restricted zone called the Palace (九宮):
- **Black Palace**: rows `0..2`, cols `3..5` (9 intersections).
- **Red Palace**: rows `7..9`, cols `3..5` (9 intersections).

---

## 3. Behavioral Scenarios

### 3.1 Board Boundaries & Coordinates

#### Scenario: Valid board position coordinates
- **Given** an intersection with `row` in range `[0, 9]` and `col` in range `[0, 8]`
- **When** `inBounds(row, col)` is evaluated
- **Then** the position is identified as valid (`true`).

#### Scenario: Out-of-bounds rejection
- **Given** coordinates where `row < 0`, `row > 9`, `col < 0`, or `col > 8`
- **When** `inBounds(row, col)` is evaluated
- **Then** the result is `false`
- **And** any move targeting or originating from these coordinates is strictly rejected.

---

### 3.2 Palace Membership

#### Scenario: Detecting Red Palace intersections
- **Given** coordinates `(row, col)`
- **When** `row` is in `[7, 9]` and `col` is in `[3, 5]`
- **Then** `isPalace("red", row, col)` evaluates to `true`.

#### Scenario: Rejecting points outside Red Palace
- **Given** coordinates `(6, 4)` (outside rank) or `(8, 2)` (outside file)
- **When** `isPalace("red", row, col)` is evaluated
- **Then** the result is `false`.

#### Scenario: Detecting Black Palace intersections
- **Given** coordinates `(row, col)`
- **When** `row` is in `[0, 2]` and `col` is in `[3, 5]`
- **Then** `isPalace("black", row, col)` evaluates to `true`.

---

### 3.3 River Crossing Boundary

#### Scenario: Red piece crossing the river
- **Given** a piece belonging to the `"red"` player at `row`
- **When** `row <= 4`
- **Then** `crossedRiver("red", row)` evaluates to `true`
- **And** when `row >= 5`, `crossedRiver("red", row)` evaluates to `false`.

#### Scenario: Black piece crossing the river
- **Given** a piece belonging to the `"black"` player at `row`
- **When** `row >= 5`
- **Then** `crossedRiver("black", row)` evaluates to `true`
- **And** when `row <= 4`, `crossedRiver("black", row)` evaluates to `false`.
