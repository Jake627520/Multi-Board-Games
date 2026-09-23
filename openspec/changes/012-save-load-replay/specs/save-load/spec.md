# Specification: Save / Load Lifecycle & Envelope


> **後續變更（2026-09，commit `7e98da6`）**
> 本文件記錄的是 Round 12 當時的決策，保留原樣。存檔格式後來升級到 **v2**，與下文有三處出入：
> - `CURRENT_SAVE_FORMAT_VERSION` 現為 `2`（`src/core/persistence/save-manager.ts`）；載入端接受 `SUPPORTED_SAVE_FORMAT_VERSIONS = [1, 2]`，而非僅 `1`。
> - `GameSaveEnvelope` 新增選填的 `history` 與 `initialState`（v1 存檔沒有這兩欄）。
> - 「Baseline Reset」只在載入 **v1** 存檔時成立。v2 存檔改走 `session.restoreFrom()`，棋譜與悔棋快照都會一併還原。

## Requirements

1. **Versioned Save Envelope**:
   - Every save must be encapsulated in a `GameSaveEnvelope` with `formatVersion = 1`.
   - Must specify `gameId` corresponding to the engine ID.
   - Must specify `engineVersion` (string).
   - Must contain string-serialized authoritative state in `state`.

2. **Strict Load Validation**:
   - Rejects non-JSON strings or non-object payloads.
   - Rejects payloads where `formatVersion` is missing or !== 1.
   - Rejects payloads where `gameId` does not match the target session's engine ID.
   - Rejects payloads where `state` is missing or fails `engine.deserialize`.
   - Atomic failure guarantee: If validation or deserialization fails, the active session must remain completely unmodified.

3. **Baseline Reset**:
   - On successful load, the session replaces its active state and resets its undo snapshot stack and move history, establishing a clean new baseline.

4. **Multi-Game Round-Trip**:
   - Xiangqi, Gomoku, and Banqi must all successfully save, load, and restore identical gameplay states.
   - For Banqi, all private attributes of unrevealed pieces (`player`, `type`, `rank`) must be faithfully preserved across save/load.
