# Persistence (Save / Load) Specification

## 1. Scope & Purpose

This specification governs how a match is saved to, and restored from, a **save envelope**, how the compact state formats work, and what integrity guarantees loading gives.

Out of scope (separate living specs): the *session* mechanics of `loadState` / `restoreFrom` (`game-session`), what a replay shows (`replay`), the reserved autosave slot (`autosave`).

**How to read this document.** Every Requirement and Scenario carries a `Source:` line (repository-relative `file:line`, checked against HEAD `1a564ba`). `openspec/changes/012-save-load-replay` is historical: it describes envelope v1 and is **not** a source of truth. If the code and this document disagree, the code is right.

---

## 2. Save Envelope

### 2.1 Requirement: Envelope shape

A save is a JSON string of a `GameSaveEnvelope`:

| Field | Type | Notes |
|-------|------|-------|
| `formatVersion` | `1 \| 2` | type `SaveFormatVersion` |
| `gameId` | `GameId` | `"xiangqi" \| "gomoku" \| "banqi"` |
| `engineVersion` | string | informational (see L3) |
| `state` | string | `engine.serialize(authoritative state)` |
| `savedAt` | ISO-8601 string | informational |
| `history?` | `MoveRecord[]` | v2: full move list |
| `initialState?` | string | v2: serialized starting position |

`MoveRecord` is `{ move, player, notation? }`.

- **Source**: `src/core/persistence/types.ts:3-21` (envelope), `src/core/game/types.ts:22-26` (`MoveRecord`), `src/core/game/types.ts:15` (`GameId`).

### 2.2 Requirement: Current and loadable versions

New saves are written at `formatVersion = 2` (`CURRENT_SAVE_FORMAT_VERSION`). Loading accepts `1` and `2` (`SUPPORTED_SAVE_FORMAT_VERSIONS`); any other value (including a missing or non-number `formatVersion`) is rejected.

- **Source**: `src/core/persistence/save-manager.ts:5` (current = 2), `src/core/persistence/save-manager.ts:12` (supported = [1, 2]), `src/core/persistence/save-manager.ts:59-66` (rejection).
- **Tests**: `tests/core/save-load.test.ts:13,56`.

