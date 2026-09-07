# Change 001 Design: Multi-Game Platform Core

## 1. Architectural Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    Platform Core Layer                  │
│                     (src/core/game/)                    │
│                                                         │
│   ┌──────────────────┐            ┌─────────────────┐   │
│   │   GameRegistry   │            │   GameEngine    │   │
│   │ ───────────────  │            │  <State, Move>  │   │
│   │ register(engine) │            └────────┬────────┘   │
│   │ get(id)          │                     │ implements │
│   │ list()           │                     │            │
│   └──────────────────┘                     ▼            │
│                              ┌────────────────────────┐ │
│                              │   Specific Engines     │ │
│                              │ (Xiangqi, Gomoku, ...) │ │
│                              └────────────────────────┘ │
│                                            ▲            │
│   ┌────────────────────────────────────────┴────────┐   │
│   │                   GameSession                   │   │
│   │                 <State, Move>                   │   │
│   │  - state: State                                 │   │
│   │  - history: MoveRecord<Move>[]                  │   │
│   │  - snapshots: State[]                           │   │
│   │  + move(move: Move): State                      │   │
│   │  + undo(): State                                │   │
│   │  + reset(): State                               │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 2. Component Design & Responsibilities

### 2.1 `GameRegistry`
- Storage: Private `Map<GameId, GameEngine<unknown, unknown>>`.
- Methods:
  - `register<State, Move>(engine: GameEngine<State, Move>): void`
  - `get(id: GameId): GameEngine<unknown, unknown> | undefined`
  - `list(): GameEngine<unknown, unknown>[]`
- Error policy: Throws `Error('Game engine already registered: <id>')` if duplicate registration is attempted.

### 2.2 `GameSession<State, Move>`
- Storage:
  - `state: State`: Current state.
  - `history: MoveRecord<Move>[]`: Chronological moves with player tag.
  - `snapshots: State[]`: Previous state snapshots for undo operation.
- Invariants:
  - Calls `engine.getLegalMoves(this.state)` prior to executing `applyMove`.
  - Only commits move to state and history if move is strictly valid.
  - Calling `undo()` pops state from `snapshots` and updates `state` and `history`.

## 3. Risk Analysis & Mitigation
- **Risk**: Deep vs shallow copy of `State` during snapshot saving in session.
  - **Mitigation**: Engines must provide immutable state transitions via `applyMove`. The session stores immutable state instances.
- **Risk**: Move comparison complexity.
  - **Mitigation**: Deep equality or JSON serialization comparison against candidates returned by `getLegalMoves`.
