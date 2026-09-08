# Design 011: Generic Player View Architecture

## 1. Current Architecture
Currently, `GameEngine<State, Move>` exposes:
```ts
export interface GameEngine<State, Move> {
  createInitialState(): State;
  getCurrentPlayer(state: State): Player;
  getLegalMoves(state: State): Move[];
  applyMove(state: State, move: Move): State;
  isGameOver(state: State): boolean;
  getWinner(state: State): Player | null;
  serialize(state: State): string;
  deserialize(serialized: string): State;
}
```
In this model, `State` represents both the authoritative internal state and what `GameSession` exposes to the UI via `session.getState()`.

## 2. Problem Statement
When a game contains hidden information (such as Banqi's face-down pieces):
- The full authoritative state contains confidential attributes (e.g. piece identity, owner, and rank).
- Handing `State` directly to the UI, spectator tools, or public network channels leaks private information.
- A uniform projection mechanism is required so any game engine can define how authoritative state is safely projected to a viewer.

## 3. Full State Definition
- **Authoritative Full State (`State`)**: Trusted, complete game representation containing all active and hidden data. Stored and maintained exclusively by the referee/engine and internal session stack.
- Used for rule calculation, legal move generation, move application, and undo snapshot stack.

## 4. View State Definition
- **Projected View State (`ViewState`)**: The role-safe representation of the game state visible to a specific participant (Player RED, Player BLACK, or Spectator).
- In imperfect-information games, `ViewState` removes or replaces private information with opaque placeholders.
- In perfect-information games (Xiangqi, Gomoku), `ViewState` is identical to `State`.

## 5. ViewContext
```ts
export type ViewRole = "player" | "spectator";

export interface GameViewContext<P = Player> {
  readonly role: ViewRole;
  readonly player: P | null;
}
```

## 6. Projection Lifecycle
```text
                 ┌─────────────────────────┐
                 │    Authoritative State  │
                 │   (Engine, Full State)  │
                 └────────────┬────────────┘
                              │
                    engine.projectView()
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     Player View RED   Player View BLACK   Spectator View
```
- `engine.projectView(state: State, context: GameViewContext): ViewState` MUST be pure and non-mutating.
- `projectView` MUST return a structurally independent representation so that mutation of the view cannot corrupt the authoritative full state.

## 7. Serialization Boundary
- `serialize(state: State): string`: Trusted, internal/authoritative serialization (used for internal persistence, history, debug).
- `serializeView(viewState: ViewState): string`: Public serialization safe for clients, spectators, public replays, and network transfer.

## 8. Banqi Implementation
- **Authoritative Type**: `BanqiFullState` (aliased to `BanqiState` for backward compatibility).
  - Piece type: `BanqiPiece { id, player, type, rank, isRevealed }`.
- **View Type**: `BanqiViewState`:
  - Revealed pieces: `{ id, player, type, rank, isRevealed: true }`.
  - Hidden pieces: `{ id: string; isRevealed: false }` (no `player`, `type`, or `rank` attributes).
- **Projections**:
  - RED Player: sees revealed pieces; all unrevealed pieces are masked.
  - BLACK Player: sees revealed pieces; all unrevealed pieces are masked.
  - Spectator: sees revealed pieces; all unrevealed pieces are masked.

## 9. Xiangqi / Gomoku Compatibility
- Default generic: `interface GameEngine<State, Move, ViewState = State>`.
- Xiangqi and Gomoku implement `projectView(state: State): State { return state; }` and `serializeView(viewState: State): string { return this.serialize(viewState); }`.
- Zero engine or rule changes required for existing Xiangqi and Gomoku logic.

## 10. GameSession Integration
- `session.getState(): State`: Returns trusted authoritative state.
- `session.getView(context: GameViewContext): ViewState`: Calls `engine.projectView(this.state, context)`.
- UI hooks can observe `viewState` rather than `fullState`.

## 11. Security Considerations
- Projection creates an immutable, sanitized structure.
- Public serialization of `BanqiViewState` contains zero occurrences of hidden piece ranks or types.
- Face-down pieces in `BanqiViewState` omit `player`, `type`, and `rank` properties entirely, preventing JSON/property inspection attacks.

## 12. Migration Strategy
1. Update `src/core/game/types.ts` with generic `ViewState = State` and view contracts.
2. Implement Banqi `projectView` and `serializeView`.
3. Provide default implementations in `XiangqiEngine` and `GomokuEngine`.
4. Update `useGameSession` and `BanqiBoard.tsx` to consume safe projected views.
5. Verify with exhaustive security and regression tests.

## 13. Future Online Multiplayer Compatibility
When client-server architecture is added, the server holds `GameSession<State, Move>`, and sends `engine.serializeView(engine.projectView(state, clientContext))` to connected WebSockets, strictly preventing client-side wall-hack / inspect-element exploits.
