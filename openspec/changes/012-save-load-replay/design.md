# Architecture Design: 012-save-load-replay


> **後續變更（2026-09，commit `7e98da6`）**
> 本文件保留 Round 12 當時的設計原樣。第 3.1 節的 `GameSaveEnvelope` 與第 4 節的 `SaveManager` 載入流程已被存檔格式 v2 取代：
> - `formatVersion` 現為 `1 | 2`，載入時接受兩者（`SUPPORTED_SAVE_FORMAT_VERSIONS`），而非硬性 `=== 1`。
> - v2 envelope 多出 `history` 與 `initialState`；載入 v2 時會重放棋譜重建悔棋快照，再以 `session.restoreFrom()` 原子寫入，而非 `session.loadState()`。
> - `session.loadState()` 語義未變，現在只用於 v1 舊存檔（clean baseline）。
> - 第 3.2 節的 `GameReplayEnvelope` 未變，但其版本號改由 `CURRENT_REPLAY_FORMAT_VERSION` 獨立管理。

## 1. System Context & Boundaries

```text
                           Game Platform
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
              Full State                   View State
                   │                           │
           Trusted Boundary             Public Boundary
                   │                           │
         ┌─────────┼─────────┐         ┌───────┼─────────┐
         │         │         │         │       │         │
    Local Save   Undo     Trusted     UI     Public    Public
                          Replay             Export    Replay
```

## 2. Serialization Policy & Target Classification

We establish `PersistenceTarget` to govern serialization:
- `TRUSTED_SAVE`: Serializes Authoritative Full State via `engine.serialize(state)`. Used exclusively for local session restoration.
- `TRUSTED_REPLAY`: Serializes Initial Full State + Move Records. Used for developer debugging and trusted complete re-simulation.
- `PUBLIC_EXPORT`: Serializes ViewState via `engine.serializeView(viewState)`. Guaranteed zero hidden piece attribute leakage.
- `PUBLIC_REPLAY`: Replays moves on an internal simulation session and projects each step through `engine.projectView(state, context)`.

## 3. Data Envelopes

### 3.1 `GameSaveEnvelope`
```ts
export interface GameSaveEnvelope {
  readonly formatVersion: 1;
  readonly gameId: GameId;
  readonly engineVersion: string;
  readonly state: string;
  readonly savedAt: string; // ISO 8601 string
}
```

### 3.2 `GameReplayEnvelope`
```ts
export interface GameReplayEnvelope<Move = unknown> {
  readonly formatVersion: 1;
  readonly gameId: GameId;
  readonly engineVersion: string;
  readonly initialState: string; // serialized full initial state
  readonly moves: readonly MoveRecord<Move>[];
}
```

## 4. SaveManager Architecture

`SaveManager` provides pure and atomic operations:
1. `save(session, engine)`: Produces a serialized JSON `GameSaveEnvelope`.
2. `load(envelopeJson, session, engine)`:
   - Validates JSON format, `formatVersion === 1`, matching `gameId`, non-empty `state`.
   - Attempts `engine.deserialize(envelope.state)`.
   - Validates state validity using engine methods (`getCurrentPlayer`, `isGameOver`).
   - If ANY validation step fails, throws a descriptive error and DOES NOT touch the active session.
   - If all checks pass, calls `session.loadState(deserializedState)`.
   - Establishes a new persistence baseline (clears prior undo snapshots and previous move records).

## 5. Replay Architecture & Banqi Random Initial Setup

For Banqi, the initial 32 pieces are shuffled at board creation.
- **Decision on Banqi Setup**: In Option A, `GameReplayEnvelope` captures the full initial state (`initialState = engine.serialize(initialFullState)`).
  - Why? This avoids introducing a pseudo-random seed generator dependency or breaking PRNG compatibility across browser engines.
  - Security for Public Replay: When generating a Public Replay, the initial state and all subsequent states are projected step-by-step using `engine.projectView(stepState, viewContext)`. The raw `initialState` string is NEVER sent to the public client.
  - The public replay output contains only the sequence of safe `ViewState` projections.

## 6. Replay Session

`ReplaySession<State, Move, ViewState>`:
- Encapsulates an internal playback session separate from the active game session.
- Exposes:
  - `getStepCount(): number`
  - `getCurrentStep(): number`
  - `stepTo(step: number): State` (trusted)
  - `viewAt(step: number, context: GameViewContext): ViewState` (public safe projection)
  - `exportPublicReplay(context: GameViewContext): string`

## 7. Migration & Legacy Cleanup

- Remove `maskHiddenState` and `serializeMasked` from `src/games/banqi/rules.ts` and `src/games/banqi/engine.ts`.
- Update `tests/banqi/audit.test.ts` to assert against `projectBanqiView` and `serializeView`.
