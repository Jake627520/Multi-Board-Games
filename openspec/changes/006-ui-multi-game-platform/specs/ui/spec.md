# UI Platform Specification (Change 006)

## 1. Scope
Governs UI rendering, user interaction, game switching, and session synchronization across board games.

## 2. Scenarios

### Scenario: Switching games in App shell
- **Given** the user is viewing the platform
- **When** the game switcher selects `"gomoku"`
- **Then** the 15x15 Gomoku board mounts
- **And** the session starts at a fresh Gomoku initial state
- **When** the game switcher selects `"xiangqi"`
- **Then** the 9x10 Xiangqi board mounts with initial 32 pieces.

### Scenario: Playing Gomoku in browser
- **Given** an active Gomoku session
- **When** the user clicks an empty point `(7, 7)`
- **Then** a Black stone appears at `(7, 7)`
- **And** the status bar indicates it is White's turn
- **When** the user clicks point `(7, 8)`
- **Then** a White stone appears at `(7, 8)`
- **And** the status bar indicates it is Black's turn.

### Scenario: Undo in UI
- **Given** a match where one or more moves have occurred
- **When** the user clicks the "悔棋" (Undo) button
- **Then** the last placed stone/piece is removed from the board
- **And** the turn indicator restores to the prior player.