#### Scenario: Saving writes v2
- **Given** a session with any number of moves
- **When** `SaveManager.save(session, engine)` is called
- **Then** the JSON has `formatVersion: 2`, `gameId`, `engineVersion`, `state` (current position), `initialState` (the session's starting position), `history` (copy of the session history) and `savedAt`.
- **Source**: `src/core/persistence/save-manager.ts:21-35`.

#### Scenario: Unsupported version
- **Given** an envelope with `formatVersion: 3` (or absent, or a string)
- **When** `load` is called
- **Then** it throws `Unsupported format version: …` and the session is untouched.
- **Source**: `src/core/persistence/save-manager.ts:59-66`.

### 2.3 Requirement: Strict structural validation, all before any write

`load` validates, in order: the text parses as JSON (`Malformed JSON…`); the payload is a non-array object; `formatVersion` is supported; `gameId` equals the target engine's id (`Game ID mismatch…`); `engineVersion` is a non-blank string; `state` is a non-blank string; `engine.deserialize(state)` succeeds and returns an object on which `getCurrentPlayer` and `isGameOver` can be evaluated (otherwise `Corrupted state payload…`). The session is touched only after every check of the chosen path has passed.

- **Source**: `src/core/persistence/save-manager.ts:46-95` (checks), writes only at `src/core/persistence/save-manager.ts:99` and `:106`.
- **Tests**: `tests/core/save-load.test.ts:35,44,56,72,94`.

#### Scenario: Wrong game
- **Given** a Gomoku envelope and a Xiangqi session
- **When** `load` is called
- **Then** it throws `Game ID mismatch…` and the live session is unchanged.
- **Source**: `src/core/persistence/save-manager.ts:69-73`.

#### Scenario: Corrupted state text
- **Given** an envelope whose `state` is not a valid serialization
- **When** `load` is called
- **Then** it throws `Corrupted state payload: …` and the live session is unchanged.
- **Source**: `src/core/persistence/save-manager.ts:83-95`.

---

## 3. Loading: v1 Path and v2 Path

### 3.1 Requirement: v1 saves load through `loadState` (clean baseline)

If `formatVersion < 2`, **or** `history` is absent, the position is loaded with `session.loadState(state)`: history and undo snapshots are empty and the loaded position becomes the session's `initialState`. (A `formatVersion: 2` envelope that lacks `history` takes this same path.)

- **Source**: `src/core/persistence/save-manager.ts:97-101`, `src/core/game/session.ts:37-46`.
- **Tests**: `tests/core/save-load.test.ts:229`, `tests/serialization/legacy-compat.test.ts:95,114,132`, `tests/ui/legacy-save-v1.test.ts:50,86`.

#### Scenario: Loading a legacy v1 save
- **Given** a hand-written `formatVersion: 1` envelope with only `state`
- **When** `load` is called
- **Then** `session.getState()` equals the saved position
- **And** `session.getHistory()` is empty
- **And** `session.undo()` is a no-op.
- **Source**: `src/core/persistence/save-manager.ts:98-100`, `src/core/game/session.ts:41-46`.

### 3.2 Requirement: v2 saves load through `restoreFrom` (history, undo and replay preserved)

For `formatVersion 2` with a `history`, `load` rebuilds a `SessionRestorePayload` (`state`, `initialState`, `history`, `snapshots`) and calls `session.restoreFrom(payload)`. Afterwards undo walks back through the restored snapshots, and replay starts from the restored `initialState`.

- **Source**: `src/core/persistence/save-manager.ts:103-106`, `src/core/game/session.ts:53-66`, `src/core/game/session.ts:7-16` (payload).
- **Tests**: `tests/core/save-load.test.ts:195`, `tests/integration/save-load-replay.integration.test.ts:18,66,85`.

#### Scenario: Load a v2 save then undo
- **Given** a v2 save of a game with N moves
- **When** it is loaded and `session.undo()` is called
- **Then** the position is the one before move N, and `getHistory().length === N − 1`.
- **Source**: `src/core/game/session.ts:98-104`, `src/core/persistence/save-manager.ts:148-156` (snapshots are the positions before each move).

### 3.3 Requirement: Structural validation of the v2 fields

`history` must be an array and `initialState` a non-blank string. Each history entry must be a non-array object with a defined `move`, a string `player`, and (if present) a string `notation`. Failure throws `Invalid envelope…` / `Invalid history entry at index i…`.

- **Source**: `src/core/persistence/save-manager.ts:118-146`.

#### Scenario: v2 without initialState
- **Given** a v2 envelope with `history` but no `initialState`
- **When** `load` is called
- **Then** it throws `Invalid envelope: v2 save requires an initialState payload` and the session is untouched.
- **Source**: `src/core/persistence/save-manager.ts:121-123`.

---

## 4. Replay-Consistency Check (the v2 integrity gate)

### 4.1 Requirement: The saved history must reproduce the saved state

On the v2 path, `load` deserializes `initialState` and re-applies every `history[i].move` in order through `engine.applyMove` (which itself rejects illegal moves), recording the position before each move as an undo snapshot. The final replayed position must serialize identically to the saved `state`; otherwise `load` throws `Corrupted history payload: …` and the session is untouched.

- **Source**: `src/core/persistence/save-manager.ts:148-174`; engines validate in `applyMove`: `src/games/banqi/engine.ts:46-69`, `src/games/xiangqi/rules.ts:278-284`, `src/games/gomoku/rules.ts:226-240`.
- **Tests**: `tests/serialization/legacy-compat.test.ts:179`, `tests/serialization/legacy-position-history.test.ts:105`.

#### Scenario: Illegal move inside history
- **Given** a v2 envelope whose `history` contains a move that is illegal at that point
- **When** `load` is called
- **Then** it throws `Corrupted history payload: …` (the engine's own error text is appended) and the session is untouched.
- **Source**: `src/core/persistence/save-manager.ts:151-162`.

#### Scenario: History and state disagree
- **Given** a v2 envelope where the replayed final position differs from `state` (for example `state` was edited)
- **When** `load` is called
- **Then** it throws `Corrupted history payload: Replaying the saved history does not reproduce the saved state`.
- **Source**: `src/core/persistence/save-manager.ts:170-174`.

### 4.2 Requirement: The comparison is canonical, not textual

The check compares `engine.serialize(replayed)` with `engine.serialize(deserialize(state))` — both produced by the **current** serializer — not the raw `state` text. A save written in an older text format therefore still passes if it describes the same position; a truly different position does not.

- **Source**: `src/core/persistence/save-manager.ts:164-170`.
- **Tests**: `tests/serialization/legacy-compat.test.ts:152,179`.

#### Scenario: Old-format v2 save
- **Given** a v2 envelope whose `state`, `initialState` were written by an earlier raw-JSON serializer
- **When** `load` is called
- **Then** it loads successfully with history and undo restored.
- **Source**: `src/core/persistence/save-manager.ts:164-170`.

### 4.3 Requirement: Atomicity

No write to the session happens before every validation and the whole replay has finished. `restoreFrom` additionally refuses a payload whose `snapshots.length !== history.length` before writing anything. A failed `load` leaves `state`, `initialState`, `history` and `snapshots` exactly as they were.

- **Source**: `src/core/persistence/save-manager.ts:41-107`, `src/core/game/session.ts:53-66` (check at 54-58, writes at 60-65).
- **Tests**: `tests/core/save-load.test.ts:72,94`.

#### Scenario: Failed load keeps the live game
- **Given** a live game in progress and a corrupted envelope
- **When** `load` throws
- **Then** the live game's state, history and undo stack are unchanged.
- **Source**: `src/core/persistence/save-manager.ts:41-107`.

---

## 5. Compact State Serialization

### 5.1 Requirement: Self-describing version prefix

Each game's `serialize` produces a string starting with a fixed version tag followed by `|`: `XQK1|` (Xiangqi), `GMK1|` (Gomoku), `BQK1|` (Banqi). `deserialize` dispatches on the prefix; a string that is neither the legacy JSON form (starts with `{`) nor the game's own tag is rejected with `Unrecognized … serialized format`.

- **Source**: `src/games/xiangqi/serialization.ts:31,250-267`, `src/games/gomoku/serialization.ts:22,142-158`, `src/games/banqi/serialization.ts:39,211-227`.

#### Scenario: Wrong prefix
- **Given** a string `"ZZZ1|…"`
- **When** any game's `deserialize` is called
- **Then** it throws `Unrecognized <game> serialized format`.
- **Source**: `src/games/banqi/serialization.ts:227`, `src/games/xiangqi/serialization.ts:266`, `src/games/gomoku/serialization.ts:158`.

### 5.2 Requirement: Fixed field order makes the encoding canonical

Fields appear in a fixed order; absent optional fields are written as `_`. Hence `serialize(deserialize(serialize(s))) === serialize(s)` and `deserialize(serialize(s))` deep-equals `s`. Field layouts:

- `XQK1|board|currentPlayer|winner|moveNumber|isDraw|terminationReason|positionHistory|checkHistory|nonCaptureCount|idOverrides` (11 fields, exact).
- `GMK1|board|currentPlayer|winner|isDraw|moveNumber|ruleMode|winningLine` (8 fields, exact).
- `BQK1|board|currentPlayer|player1Color|winner|isDraw|moveNumber|idOverrides|positionHistory|nonProgressCount` (10 fields; a legacy 8-field payload without the last two is also accepted, with those two decoded as `undefined`).

- **Source**: `src/games/shared/compact-fields.ts:1-8` (`_` convention), `src/games/xiangqi/serialization.ts:3-4,102-126,128-130`, `src/games/gomoku/serialization.ts:1-12,52-78`, `src/games/banqi/serialization.ts:10-16,103-118,120-129`.
- **Tests**: `tests/serialization/compact-roundtrip.property.test.ts:72,78,84,90` (200 seeded random states per game, lossless and canonical).

#### Scenario: Round trip
- **Given** any reachable state of any game
- **When** it is serialized, deserialized and serialized again
- **Then** the restored state deep-equals the original and the two strings are identical.
- **Source**: `src/games/banqi/serialization.ts:103-118,120-149`.

#### Scenario: Banqi legacy field count
- **Given** a `BQK1` string with exactly 8 fields
- **When** it is deserialized
- **Then** it succeeds with `positionHistory` and `nonProgressCount` `undefined`
- **And** a string with any other field count throws `Invalid BQK1 payload`.
- **Source**: `src/games/banqi/serialization.ts:42-43,120-129`.

### 5.3 Requirement: Board encoding

Rows are separated by `/`; within a row tokens are separated by `,`. A purely numeric token is a run of empty cells; any other token is one piece. Because tokens are comma-delimited, a piece's digits cannot be confused with an empty run. Row and column counts are validated on decode.

- **Source**: `src/games/shared/board-fen.ts:1-13,19-67`.

#### Scenario: Wrong shape
- **Given** a Banqi board string with 3 rows, or a row of 7 cells
- **When** it is decoded
- **Then** it throws `Board row count mismatch` / `Row length mismatch`.
- **Source**: `src/games/shared/board-fen.ts:51-53,61-67`.

### 5.4 Requirement: Piece tokens and ids round-trip exactly

A Banqi piece token is `<letter><revealedFlag><idSuffix>`, e.g. `R15` = red chariot, face-up (`1`), id suffix `5`; letters follow the Xiangqi alphabet, uppercase = red. `rank` is not stored (it is recomputed from `type`). If a piece id is not exactly `<player>-<type>-<digits>` (for example a hand-built id), the real id goes into `idOverrides` and the token carries suffix `0`; ids are restored character for character.

- **Source**: `src/games/banqi/serialization.ts:10-21,61-101`, `src/games/shared/piece-codes.ts:1-4,44-60`, `src/games/shared/compact-fields.ts:44-66`.

#### Scenario: Non-standard id
- **Given** a Banqi piece whose id is `"r-g"`
- **When** the state is serialized and deserialized
- **Then** the piece id is still `"r-g"` (carried in `idOverrides`).
- **Source**: `src/games/banqi/serialization.ts:68-73,95-99`, `src/games/shared/piece-codes.ts:44-56`.

### 5.5 Requirement: Position history is stored as hashes

`positionHistory` entries (Xiangqi and Banqi repetition detection) are 32-hex-character hashes of the position signature, not the signature text, to keep saves small. The hash is deterministic and synchronous (two FNV-1a 64-bit passes with different offset bases).

- **Source**: `src/games/shared/hash.ts:1-12,36,42-51`, `src/games/banqi/rules.ts:222-225`, `src/games/xiangqi/serialization.ts:235-248`.
- **Tests**: `tests/xiangqi/position-history-hash.test.ts` (Xiangqi), `tests/banqi/draw.test.ts:159` (Banqi history bounded).

#### Scenario: Banqi hashes carry no hidden identity
- **Given** a Banqi game with face-down pieces
- **Then** `positionHistory` contains only hashes of signatures that write face-down cells as `#` (see `banqi` §6).
- **Source**: `src/games/banqi/rules.ts:207-225`.

### 5.6 Requirement: Authoritative serialization keeps hidden identity

`engine.serialize` serializes the **authoritative** state; for Banqi that includes the true identity of face-down pieces (a save could not otherwise resume the game). This path must never be reused for views or public exports.

- **Source**: `src/games/banqi/serialization.ts:3-9`, `src/core/persistence/save-manager.ts:29-30` (`engine.serialize(session.getState())`).
- **Tests**: `tests/core/save-load.test.ts:153`, `tests/integration/save-load-replay.integration.test.ts:85` (load does not re-shuffle).

#### Scenario: Banqi load does not re-randomize
- **Given** a saved Banqi game with face-down pieces
- **When** it is loaded
- **Then** face-down pieces keep their saved identities and the initial deal is the saved `initialState`, not a new shuffle.
- **Source**: `src/core/persistence/save-manager.ts:152`, `src/games/banqi/serialization.ts:79-101`.

---

## 6. Backward Compatibility

### 6.1 Requirement: Legacy raw-JSON states still deserialize

Each game's `deserialize` accepts a string starting with `{` as the legacy `JSON.stringify(state)` form, after a runtime shape check (board dimensions, piece fields, `currentPlayer`, `winner`, `moveNumber`); invalid shape throws `Invalid legacy <game> state: …`, bad JSON throws `Malformed legacy <game> JSON`.

- **Source**: `src/games/banqi/serialization.ts:163-223`, `src/games/xiangqi/serialization.ts:188-262`, `src/games/gomoku/serialization.ts:146-153`.
- **Tests**: `tests/serialization/legacy-compat.test.ts:95,114,132,152`.

#### Scenario: Legacy Xiangqi position history
- **Given** an old save whose Xiangqi `positionHistory` holds full signature strings
- **When** it is deserialized
- **Then** every entry is converted to its hash (entries already in hash form are left as is), and threefold repetition keeps working.
- **Source**: `src/games/xiangqi/serialization.ts:241-248,268-271`.
- **Tests**: `tests/serialization/legacy-position-history.test.ts:63`.

### 6.2 Requirement: Version-1 envelopes remain loadable

See §3.1. Version 1 stays in `SUPPORTED_SAVE_FORMAT_VERSIONS` permanently; dropping it would be a breaking change to users' stored saves.

- **Source**: `src/core/persistence/save-manager.ts:7-12`.

---

## 7. Replay Envelope

A replay is a separate envelope: `{ formatVersion: 1, gameId, engineVersion, initialState, moves }`. Its version number (`CURRENT_REPLAY_FORMAT_VERSION = 1`) is deliberately independent of the save envelope's. `ReplayManager.createReplay` builds it from a live session; behaviour of loading it is specified in the `replay` spec.

- **Source**: `src/core/persistence/types.ts:23-29`, `src/core/persistence/replay-manager.ts:6-10,70-85`.

---

## 8. Persistence Targets & Public Export Guard

`PersistenceTarget` names four destinations (`TRUSTED_SAVE`, `TRUSTED_REPLAY`, `PUBLIC_EXPORT`, `PUBLIC_REPLAY`). `exportPublicView(session, engine, context)` always projects through the view (`session.getView`) before `engine.serializeView`, never serializing the authoritative state.

- **Source**: `src/core/persistence/types.ts:31-38`, `src/core/persistence/policy.ts:7-19`.
- **Tests**: `tests/core/serialization-policy.test.ts:16,57`.

#### Scenario: Public export of Banqi
- **Given** a Banqi session with face-down pieces
- **When** `exportPublicView` is called
- **Then** the returned text contains no face-down piece's `player`, `type` or `rank`.
- **Source**: `src/core/persistence/policy.ts:12-19`, `src/games/banqi/engine.ts:83-89`.
- **Tests**: `tests/integration/banqi-hidden-information.integration.test.ts:36`.

---

## 9. Manual Save List (local storage)

Manual saves are stored one key per save under the prefix `mbg-save:`; `listSaves` scans only that prefix (newest first) and ignores malformed entries. Each game keeps at most 20 manual saves; saving beyond that deletes the oldest. If `localStorage` is unavailable the code falls back to an in-memory store for the page's lifetime.

- **Source**: `src/core/persistence/local-storage.ts:12-13` (prefix, limit), `:45-57` (fallback), `:63-99` (`safeParse`, `listSaves`), `:101-129` (save and trim at 120-126).
- **Tests**: `tests/core/local-storage.test.ts`.

#### Scenario: 21st manual save
- **Given** 20 manual saves for one game
- **When** a 21st is saved
- **Then** the oldest save of that game is removed and the other games' saves are untouched.
- **Source**: `src/core/persistence/local-storage.ts:120-126`.

---

## 10. Known Limitations (written as limitations, not features)

- **L1 — The replay-consistency check is a consistency check, not a signature.** It proves `initialState` + `history` ⇒ `state` through the engine's rules, but it does not prove the file is genuine: `initialState` may be any position the deserializer accepts (not necessarily a standard opening), and someone can craft a consistent trio. (`src/core/persistence/save-manager.ts:148-174`.)
- **L2 — `history[i].player` is only checked to be a string.** It is neither checked against the engine's mover nor against the `Player` union; the loaded records are used for display (the move list). The replayed *states* come from the moves, not from the recorded players. (`src/core/persistence/save-manager.ts:133-134,141-145`.)
- **L3 — `engineVersion` and `savedAt` are not validated beyond "non-blank string" / not at all.** No version-compat decision is made from `engineVersion` (it is a constant `"0.12.0"` written at save time). (`src/core/persistence/save-manager.ts:14,75-77`.)
- **L4 — `history[i].move` shape is not checked by the loader.** Only "defined" is checked; a malformed move surfaces as `Corrupted history payload` from the engine. (`src/core/persistence/save-manager.ts:130-132,151-162`.)
- **L5 — Saves hold hidden information in plain text.** Banqi authoritative state (including face-down identities) is stored unencrypted in `localStorage`; the hidden-information guarantee covers views, AI observations and public exports only. (`src/games/banqi/serialization.ts:3-9`.)
- **L6 — No UI path exports or imports a save/replay file or a public export.** `exportPublic`, `createReplay` and `enterReplay(envelope)` exist on `useGameSession`, but no component calls `exportPublic`, and the UI calls `enterReplay()` without an envelope. Persistence in the product is `localStorage` only. (`src/ui/hooks/useGameSession.ts:232-238,273-277`, `src/ui/components/BoardSidePanel.tsx:141`.)
- **L7 — Banqi `positionHistory` is not normalised on load** (Xiangqi's is). (`src/games/banqi/serialization.ts:141-146,208`; cf. `src/games/xiangqi/serialization.ts:241-248`.)
- **L8 — Loading a v1 save, or a v2 save without `history`, discards the current history and undo stack and makes the loaded position the replay origin.** There is nothing to replay before that position. (`src/core/persistence/save-manager.ts:98-101`, `src/core/game/session.ts:41-46`.)
- **L9 — Legacy Gomoku JSON must carry `ruleMode`.** The legacy-JSON shape check rejects a Gomoku state without `ruleMode: "freestyle" | "forbidden_moves"` (`Invalid legacy gomoku state: ruleMode must be …`), so "legacy compatibility" for Gomoku covers only raw-JSON states that already had `ruleMode`. (`src/games/gomoku/serialization.ts:136-138`.)
