# Specification: Generic Player View & Projection

## Requirement 1: View Context & Engine Projection Contract
The platform MUST define:
- `ViewRole = "player" | "spectator"`
- `GameViewContext<P = Player> { readonly role: ViewRole; readonly player: P | null; }`
- `GameEngine<State, Move, ViewState = State>` with:
  - `projectView(state: State, context: GameViewContext): ViewState`
  - `serializeView(viewState: ViewState): string`

### Invariants:
1. `projectView` MUST be a pure, non-mutating function.
2. `projectView` MUST NOT return a shared mutable reference to the full state's board.
3. For games without hidden information, `projectView(state, context)` returns `state` directly and `serializeView(viewState)` delegates to `serialize(viewState)`.

---

## Requirement 2: Banqi View State Masking
The Banqi Engine MUST implement `GameEngine<BanqiFullState, BanqiMove, BanqiViewState>`.

### Scenario 1: Red Player View
- **GIVEN** an authoritative Banqi state with face-down and face-up pieces.
- **WHEN** `projectView` is called with `{ role: "player", player: "red" }`.
- **THEN** every unrevealed piece in `BanqiViewState` MUST NOT expose `type`, `rank`, or `player`.
- **AND** every revealed piece MUST retain its accurate attributes.

### Scenario 2: Black Player View
- **GIVEN** an authoritative Banqi state with face-down and face-up pieces.
- **WHEN** `projectView` is called with `{ role: "player", player: "black" }`.
- **THEN** every unrevealed piece in `BanqiViewState` MUST NOT expose `type`, `rank`, or `player`.

### Scenario 3: Spectator View
- **GIVEN** an authoritative Banqi state.
- **WHEN** `projectView` is called with `{ role: "spectator", player: null }`.
- **THEN** every unrevealed piece MUST NOT expose `type`, `rank`, or `player`.

---

## Requirement 3: Public Serialization Boundary
- Public serialization (`serializeView(viewState)`) MUST ONLY operate on `ViewState`.
- Serializing `BanqiViewState` MUST NOT contain the string names of any face-down piece types (e.g. `"general"`, `"chariot"`).

---

## Requirement 4: GameSession View Projection
`GameSession<State, Move, ViewState = State>` MUST provide:
- `getState(): State` (trusted authoritative state)
- `getView(context: GameViewContext): ViewState` (safe projected view state)
