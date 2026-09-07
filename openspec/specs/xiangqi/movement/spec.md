# Xiangqi Piece Movement Specification

## 1. Scope & Purpose

This specification governs all pseudo-legal and movement generation rules for the seven piece types in Xiangqi. All destinations must be within board boundaries and must not land on a friendly piece.

---

## 2. General (帥 / 將) Movement

### Rules
- Moves exactly 1 step orthogonally (up, down, left, right).
- Must never step outside its respective 9-intersection Palace.

#### Scenario: General orthogonal movement within Palace
- **Given** the Red General at `(8, 4)` with adjacent intersections empty
- **When** candidate moves are generated
- **Then** `(7, 4)`, `(9, 4)`, `(8, 3)`, and `(8, 5)` are valid destinations.

#### Scenario: General cannot leave Palace
- **Given** the Red General at `(7, 3)` (top-left corner of Red Palace)
- **When** candidate moves are generated
- **Then** moving up to `(6, 3)` or left to `(7, 2)` is prohibited
- **And** only `(8, 3)` and `(7, 4)` are legal.

---

## 3. Advisor (仕 / 士) Movement

### Rules
- Moves exactly 1 step diagonally ($\pm 1 \text{ row}, \pm 1 \text{ col}$).
- Must never leave its respective Palace (restricted to 5 specific intersections per palace: center and 4 corners).

#### Scenario: Advisor diagonal movement inside Palace
- **Given** the Red Advisor at `(9, 3)` (corner of Palace)
- **When** candidate moves are evaluated
- **Then** moving diagonally to the Palace center `(8, 4)` is valid.

#### Scenario: Advisor cannot move orthogonally or outside Palace
- **Given** the Red Advisor at `(8, 4)` (Palace center)
- **When** candidate moves are evaluated
- **Then** the only valid targets are the 4 corners `(7, 3)`, `(7, 5)`, `(9, 3)`, `(9, 5)`
- **And** orthogonal moves `(8, 3)`, `(8, 5)`, `(7, 4)`, `(9, 4)` are illegal.

---

## 4. Elephant (相 / 象) Movement

### Rules
- Moves exactly 2 steps diagonally ($\pm 2 \text{ rows}, \pm 2 \text{ cols}$).
- **Elephant Eye (塞象眼)**: If the intermediate diagonal point $(\text{row} \pm 1, \text{col} \pm 1)$ is occupied by any piece (friendly or enemy), movement in that direction is blocked.
- **River Restriction**: Cannot cross the river (Red Elephant restricted to rows 5..9; Black Elephant restricted to rows 0..4).

#### Scenario: Normal 2-point diagonal jump
- **Given** the Red Elephant at `(9, 2)` with `(8, 3)` empty
- **When** candidate moves are generated
- **Then** `(7, 4)` is a valid destination.

#### Scenario: Blocked elephant eye
- **Given** the Red Elephant at `(9, 2)`
- **And** another piece occupies `(8, 3)` (the elephant eye)
- **When** candidate moves are generated
- **Then** `(7, 4)` is NOT a valid destination.

#### Scenario: Elephant cannot cross river
- **Given** the Red Elephant at `(5, 2)` (at riverbank)
- **When** candidate moves are generated
- **Then** jumps across the river to row 3 (e.g. `(3, 0)` or `(3, 4)`) are strictly forbidden.

---

## 5. Horse (傌 / 馬) Movement

### Rules
- Moves 1 step orthogonally followed by 1 step diagonally outward ("L" shape).
- Destination is $(\pm 2 \text{ rows}, \pm 1 \text{ col})$ or $(\pm 1 \text{ row}, \pm 2 \text{ cols})$.
- **Horse Leg Blocking (拐馬腳 / 蹩馬腿)**: If the adjacent orthogonal intersection in the direction of the initial 1-step move is occupied by any piece, the corresponding two diagonal target destinations are blocked.

#### Scenario: Free horse movement
- **Given** a Horse at `(7, 4)` with all 4 adjacent orthogonal points empty
- **When** candidate moves are generated
- **Then** it has 8 potential legal destinations: `(5, 3), (5, 5), (6, 2), (6, 6), (8, 2), (8, 6), (9, 3), (9, 5)`.

