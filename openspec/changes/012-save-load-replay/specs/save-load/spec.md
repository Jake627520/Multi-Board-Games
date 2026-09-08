# Specification: Save / Load Lifecycle & Envelope

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
