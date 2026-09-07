# Tasks: 001 Create Multi-Game Platform

## Phase 1: Core Platform Types & Contracts
- [x] Define `Player`, `Position`, `MoveRecord`, `GameId`, and `GameEngine` in `src/core/game/types.ts`.
- [x] Verify generic typing allows arbitrary `State` and `Move`.

## Phase 2: GameRegistry Implementation & TDD
- [x] RED: Write failing test in `tests/core/registry.test.ts` for:
  - Registering single engine
  - Retrieving registered engine by ID
  - Listing all registered engines
  - Throwing on duplicate registration
  - Returning `undefined` for unknown engine
- [x] GREEN: Implement `GameRegistry` in `src/core/game/registry.ts`.
- [x] REFACTOR: Ensure type erasure safety with `unknown` casting.

## Phase 3: GameSession Implementation & TDD
- [x] RED: Write failing tests in `tests/core/session.test.ts` for:
  - Session initialization with engine initial state
  - Move execution updating state, player, and history
  - Move execution rejecting illegal moves
  - Single and multi-step undo restoring states and history
  - Undo on empty history returning initial state safely
  - Reset purging history and snapshots
- [x] GREEN: Implement `GameSession` in `src/core/game/session.ts`.
- [x] REFACTOR: Verify immutability of session history output.
