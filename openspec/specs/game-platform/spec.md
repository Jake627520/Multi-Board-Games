# Game Platform Specification

## 1. Scope & Purpose

This specification defines the contract of the Multi Board Games Platform Core. The platform core provides a generic, decoupled protocol for board game engines and a centralized registry to discover and instantiate engines.

The platform core must remain completely agnostic of specific game rules (e.g., Xiangqi, Gomoku, Banqi, Chinese Checkers). No game-specific logic, constants, or branching (`if (gameId === 'xiangqi')`) is permitted within the core platform.

---

## 2. GameEngine Protocol Contract

Every game engine MUST implement the generic contract:

```ts
/** Optional display metadata consumed by the UI only; rules layers never read it. */
interface GamePresentation {
  readonly description?: string;
  readonly boardSize?: string;
  readonly latinName?: string;
  readonly accent?: GameAccent; // "accent" | "ink" | "jade" | "gold"
}

interface GameEngine<State, Move, ViewState = State> extends GamePresentation {
  readonly id: GameId;
  readonly name: string;

  createInitialState(): State;
  getCurrentPlayer(state: State): Player;
  getLegalMoves(state: State): Move[];
  applyMove(state: State, move: Move): State;

  isGameOver(state: State): boolean;
  getWinner(state: State): Player | null;

  serialize(state: State): string;
  deserialize(serialized: string): State;

  projectView(state: State, context: GameViewContext): ViewState;
  serializeView(viewState: ViewState): string;
}
```

The `ViewState` type parameter defaults to `State`. Games with no hidden information leave it defaulted; games with hidden information (Banqi) instantiate it with a masked view type.

### 2.1 State Immutability & Determinism

#### Scenario: Deterministic initial state generation
- **Given** a game engine implementation
- **When** `createInitialState()` is invoked multiple times
- **Then** each invocation returns a valid, independent starting state with initial player and piece configuration.

#### Scenario: State transition via legal move
- **Given** an engine and a valid game state $S$
- **When** a valid move $M \in \text{getLegalMoves}(S)$ is passed to `applyMove(S, M)`
- **Then** the engine returns a new state $S'$ with updated player turn, board layout, and move count
- **And** the original state $S$ remains unmodified.

#### Scenario: Rejection of illegal moves
- **Given** an engine and a valid game state $S$
- **When** an invalid move $M \notin \text{getLegalMoves}(S)$ is passed to `applyMove(S, M)`
- **Then** the engine throws an error indicating an illegal move
- **And** no state transition occurs.

---

### 2.2 View Projection Contract

Every engine MUST be able to project its authoritative state into a view state that is safe to hand to the UI, to a spectator, or to a public export. Projection is driven by a `GameViewContext`:

```ts
type ViewRole = "player" | "spectator";

interface GameViewContext<P = Player> {
  readonly role: ViewRole;
  readonly player: P | null;
}
```

#### Scenario: Projection is pure and non-aliasing
- **Given** an engine and a valid game state $S$
- **When** `projectView(S, context)` is invoked
- **Then** $S$ is left unmodified
- **And** the returned view state does not share a mutable board reference with $S$, so that UI-side mutation cannot corrupt the authoritative state.

#### Scenario: Engines without hidden information
- **Given** an engine for a perfect-information game (Xiangqi, Gomoku)
- **When** `projectView(S, context)` is invoked with any context
- **Then** the returned view carries the same observable content as $S$ (with the board shallow-copied)
- **And** `serializeView(viewState)` produces the same payload shape as `serialize(state)`.

---

### 2.3 Presentation Metadata (Optional)

An engine MAY additionally expose `description`, `boardSize`, `latinName`, and `accent` so that generic UI surfaces (such as the game home screen) can describe the game without any per-game branching.

#### Scenario: Engine omits presentation metadata
- **Given** an engine that declares only `id` and `name` plus the required methods
- **When** the engine is registered and rendered by a generic UI surface
- **Then** registration succeeds and the engine remains fully playable
- **And** the UI simply renders fewer descriptive lines for that game.

#### Scenario: Accent token is constrained to the existing palette
- **Given** an engine that declares `accent`
- **When** the value is read by the UI
- **Then** it must be one of the tokens already defined in the stylesheet root (`accent`, `ink`, `jade`, `gold`)
- **And** no new colour value is introduced by the engine.

---

## 3. Serialization Contract

The engine must support loss-less serialization and deserialization of any valid game state to facilitate persistence, replays, and network transfer.

`serialize` / `deserialize` operate on the **authoritative** state and are for trusted targets only. `serializeView` is the counterpart for untrusted targets and MUST only ever be handed a `ViewState`.

#### Scenario: Round-trip state serialization
- **Given** any valid game state $S$ generated by an engine
- **When** the state is serialized via `serialize(S)` to a string $T$
- **And** string $T$ is deserialized via `deserialize(T)` to a state $S_{restored}$
- **Then** $S_{restored}$ must be functionally identical to $S$
- **And** $\text{getLegalMoves}(S_{restored})$ must produce the exact same legal moves as $\text{getLegalMoves}(S)$
- **And** $\text{getCurrentPlayer}(S_{restored})$ must equal $\text{getCurrentPlayer}(S)$.

---

## 4. Game Registry Contract

The `GameRegistry` manages registered game engines using unique `GameId` identifiers.

### 4.1 Engine Registration

#### Scenario: Registering a new game engine
- **Given** an empty or existing `GameRegistry` instance
- **When** an engine with ID `"xiangqi"` is registered
- **Then** `registry.get("xiangqi")` returns the registered engine instance
- **And** `registry.list()` includes the registered engine.

#### Scenario: Duplicate engine registration rejection
- **Given** a registry that already contains an engine with ID `"xiangqi"`
- **When** an attempt is made to register another engine with ID `"xiangqi"`
- **Then** the registry throws an error indicating duplicate registration
- **And** the existing engine registration remains intact.

#### Scenario: Enumerating registered engines in registration order
- **Given** a registry with engines registered in the order `"xiangqi"`, `"gomoku"`, `"banqi"`
- **When** `registry.list()` is called
- **Then** the engines are returned in that same registration order
- **And** a generic UI surface may render one entry per engine without knowing any game id, so registering a new engine is the only step required to make it appear.

#### Scenario: Querying an unregistered engine
- **Given** a registry with no engine registered under `"gomoku"`
- **When** `registry.get("gomoku")` is called
- **Then** `undefined` is returned without error.

---

## 5. Architectural Invariants & Anti-Patterns

1. **Protocol Agnosticism**: Core types (`Position`, `Player`, `MoveRecord`, `GameEngine`) must never import or reference modules in `src/games/*`.
2. **Polymorphic Extensibility**: New games (Gomoku, Banqi, Chinese Checkers) must be introduced exclusively by implementing `GameEngine<State, Move>` and registering into `GameRegistry`.
3. **No Engine Conditionals**: Any branching on `engine.id` inside core session, registry, or utilities is strictly prohibited.
