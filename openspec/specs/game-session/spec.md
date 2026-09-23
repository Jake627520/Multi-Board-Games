# Game Session Specification

## 1. Scope & Purpose

This specification defines the behavior of `GameSession`, the orchestrator responsible for managing an active match lifecycle over an underlying `GameEngine`.

`GameSession` encapsulates:
- Current match state
- The match's initial state (the baseline that undo and replay wind back to)
- Turn and player progression
- Move execution and validation against the engine
- History tracking (`MoveRecord`)
- Undo / rollback capability
- Match reset
- Restoration from a persisted match (state, history and undo snapshots)
- View projection for the UI (`getView(context)`, delegated to `engine.projectView`)

---

## 2. Session Lifecycle Scenarios

```text
create session
    ↓
initial state ←──────────────┐
    ↓                        │
move (validating against engine)
    ↓                        │
record history & push snapshot
    ↓                        │
undo (revert to previous snapshot)
    ↓                        │
reset (restore initial state & clear stacks)

loadState(state)      → single state, clean baseline (history & snapshots cleared)
restoreFrom(payload)  → state + initialState + history + snapshots (undo & replay stay usable)
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

### 3.5 Loading & Restoring a Persisted Match

`GameSession` offers two distinct entry points for putting an external state into the session. They differ in what happens to the move history, and callers must pick deliberately.

```ts
loadState(state: State): void;
restoreFrom(payload: SessionRestorePayload<State, Move>): void;
getInitialState(): State;
```

`SessionRestorePayload` carries `state`, `initialState`, `history` and `snapshots`, where `snapshots[i]` is the position immediately **before** `history[i]` was played.

#### Scenario: Loading a bare state (clean baseline)
- **Given** a `GameSession` with moves already played
- **When** `session.loadState(S)` is invoked
- **Then** `session.getState()` returns $S$
- **And** `session.getInitialState()` also returns $S$ — the loaded position becomes the new replay origin
- **And** `session.getHistory()` is empty
- **And** all undo snapshots are purged, so the next `undo()` is a no-op.

#### Scenario: Restoring a full match (history preserved)
- **Given** a payload containing the authoritative state $S_N$, the match's `initialState` $S_0$, an $N$-entry `history`, and $N$ `snapshots`
- **When** `session.restoreFrom(payload)` is invoked
- **Then** `session.getState()` returns $S_N$
- **And** `session.getInitialState()` returns $S_0$
- **And** `session.getHistory().length` equals $N$
- **And** `session.undo()` walks back through the restored snapshots exactly as if the moves had been played in this session.

#### Scenario: Rejecting an incoherent restore payload
- **Given** a payload whose `snapshots.length` differs from its `history.length`
- **When** `session.restoreFrom(payload)` is invoked
- **Then** an error is thrown describing the mismatch
- **And** the session is left completely unmodified — nothing is written before the check passes.

#### Scenario: Reset after a restore
- **Given** a session restored from a persisted match
- **When** `session.reset()` is invoked
- **Then** the state is a fresh `engine.createInitialState()` — the restored `initialState` is discarded, not reused
- **And** history and snapshots are empty.

---

### 3.6 View Projection

#### Scenario: Handing state to the UI
- **Given** an active `GameSession` and a `GameViewContext`
- **When** `session.getView(context)` is invoked
- **Then** the session returns `engine.projectView(state, context)`
- **And** the session performs no masking of its own — hiding hidden information is entirely the engine's responsibility.

---

## 4. Invariants

1. **Rule Delegation**: `GameSession` MUST NEVER implement game rules directly; all move legality checks and state transformations are delegated to `GameEngine`.
2. **History-State Coherence**: For any state $S$ reachable via $N$ moves, `history.length` must equal $N$, and calling `undo()` $N$ times must return to the initial state without drift. This must hold equally for a session restored via `restoreFrom`, which is why the payload must supply one snapshot per history entry.
3. **Atomic Restoration**: `restoreFrom` validates before it writes. A rejected payload must never leave the session in a partially-restored state.