#### Scenario: Blocked horse leg
- **Given** a Horse at `(7, 4)`
- **And** a piece occupies `(6, 4)` (the upward leg)
- **When** candidate moves are generated
- **Then** destinations `(5, 3)` and `(5, 5)` are blocked and NOT in candidate moves
- **And** destinations in other unblocked directions remain available.

---

## 6. Chariot (俥 / 車) Movement

### Rules
- Moves any number of unoccupied points orthogonally (along rows or files).
- Cannot jump over any piece.
- Can capture an enemy piece by landing on its point, but cannot move past it.

#### Scenario: Open file/rank traversal
- **Given** a Chariot at `(5, 4)` with an empty board
- **When** candidate moves are evaluated
- **Then** it can reach every point along row 5 and column 4.

#### Scenario: Blocked and capture
- **Given** a Red Chariot at `(5, 4)`
- **And** a friendly piece is at `(5, 6)` and a Black piece is at `(2, 4)`
- **When** candidate moves are evaluated
- **Then** it cannot reach `(5, 6)` or `(5, 7)` or `(5, 8)`
- **And** it can move to `(4, 4)`, `(3, 4)`, and capture at `(2, 4)`
- **And** it cannot continue past `(2, 4)` to `(1, 4)` or `(0, 4)`.

---

## 7. Cannon (炮 / 砲) Movement

### Rules
- **Non-capturing Move**: Moves identically to a Chariot along orthogonal lines without jumping over any piece.
- **Capturing Move**: Can only capture an enemy piece along an orthogonal line by jumping over **exactly one piece** of any color (the "screen" or 炮架).
- Jumping over zero pieces to capture is invalid.
- Jumping over two or more pieces to capture is invalid.

#### Scenario: Non-capturing orthogonal movement without jumping
- **Given** a Cannon at `(7, 1)` with `(6, 1)` and `(5, 1)` empty
- **When** non-capturing moves are generated
- **Then** `(6, 1)` and `(5, 1)` are valid destinations
- **And** if a piece is at `(4, 1)`, non-capturing moves cannot land on or beyond `(4, 1)`.

#### Scenario: Valid capture over exactly one screen
- **Given** a Red Cannon at `(7, 4)`
- **And** a screen piece (of any color) at `(5, 4)`
- **And** an enemy piece at `(2, 4)` with empty points between `(5, 4)` and `(2, 4)`
- **When** candidate moves are generated
- **Then** landing on `(2, 4)` is a valid capturing move.

#### Scenario: Invalid capture with zero or multiple screens
- **Given** a Red Cannon at `(7, 4)`
- **When** an enemy piece is at `(4, 4)` with NO pieces in between
- **Then** `(4, 4)` is NOT a legal move for the Cannon (cannot capture without screen)
- **When** there are two pieces between the Cannon and an enemy piece
- **Then** capturing the enemy piece is NOT a legal move.

---

## 8. Soldier (兵 / 卒) Movement

### Rules
- Moves exactly 1 point orthogonally.
- **Never backward**: Red Soldier can never move downward ($\text{row} + 1$); Black Soldier can never move upward ($\text{row} - 1$).
- **Before crossing river**: Forward only.
- **After crossing river**: Can move forward, left, or right (1 point each).

#### Scenario: Red soldier before crossing river
- **Given** a Red Soldier at `(6, 4)` (own side)
- **When** candidate moves are evaluated
- **Then** the only valid move is forward to `(5, 4)`
- **And** lateral moves `(6, 3)` and `(6, 5)` are illegal.

#### Scenario: Red soldier after crossing river
- **Given** a Red Soldier at `(4, 4)` (crossed into Black territory)
- **When** candidate moves are evaluated
- **Then** valid destinations are forward `(3, 4)`, left `(4, 3)`, and right `(4, 5)`
- **And** moving backward to `(5, 4)` is strictly illegal.

#### Scenario: Black soldier before and after river
- **Given** a Black Soldier at `(3, 2)` (before river)
- **When** moves are evaluated, only forward `(4, 2)` is valid
- **Given** a Black Soldier at `(5, 2)` (after river)
- **When** moves are evaluated, forward `(6, 2)`, left `(5, 1)`, and right `(5, 3)` are valid.
