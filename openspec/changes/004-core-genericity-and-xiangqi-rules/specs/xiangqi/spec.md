# Xiangqi Cyclical Rules Specification (Change 004)

## 1. Scope
Adjudication of repetitive positions, continuous checking, and non-capture count.

## 2. Scenarios

### Scenario: Perpetual check results in forfeiture
- **Given** an ongoing match where player `"red"` repeatedly checks the black general
- **When** the identical board position recurs via continuous checks by Red
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` evaluates to `"black"`
- **And** `state.terminationReason` is `"perpetual_check"`.

### Scenario: Threefold repetition without perpetual check results in draw
- **Given** an ongoing match where both players repeat moves peacefully
- **When** the exact same position occurs for the 3rd time
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` evaluates to `null`
- **And** `state.isDraw` is `true`
- **And** `state.terminationReason` is `"threefold_repetition"`.

### Scenario: Sixty full rounds (120 half-moves) without capture results in draw
- **Given** an active game where 120 half-moves occur without any piece captured
- **When** the 120th non-capture move is executed
- **Then** `isGameOver(state)` evaluates to `true`
- **And** `getWinner(state)` evaluates to `null`
- **And** `state.isDraw` is `true`
- **And** `state.terminationReason` is `"sixty_move_draw"`.
