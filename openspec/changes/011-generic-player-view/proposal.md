# Change 011: Generic Player View (011-generic-player-view)

> **現行規格見 `openspec/specs/banqi/spec.md` §8（視圖投影）與 `openspec/specs/ai/spec.md` §3（AI 觀察邊界）。** 本文件保留當時的決策，不再作為事實來源；與程式碼或現行 spec 不一致處以後者為準。

## Why
Currently, the Multi Board Games Platform engines and sessions operate directly with the authoritative game state (`State`). In Round 8 & 9, Banqi introduced hidden information (face-down pieces) and used a one-off helper `maskHiddenState(state)` and `serializeMasked(state)` within Banqi to mitigate data leakage. However, this remains a game-specific workaround. As the platform prepares for spectators, replay, AI, and network architecture, the separation between authoritative full state and projected view state must be promoted to a formal, platform-level contract.

## Problem
1. **Lack of View Boundary Abstraction**: `GameEngine<State, Move>` does not possess a canonical projection contract to project state according to player perspective or spectator view.
2. **Data Leakage Risk**: Authoritative full state (`State`) can accidentally reach client UI, logs, network payloads, or public serializers.
3. **Serialization Ambiguity**: `engine.serialize(state)` currently serializes the internal authoritative state, leaving public serialization undefined at the platform level.

## Goal
1. Introduce generic platform types `ViewRole`, `GameViewContext<Player>`, and `projectView(state, context): ViewState` to `GameEngine<State, Move, ViewState>`.
2. Keep full backward compatibility with perfect-information games (`Xiangqi`, `Gomoku`) where `ViewState = State` and projection is identity.
3. Establish distinct full and view types for Banqi: `BanqiFullState` vs `BanqiViewState`.
4. Update `GameSession` to separate trusted internal state (`getState()`) from safe projected state (`getView(context)`).
5. Ensure public serialization (`serializeView(viewState)`) is strictly derived from projected `ViewState`.
6. Migrate `BanqiBoard.tsx` to consume projected `ViewState` without altering UI visual aesthetics or gameplay UX.

## Non-goals
- Online multiplayer or WebSocket network transport.
- Authentication or user management.
- Banqi AI.
- Full Replay or Save/Load UI.
- New game implementations.
- UI redesign.
