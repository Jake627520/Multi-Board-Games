# Gomoku (五子棋) Specification

## 1. Scope & Purpose

This specification governs the rules and engine contract for standard Free-style Gomoku (Five-in-a-Row / 五子棋) on the Multi Board Games Platform.

---

## 2. Board Definition & Coordinate System

- **Grid Size**: $15 \times 15$ intersections (points), totaling 225 playable positions.
- **Coordinates**:
  - `row`: `0` to `14` (0-indexed, from top to bottom)
  - `col`: `0` to `14` (0-indexed, from left to right)
- Intersections are initially empty (`null`).

---

## 3. Players & Turn Order

- Two players participate: `"black"` and `"white"`.
- **First Mover**: `"black"` always plays first (`currentPlayer = "black"`, `moveNumber = 1`).
- Turns strictly alternate: Black $\rightarrow$ White $\rightarrow$ Black $\rightarrow$ ...

---

## 4. Behavioral Scenarios

### 4.1 Initial State

#### Scenario: Starting an empty 15x15 match
- **Given** an initialized Gomoku game engine
- **When** `createInitialState()` is invoked
- **Then** the board has 15 rows and 15 columns with all 225 points set to `null`
- **And** `currentPlayer` is `"black"`
- **And** `winner` is `null`
- **And** `isGameOver` is `false`
- **And** `getLegalMoves()` returns all 225 board positions.

---

### 4.2 Legal Move Execution

#### Scenario: Placing a stone on an empty intersection
- **Given** an active match with `currentPlayer` set to `"black"`
- **And** point `(7, 7)` is empty
- **When** move `{ row: 7, col: 7 }` is applied
- **Then** the stone at `(7, 7)` becomes `"black"`
- **And** `currentPlayer` updates to `"white"`
- **And** `(7, 7)` is removed from subsequent `getLegalMoves()`.

#### Scenario: Rejecting move on occupied point
- **Given** an intersection `(7, 7)` already occupied by a stone
- **When** a player attempts to play on `(7, 7)`
- **Then** the move is rejected as illegal
- **And** the board state remains unchanged.

#### Scenario: Rejecting out-of-bounds move
- **Given** coordinates `row < 0`, `row >= 15`, `col < 0`, or `col >= 15`
- **When** a player attempts to play on these coordinates
- **Then** the move is rejected as illegal.

---

### 4.3 Victory Conditions (Five-in-a-Row)

A player wins immediately upon placing a stone that forms an unbroken line of **5 or more stones** of their color horizontally, vertically, or diagonally.

#### Scenario: Horizontal 5-in-a-row
- **Given** Black stones at `(7, 3), (7, 4), (7, 5), (7, 6)`
- **When** Black plays `{ row: 7, col: 7 }`
- **Then** Black achieves 5 consecutive horizontal stones
- **And** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns `"black"`.

#### Scenario: Vertical 5-in-a-row
- **Given** White stones at `(3, 10), (4, 10), (5, 10), (6, 10)`
- **When** White plays `{ row: 7, col: 10 }`
- **Then** White achieves 5 consecutive vertical stones
- **And** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns `"white"`.

#### Scenario: Major diagonal (\) 5-in-a-row
- **Given** Black stones at `(2, 2), (3, 3), (4, 4), (5, 5)`
- **When** Black plays `{ row: 6, col: 6 }`
- **Then** Black achieves 5 consecutive diagonal stones
- **And** `getWinner(state)` returns `"black"`.

#### Scenario: Minor diagonal (/) 5-in-a-row
- **Given** White stones at `(8, 2), (7, 3), (6, 4), (5, 5)`
- **When** White plays `{ row: 4, col: 6 }`
- **Then** White achieves 5 consecutive diagonal stones
- **And** `getWinner(state)` returns `"white"`.

---

### 4.4 Draw Condition (Board Full)

#### Scenario: Full board with no winner
- **Given** a board where all 225 intersections are filled with stones
- **And** neither player has achieved 5-in-a-row
- **When** `isGameOver(state)` and `getWinner(state)` are evaluated
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` returns `null`
- **And** `state.isDraw` evaluates to `true`.

---

### 4.5 Serialization Round-Trip

#### Scenario: Lossless state restoration
- **Given** any in-progress or terminal Gomoku state
- **When** `serialize(state)` is called followed by `deserialize(string)`
- **Then** the restored state is strictly equal in board layout, current player, and win status.
