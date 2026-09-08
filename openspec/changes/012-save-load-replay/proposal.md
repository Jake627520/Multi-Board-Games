# Change Proposal: 012-save-load-replay

## 1. Why

The platform supports three distinct board games (`Xiangqi`, `Gomoku`, `Banqi`). While Round 10 established the generic `GameEngine<State, Move, ViewState>` contract and separated `Authoritative Full State` from `ViewState`, the platform currently lacks:
1. A versioned, validated persistence mechanism (Save / Load) for game sessions.
2. An action-based Replay architecture capable of deterministic step-by-step state reconstruction.
3. A formal Serialization Policy separating trusted full-state persistence (trusted local saves, debug, undo) from public view-state serialization (public export, spectator feeds, network clients, public replays).

Without this persistence boundary, future features run a high risk of calling `engine.serialize(state)` directly, re-introducing private hidden piece leakage for imperfect-information games like Banqi.

## 2. Goal

- Define a platform-level `GameSaveEnvelope` with versioning (`formatVersion`), `gameId`, and `engineVersion`.
- Implement a `SaveManager` with strict runtime validation that rejects malformed payloads, version mismatches, and game ID mismatches without mutating the active session.
- Implement an action-history-based `ReplayManager` capable of stepping forward/backward without mutating the original game session.
- Guarantee that for Banqi:
  - **Trusted Local Save**: Retains complete private identities (player, type, rank) of all 32 pieces.
  - **Public Replay / Export**: Projects all intermediate and initial states through `projectView(state, context)` so that unrevealed pieces are never exposed before being flipped.
- Clean up obsolete Round 9 artifacts (`maskHiddenState`, `serializeMasked`).
- Update `useGameSession` to encapsulate safe save/load operations.

## 3. Non-Goals

- Cloud save, remote database syncing, or multiplayer networking protocols.
- UI redesign or new game mechanics.
- Heavy external validation dependencies (runtime validation will be lightweight, deterministic, and type-safe).
- Modifying game rules of Xiangqi, Gomoku, or Banqi.
