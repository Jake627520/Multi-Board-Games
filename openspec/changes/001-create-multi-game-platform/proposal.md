# Change 001: Create Multi-Game Platform Core

## 1. Problem Statement
The platform needs to support multiple board games (Xiangqi, Gomoku, Banqi, Chinese Checkers) without coupling game rules into the application lifecycle, UI layer, or persistence mechanism. A rigid single-game design would lead to costly refactoring when subsequent games are introduced.

## 2. Proposed Change
Establish the core generic abstractions in `src/core/game/`:
1. `GameEngine<State, Move>`: Standardized interface covering initial state creation, current player inspection, legal move generation, move application, victory determination, and serialization.
2. `GameRegistry`: Thread-safe / in-memory registry allowing game engines to register and be looked up by `GameId`.
3. `GameSession<State, Move>`: Match controller managing turn transitions, legal move filtering, move history tracking, undo rollback, and match resetting.

## 3. Scope & Boundaries
- **In Scope**:
  - Types: `Player`, `GameId`, `Position`, `MoveRecord`, `GameEngine`.
  - Generic `GameRegistry` class with error handling for duplicate IDs.
  - Generic `GameSession` class with move execution, undo snapshots, and history tracking.
- **Out of Scope**:
  - Any game-specific logic or rules.
  - UI components or styling.
  - Persistence to disk or backend database (covered via serialization contract).

## 4. Acceptance Criteria
- `GameEngine` is fully generic over `<State, Move>`.
- `GameRegistry` throws an error on duplicate engine IDs.
- `GameSession` rejects illegal moves by throwing `"Illegal move"`.
- `GameSession` maintains immutable history and supports single and multiple consecutive `undo()` actions.
- `GameSession.undo()` on an empty history is a safe no-op.
- `GameSession.reset()` restores initial state and purges history and snapshots.
