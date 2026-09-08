# Specification: Serialization Policy & Persistence Boundary

## Requirements

1. **Target Classification**:
   - `TRUSTED_SAVE`: Authoritative full state persistence for trusted local storage. Permitted: `engine.serialize(state)`.
   - `TRUSTED_REPLAY`: Authoritative initial state + move records. Permitted: `engine.serialize(initialState)`.
   - `PUBLIC_EXPORT`: Public snapshot of current game. Forbidden: `engine.serialize(state)`. Required: `engine.serializeView(viewState)`.
   - `PUBLIC_REPLAY`: Public action log and step projections. Forbidden: Raw full initial state. Required: Array of `serializeView(stepViewState)`.

2. **Policy Enforcement**:
   - The platform provides high-level APIs (`SaveManager`, `ReplayManager`, `exportPublicView`) that encapsulate the appropriate serialization path.
   - Public export utilities only accept `ViewState` or project `FullState` using `GameViewContext` before serialization.
   - Banqi legacy methods `maskHiddenState` and `serializeMasked` are completely removed, avoiding conflicting or duplicate masking paths.
