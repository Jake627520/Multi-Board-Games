# Game Session Specification

## 1. Scope & Purpose

This specification defines the behavior of `GameSession`, the orchestrator responsible for managing an active match lifecycle over an underlying `GameEngine`.

`GameSession` encapsulates:
- Current match state
- Turn and player progression
- Move execution and validation against the engine
- History tracking (`MoveRecord`)
- Undo / rollback capability
- Match reset

---

## 2. Session Lifecycle Scenarios

```text
create session
    ↓
initial state
    ↓
move (validating against engine)
    ↓
record history & push snapshot
    ↓
undo (revert to previous snapshot)
    ↓
reset (restore initial state & clear stacks)
```

---

## 3. Behavioral Scenarios

### 3.1 Session Initialization

#### Scenario: Instantiating a new session
- **Given** a valid `GameEngine` implementation
- **When** `new GameSession(engine)` is constructed
- **Then** `session.getState()` returns the engine's initial state
- **And** `session.getHistory()` returns an empty array
- **And** `session.getCurrentPlayer()` returns the starting player defined by the engine.

---

### 3.2 Move Execution & Validation

#### Scenario: Executing a legal move
- **Given** an active `GameSession` at state $S_0$
- **When** a move $M$ that exists in `engine.getLegalMoves(S_0)` is submitted via `session.move(M)`
- **Then** the session state updates to the next state $S_1 = \text{applyMove}(S_0, M)$
- **And** a new record `{ move: M, player }` is appended to `session.getHistory()`
- **And** the history length increases by 1
- **And** `session.getCurrentPlayer()` updates to the next player according to the new state.

#### Scenario: Rejecting an illegal move
- **Given** an active `GameSession` at state $S_0$
- **When** a move $M_{invalid}$ not in `engine.getLegalMoves(S_0)` is submitted via `session.move(M_{invalid})`
- **Then** the session throws an error `"Illegal move"`
- **And** the session state remains unchanged at $S_0$
- **And** no record is appended to history.

---

### 3.3 Undo / Rollback

#### Scenario: Successful undo of a previous move
- **Given** a `GameSession` where at least one legal move has been executed
- **When** `session.undo()` is invoked
- **Then** the session state reverts to the exact state before the last move
- **And** the last move record is removed from `session.getHistory()`
- **And** `session.getCurrentPlayer()` returns the player whose turn it was before that move.

#### Scenario: Undo on initial state (no-op)
- **Given** a `GameSession` with no moves executed (empty history)
- **When** `session.undo()` is invoked
- **Then** the session state remains the initial state
- **And** the history remains empty
- **And** no error is thrown.

#### Scenario: Sequential undo back to beginning
- **Given** a `GameSession` with $N$ moves played
- **When** `session.undo()` is called $N$ times consecutively
- **Then** the state equals the initial state
- **And** `session.getHistory().length` becomes 0.

---

### 3.4 Match Reset

#### Scenario: Resetting a session in progress
- **Given** a `GameSession` with multiple moves played and accumulated history
- **When** `session.reset()` is invoked
- **Then** the session state is restored to a fresh `engine.createInitialState()`
- **And** `session.getHistory()` is reset to empty
- **And** all previous undo snapshots are purged (subsequent `undo()` is a no-op).

---

## 4. Invariants

1. **Rule Delegation**: `GameSession` MUST NEVER implement game rules directly; all move legality checks and state transformations are delegated to `GameEngine`.
2. **History-State Coherence**: For any state $S$ reachable via $N$ moves, `history.length` must equal $N$, and calling `undo()` $N$ times must return to the initial state without drift.
