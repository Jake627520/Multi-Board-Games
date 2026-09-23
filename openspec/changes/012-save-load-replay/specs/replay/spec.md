# Specification: Action-Based Replay Architecture


> **後續變更（2026-09，commit `7e98da6`）**
> Replay envelope 仍是 `formatVersion = 1`，但版本號已與存檔格式脫鉤：改由 `CURRENT_REPLAY_FORMAT_VERSION`（`src/core/persistence/replay-manager.ts`）獨立管理，存檔升到 v2 並不牽動 replay envelope。下文其餘內容仍然有效。

## Requirements

1. **Replay Envelope**:
   - Stores `formatVersion = 1`, `gameId`, `engineVersion`.
   - Stores `initialState` (serialized initial state at game start).
   - Stores `moves` (ordered array of `MoveRecord<Move>`).

2. **Step-by-Step State Reconstruction**:
   - `ReplaySession` accepts a `GameReplayEnvelope` and reconstructs states deterministically by executing moves sequentially from `initialState`.
   - Allows stepping to any step `0 <= step <= moves.length`.
   - Stepping to `0` yields the initial state; stepping to `N` yields the state after `N` moves.

3. **Mutation Safety**:
   - Creating or stepping through a replay session must NOT mutate the active live `GameSession`.

4. **Banqi Public Replay Security**:
   - `exportPublicReplay(context)` must project every step through `engine.projectView(stepState, context)`.
   - At step 0, no unrevealed piece attributes (`player`, `type`, `rank`) may exist in the public replay data.
   - When a piece is flipped at step K, only then does its public identity appear in the projected view state at step K and subsequent steps.
   - Raw `initialState` containing private unrevealed attributes must NEVER be exposed in public replay exports.
