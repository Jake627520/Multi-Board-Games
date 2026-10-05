# Banqi (半盤暗棋) Specification

## 1. Scope & Purpose

This specification governs the rules, hidden-information boundary and engine contract of Banqi (4 × 8 half-board dark chess, 半盤暗棋) on the Multi Board Games Platform.

**How to read this document.** Every Requirement and Scenario carries a `Source:` line. Paths are relative to the repository root and every `file:line` was checked against the code at HEAD `1a564ba`. If the code and this document ever disagree, the code is right and this document is a bug. Historical change proposals (`openspec/changes/009`, `010`, `011`) are *not* a source of truth for anything below.

Related living specs: `game-session` (move lifecycle, `restoreFrom`), `persistence` (BQK1 save format, replay-consistency check), `replay` (what a replay shows for hidden pieces), `ai` (what the Banqi AIs may observe).

Terminology:
- **Revealed / face-up (已翻開)**: `isRevealed === true`; identity (`player`, `type`, `rank`) is public.
- **Face-down (未翻開)**: `isRevealed === false`; identity exists only in the authoritative `BanqiFullState`.
- **Authoritative state** = `BanqiFullState`; **view** = `BanqiViewState` (see §8).

---

## 2. Board, Pieces & Initial State

### 2.1 Requirement: Board geometry

The board is 4 rows × 8 columns (32 cells). Coordinates are `{ row: 0..3, col: 0..7 }`, 0-indexed from the top-left.

- **Source**: `src/games/banqi/board.ts:4-5` (`ROWS = 4`, `COLS = 8`), `src/games/banqi/board.ts:17-19` (`inBounds`), `src/games/banqi/engine.ts:14` (`boardSize = "8 × 4"`).

#### Scenario: Out-of-bounds cells are never move destinations
- **Given** a revealed piece on an edge cell
- **When** `getLegalMoves` is evaluated
- **Then** no move has a destination outside rows 0–3 or columns 0–7.
- **Source**: `src/games/banqi/rules.ts:82` and `src/games/banqi/rules.ts:123` (both guard every step with `inBounds`).

### 2.2 Requirement: Piece set and ranks

A full game has exactly 32 pieces, 16 per side (`"red"` and `"black"`). Each side has: 1 general, 2 advisors, 2 elephants, 2 chariots, 2 horses, 2 cannons, 5 soldiers. Ranks are fixed: general 7, advisor 6, elephant 5, chariot 4, horse 3, cannon 2, soldier 1. Piece ids have the form `<player>-<type>-<n>` where `n` is a running number 1..32 across both sides.

- **Source**: `src/games/banqi/board.ts:7-15` (ranks), `src/games/banqi/board.ts:31-61` (counts at 36-44, id at 50), `src/games/banqi/types.ts:6-12` (piece shape).
- **Tests**: `tests/banqi/board.test.ts:10`, `tests/banqi/audit.test.ts:184`.

#### Scenario: Generating the piece set
- **Given** `generateAllPieces()`
- **When** it is called
- **Then** it returns 32 pieces, all with `isRevealed: false`, 16 `"red"` and 16 `"black"`.
- **Source**: `src/games/banqi/board.ts:31-61` (`isRevealed: false` at line 54).

### 2.3 Requirement: Initial state is a random full-face-down deal

`createInitialState()` deals the 32 pieces onto the board in row-major order after a Fisher–Yates shuffle, all face-down. `player1Color` is `null`, `winner` is `null`, `moveNumber` is `0`, and `currentPlayer` is `"red"` — a **placeholder** meaning "the side that moves first", not a colour assignment (see §3.3).

- **Source**: `src/games/banqi/engine.ts:16-24`, `src/games/banqi/board.ts:63-70` (shuffle), `src/games/banqi/board.ts:72-84` (row-major deal).

#### Scenario: Fresh game
- **Given** a Banqi engine
- **When** `createInitialState()` is invoked
- **Then** all 32 cells hold a face-down piece
- **And** `player1Color === null` and `moveNumber === 0`
- **And** `getLegalMoves()` returns exactly 32 `flip` moves.
- **Source**: `src/games/banqi/engine.ts:16-24`; `src/games/banqi/rules.ts:54-67` (32 flips, then early return because `player1Color === null`).
- **Tests**: `tests/banqi/engine.test.ts:13`.

#### Scenario: Two games deal differently
- **Given** two independent calls to `createInitialState()`
- **Then** the deals are independent random permutations (the shuffle uses `Math.random`, see Known Limitation L1).
- **Source**: `src/games/banqi/board.ts:63-70`.

---

## 3. First Flip, Colour Assignment & Turn Attribution

### 3.1 Requirement: Before the first flip only flips are legal

While `player1Color === null`, `getLegalMoves` returns only `flip` moves (one per face-down piece); no piece can move.

- **Source**: `src/games/banqi/rules.ts:54-67`.

#### Scenario: Movement is impossible before colours exist
- **Given** a state with `player1Color === null`
- **When** `getLegalMoves(state)` is evaluated
- **Then** every returned move has `type === "flip"`.
- **Source**: `src/games/banqi/rules.ts:64-67`.

### 3.2 Requirement: The first flip decides colours and passes the turn

The first flip sets `player1Color` to the colour of the piece that was flipped. After it, `currentPlayer` is the **opponent** of `player1Color`. Every later move simply toggles `currentPlayer`. `moveNumber` increases by 1 on every applied move.

- **Source**: `src/games/banqi/rules.ts:243-246` (assignment), `src/games/banqi/rules.ts:258-264` (next player), `src/games/banqi/rules.ts:273` (`moveNumber + 1`).
- **Tests**: `tests/banqi/audit.test.ts:106`, `tests/banqi/rules.test.ts:71`.

#### Scenario: First flip reveals a black piece
- **Given** the initial state with a black piece at `(0, 0)`
- **When** `{ type: "flip", pos: { row: 0, col: 0 } }` is applied
- **Then** `player1Color === "black"`
- **And** `currentPlayer === "red"`.
- **Source**: `src/games/banqi/rules.ts:243-246`, `src/games/banqi/rules.ts:259-261`.

#### Scenario: First flip reveals a red piece
- **Given** the initial state with a red piece at `(0, 0)`
- **When** that cell is flipped
- **Then** `player1Color === "red"` and `currentPlayer === "black"`.
- **Source**: `src/games/banqi/rules.ts:243-246`, `src/games/banqi/rules.ts:259-261`.

### 3.3 Requirement: Before the first flip `currentPlayer` is a placeholder

Until `player1Color` is set, `currentPlayer` carries no colour meaning: it only labels "the side to move first". Consumers must not read it as the colour of whoever moves.

- **Source**: `src/games/banqi/engine.ts:19` (`currentPlayer: "red", // placeholder until first flip`), `src/games/banqi/engine.ts:30-34` (doc comment), `src/games/banqi/types.ts:20-21`.

#### Scenario: UI maps seats, not colours, before the first flip
- **Given** PvE mode and the human chose the first-mover seat (`humanPlayer === "red"`)
- **And** no flip has happened
- **Then** the board treats the AI as the other seat; after the first flip it re-maps both seats to real colours using `viewState.player1Color`.
- **Source**: `src/ui/components/BanqiBoard.tsx:38-41` (seat labels), `src/ui/components/BanqiBoard.tsx:71-79` (seat → colour mapping), `src/ui/components/BanqiBoard.tsx:108-111` (sync of `player1Color`).

### 3.4 Requirement: The recorded mover of a move is decided after the move (`moverOf`)

`GameEngine.moverOf?(before, after)` is an optional engine hook. When present, `GameSession.move` uses it to decide `MoveRecord.player`; otherwise it falls back to `getCurrentPlayer(before)`. Banqi overrides it: if the move took `player1Color` from `null` to a colour, the mover is that colour (the first flip is recorded under the colour it revealed); otherwise the mover is `before.currentPlayer`.

- **Source**: `src/core/game/types.ts:69-74` (hook contract), `src/games/banqi/engine.ts:35-40` (override), `src/core/game/session.ts:80-96` (use at 91-94).
- **Tests**: `tests/banqi/first-flip-mover.test.ts:30,38,46`.

#### Scenario: First flip reveals black — recorded as black
- **Given** the initial state (placeholder `currentPlayer === "red"`) and a black piece at the flipped cell
- **When** `session.move(flip)` is called
- **Then** `session.getHistory()[0].player === "black"`
- **And** `session.getCurrentPlayer() === "red"` (so history says "black flipped" and then it is red's turn).
- **Source**: `src/games/banqi/engine.ts:36-38`, `src/core/game/session.ts:91-94`.

#### Scenario: Every move after the first
- **Given** `player1Color !== null`
- **When** any move is applied
- **Then** the recorded player equals `currentPlayer` before the move.
- **Source**: `src/games/banqi/engine.ts:39`.

---

## 4. Movement & Capture

### 4.1 Requirement: Two kinds of move; a turn is one of them

A move is either `{ type: "flip", pos }` or `{ type: "move", from, to }`. On their turn the current player may (a) flip **any** face-down piece on the board (regardless of colour — identities are unknown), or (b) once colours exist, move one of **their own revealed** pieces.

- **Source**: `src/games/banqi/types.ts:14-16`, `src/games/banqi/rules.ts:54-62` (flips), `src/games/banqi/rules.ts:69-136` (moves; own-revealed filter at 73).
- **Tests**: `tests/banqi/audit.test.ts:256`.

#### Scenario: Flip and move are both offered
- **Given** `player1Color !== null`, the current player has a revealed piece with a free neighbour, and at least one face-down piece remains
- **When** `getLegalMoves` is evaluated
- **Then** it contains both `flip` moves and `move` moves.
- **Source**: `src/games/banqi/rules.ts:54-62`, `src/games/banqi/rules.ts:69-136`.

#### Scenario: Face-down pieces never move
- **Given** a face-down piece of the current player's colour
- **Then** no `move` has it as `from`.
- **Source**: `src/games/banqi/rules.ts:73` (`!piece.isRevealed` ⇒ skipped).

### 4.2 Requirement: Non-cannon pieces move one orthogonal step

A revealed non-cannon piece may step one cell orthogonally into an empty cell, or onto an adjacent cell where `canCapture` holds (§4.3). There is no sliding movement.

- **Source**: `src/games/banqi/rules.ts:24-29` (4 directions), `src/games/banqi/rules.ts:118-134`.

#### Scenario: Step into empty / capture adjacent
- **Given** a revealed red chariot at `(1, 1)` with an empty cell at `(1, 2)` and a revealed black horse at `(0, 1)`
- **Then** `(1, 1)→(1, 2)` and `(1, 1)→(0, 1)` are legal
- **And** `(1, 1)→(1, 3)` is not.
- **Source**: `src/games/banqi/rules.ts:125-132`.

### 4.3 Requirement: Capture hierarchy (`>=`, same rank may capture)

`canCapture(attacker, defender)` is true when, in this order: the defender is revealed; the two pieces are of different colours; **soldier (rank 1) vs general (rank 7) ⇒ true**; **general (7) vs soldier (1) ⇒ false**; otherwise `attacker.rank >= defender.rank`. Equal ranks can therefore capture each other.

- **Source**: `src/games/banqi/rules.ts:31-46`.
- **Tests**: `tests/banqi/rules.test.ts:17,26`, `tests/banqi/audit.test.ts:124`.

#### Scenario: Higher rank captures lower
- **Given** a revealed red chariot (4) adjacent to a revealed black horse (3)
- **Then** `canCapture(chariot, horse) === true` and `canCapture(horse, chariot) === false`.
- **Source**: `src/games/banqi/rules.ts:45`.

#### Scenario: Equal ranks capture each other
- **Given** two revealed chariots of opposite colours, adjacent
- **Then** each can capture the other.
- **Source**: `src/games/banqi/rules.ts:45` (`>=`).

#### Scenario: Soldier captures general, general does not capture soldier
- **Given** a revealed red soldier adjacent to a revealed black general
- **Then** `canCapture(soldier, general) === true`
- **And** `canCapture(general, soldier) === false`.
- **Source**: `src/games/banqi/rules.ts:38-42`.

#### Scenario: Soldier cannot capture a higher rank other than the general
- **Given** a revealed soldier adjacent to a revealed enemy cannon (rank 2)
- **Then** `canCapture(soldier, cannon) === false` (only the general exception applies).
- **Source**: `src/games/banqi/rules.ts:39`, `src/games/banqi/rules.ts:45`.

### 4.4 Requirement: Face-down pieces cannot be captured; same colour never captures

A face-down piece is immune to adjacent capture and to cannon capture. A piece never captures a piece of its own colour.

- **Source**: `src/games/banqi/rules.ts:33` (face-down), `src/games/banqi/rules.ts:36` (same colour), `src/games/banqi/rules.ts:107` (cannon target must be `isRevealed` and an opponent).
- **Tests**: `tests/banqi/rules.test.ts:36`, `tests/banqi/audit.test.ts:69`.

#### Scenario: Adjacent face-down piece
- **Given** a revealed red general adjacent to a face-down black soldier
- **Then** moving onto the face-down cell is not legal (the general may still flip it, as a separate `flip` move).
- **Source**: `src/games/banqi/rules.ts:33`, `src/games/banqi/rules.ts:54-62`.

### 4.5 Requirement: Cannon movement and jump capture

A revealed cannon moves one orthogonal step into an **empty** cell only (it never steps onto an occupied cell). It captures by jumping, along one of the four straight lines, over **exactly one** piece (the "screen") and landing on the **first** piece behind the screen. The screen may be any piece — face-up or face-down, friend or foe. The landing piece must be revealed and of the opposite colour. Rank is **not** checked for cannon captures. If the first piece behind the screen is face-down or friendly, there is no capture along that line (and the scan stops: a cannon never jumps two pieces).

- **Source**: `src/games/banqi/rules.ts:77-117` (step 79-85; scan 87-117; screen 99-102; target 105-111).
- **Tests**: `tests/banqi/rules.test.ts:41`, `tests/banqi/audit.test.ts:148`.

#### Scenario: Cannon captures a higher-ranked piece
- **Given** a red cannon at `(0, 0)`, any piece at `(0, 1)` (screen), and a revealed black general at `(0, 2)`
- **Then** `(0, 0)→(0, 2)` is legal.
- **Source**: `src/games/banqi/rules.ts:105-110` (no rank comparison).

#### Scenario: Screen may be face-down or friendly
- **Given** a red cannon at `(0, 0)`, a face-down piece at `(0, 1)`, and a revealed black soldier at `(0, 2)`
- **Then** `(0, 0)→(0, 2)` is legal.
- **Source**: `src/games/banqi/rules.ts:100-102`.

#### Scenario: Two pieces in a row stop the scan
- **Given** a red cannon at `(0, 0)`, pieces at `(0, 1)` and `(0, 2)`, and a revealed black piece at `(0, 3)`
- **Then** `(0, 0)→(0, 3)` is not legal.
- **Source**: `src/games/banqi/rules.ts:105-111` (`break` after the first piece behind the screen).

#### Scenario: Cannon does not capture adjacently
- **Given** a red cannon at `(0, 0)` and a revealed black piece at `(0, 1)` with nothing behind it
- **Then** `(0, 0)→(0, 1)` is not legal.
- **Source**: `src/games/banqi/rules.ts:79-85` (steps only into `null`), `src/games/banqi/rules.ts:99-103` (an adjacent piece becomes the screen).

### 4.6 Requirement: `applyMove` rejects illegal moves; `applyMoveUnchecked` does not

`BanqiEngine.applyMove` throws `"Illegal Banqi move"` for any move not in `getLegalMoves(state)`. `applyMoveUnchecked` (used by AI search) performs no legality check beyond structural sanity (flipping an empty/revealed cell throws `"Cannot flip cell"`; moving from an empty cell throws `"No piece at source"`). A move onto an occupied cell replaces (captures) the occupant.

- **Source**: `src/games/banqi/engine.ts:46-69`, `src/games/banqi/rules.ts:227-256` (errors at 234-236 and 249-251; capture flag at 253).

#### Scenario: Illegal move rejected
- **Given** a state and a move absent from `getLegalMoves`
- **When** `engine.applyMove(state, move)` is called
- **Then** it throws `"Illegal Banqi move"`.
- **Source**: `src/games/banqi/engine.ts:64-66`.

---

## 5. Game End: Win, Loss and Draw

### 5.1 Requirement: Winning by capturing every enemy piece

Once colours exist (`player1Color !== null`), if one side has no pieces left on the board (face-up or face-down) and the other has some, the other side wins. `applyMoveUnchecked` stores the result in `state.winner` immediately.

- **Source**: `src/games/banqi/rules.ts:165-187` (`getWinner`), `src/games/banqi/rules.ts:278-282` (stored).
- **Tests**: `tests/banqi/rules.test.ts:91`, `tests/banqi/audit.test.ts:239`.

#### Scenario: Last enemy piece captured
- **Given** `player1Color !== null`, red to move, black has exactly one revealed piece capturable by red
- **When** red captures it
- **Then** `winner === "red"` and `isGameOver(state) === true`.
- **Source**: `src/games/banqi/rules.ts:184-187`, `src/games/banqi/rules.ts:158-160`.

### 5.2 Requirement: Winning because the opponent has no legal move

If, after a move, the player to move has no legal move (and colours exist), that player loses. Because a flip is always available while any face-down piece exists, this can only happen when no face-down piece remains.

- **Source**: `src/games/banqi/rules.ts:189-193`, `src/games/banqi/rules.ts:54-62` (flips are unconditional).
- **Tests**: `tests/banqi/audit.test.ts:218`.

#### Scenario: Blockaded side loses
- **Given** all pieces revealed, black to move and none of black's pieces has a legal move
- **Then** `getWinner(state) === "red"`.
- **Source**: `src/games/banqi/rules.ts:190-192`.

### 5.3 Requirement: Draw by threefold repetition

After every move that is neither a flip nor a capture ("non-progress move"), the engine hashes the resulting position signature (§6) into `positionHistory`. If the same hash now occurs **three or more times** in `positionHistory`, the state gets `isDraw: true`. If `positionHistory` was absent or empty before the move, it is seeded with the hash of the position **before** the move, so the starting position counts as the first occurrence.

- **Source**: `src/games/banqi/rules.ts:288-304` (seed at 291-294, count at 299-302, draw at 304), `src/games/banqi/rules.ts:222-225`.
- **Tests**: `tests/banqi/draw.test.ts:45`.

#### Scenario: Shuffling back and forth
- **Given** two revealed, non-capturing pieces and no hidden pieces
- **When** the same position (same side to move) arises for the third time through non-progress moves
- **Then** `isDraw === true`, `winner === null`.
- **Source**: `src/games/banqi/rules.ts:299-306`.

### 5.4 Requirement: Draw after 60 consecutive non-progress plies

`BANQI_NO_PROGRESS_LIMIT = 60`. `nonProgressCount` increments on every non-progress move and a draw is declared when it reaches 60. The unit is plies (single moves by either side), i.e. 30 moves each. A state without `nonProgressCount` (e.g. loaded from an older save) counts from 0.

- **Source**: `src/games/banqi/rules.ts:22` (constant), `src/games/banqi/rules.ts:288` (increment; `?? 0`), `src/games/banqi/rules.ts:304`.
- **Tests**: `tests/banqi/draw.test.ts:83,130`.

#### Scenario: Endgame that cannot make progress
- **Given** only a red soldier and a black general remain revealed (the general cannot capture the soldier)
- **When** the sides keep moving without capturing
- **Then** the game ends as a draw by repetition or by the 60-ply limit, never runs forever.
- **Source**: `src/games/banqi/rules.ts:42` (general cannot capture soldier), `src/games/banqi/rules.ts:304`.

### 5.5 Requirement: A flip or a capture resets both counters

A flip or a capture sets `nonProgressCount` to `0` and removes `positionHistory` from the state (the field is `undefined`, not an empty array), because flipped pieces never turn face-down again and captured pieces never return, so no earlier position can recur.

- **Source**: `src/games/banqi/rules.ts:266-268` (`isProgress`), `src/games/banqi/rules.ts:284-286`.
- **Tests**: `tests/banqi/draw.test.ts:104,159`.

#### Scenario: Capture clears history
- **Given** a state with `nonProgressCount: 40` and a non-empty `positionHistory`
- **When** a capture is applied
- **Then** `nonProgressCount === 0` and `positionHistory === undefined`.
- **Source**: `src/games/banqi/rules.ts:285`.

#### Scenario: Stored history length is bounded
- **Given** any game
- **Then** `positionHistory` cannot grow past the 60-ply limit, because every non-progress move adds one entry and the game ends at 60 (a progress move empties it).
- **Source**: `src/games/banqi/rules.ts:285`, `src/games/banqi/rules.ts:304`.
- **Tests**: `tests/banqi/draw.test.ts:159`.

### 5.6 Requirement: Terminal states and their observable meaning

- A **won** state: `winner !== null`. A **drawn** state: `isDraw === true` and `winner === null`.
- `getLegalMoves` returns `[]` for both.
- `isGameOver` is true for both, and also when colours exist and one side has no pieces, or when the player to move has no legal move.
- `getWinner` returns `null` for a draw (without this early return the "no legal moves ⇒ loses" rule would turn a draw into a win for the side not to move).
- A win takes precedence over a draw in the same move: `applyMoveUnchecked` returns before computing repetition when `getWinner(nextState)` is non-null; in that case `positionHistory` / `nonProgressCount` are not carried.
- The UI derives `isDraw` as `isGameOver && winner === null`.

- **Source**: `src/games/banqi/rules.ts:49` (no moves when over), `src/games/banqi/rules.ts:141-163` (`isGameOver`), `src/games/banqi/rules.ts:165-169` (draw has no winner), `src/games/banqi/rules.ts:278-282` (win precedence), `src/ui/hooks/useGameSession.ts:85-89` (`isDraw` derivation).

#### Scenario: Draw reports no winner
- **Given** a state with `isDraw: true`
- **Then** `isGameOver(state) === true`, `getWinner(state) === null`, `getLegalMoves(state)` is empty.
- **Source**: `src/games/banqi/rules.ts:49`, `src/games/banqi/rules.ts:142`, `src/games/banqi/rules.ts:169`.
- **Tests**: `tests/banqi/draw.test.ts:83` (asserts `isGameOver` true and `getWinner` null).

---

## 6. Position Signature (hidden-identity red line)

### 6.1 Requirement: The position signature never contains face-down identity

`positionSignature(state)` is `"<currentPlayer>|<player1Color or ->|<cells>"` where `cells` lists occupied cells in row-major order. A revealed piece is written `"r,c:<player>-<type>"`; a face-down piece is written `"r,c:#"` only — never its `player`, `type`, `rank` or `id`. Which cells are face-up is public, so it is part of the signature (otherwise a position before and after a flip would collide).

- **Source**: `src/games/banqi/rules.ts:198-220`.
- **Tests**: `tests/banqi/position-signature.test.ts:61,100,123`.

#### Scenario: Permuting hidden identities does not change the signature
- **Given** two states identical except for which real pieces lie under the face-down cells
- **Then** `positionSignature` returns the same string for both.
- **Source**: `src/games/banqi/rules.ts:213-215`.

#### Scenario: Face-up vs face-down differs
- **Given** two states identical except that one cell is face-up in one and face-down in the other
- **Then** their signatures differ.
- **Source**: `src/games/banqi/rules.ts:214` (`#` vs `player-type`).

### 6.2 Requirement: `positionHistory` stores hashes, not signatures

Entries of `positionHistory` are 32-hex-character hashes of the signature. They cover only the span since the last flip or capture (§5.5).

- **Source**: `src/games/banqi/rules.ts:222-225`, `src/games/shared/hash.ts:42-46`, `src/games/banqi/types.ts:25-31`.

#### Scenario: Stored entry shape
- **Given** a state after a non-progress move
- **Then** every `positionHistory` entry matches `^[0-9a-f]{32}$`.
- **Source**: `src/games/shared/hash.ts:36,42-46`.

---

## 7. Engine Metadata

`BanqiEngine` has `id = "banqi"`, `name = "暗棋"`, `latinName = "Banqi"`, `boardSize = "8 × 4"`, and is registered in the default registry with Xiangqi and Gomoku.

- **Source**: `src/games/banqi/engine.ts:7-14`, `src/games/registry.ts:6-11`.

---

## 8. View Projection (Player / Spectator Boundary)

### 8.1 Requirement: The view hides face-down identity

`projectView(state, context)` returns a `BanqiViewState` in which every revealed piece keeps `{ id, player, type, rank, isRevealed: true }` and every face-down piece becomes `{ id: "hidden-<row>-<col>", isRevealed: false }` — **no** `player`, `type` or `rank` keys. The view also carries `currentPlayer`, `player1Color`, `winner`, `isDraw`, `moveNumber`. It does **not** carry `positionHistory` or `nonProgressCount`.

- **Source**: `src/games/banqi/rules.ts:316-351`, `src/games/banqi/types.ts:39-61`, `src/games/banqi/engine.ts:87-89`.
- **Tests**: `tests/banqi/player-view.test.ts:48,66,81,94`, `tests/banqi/audit.test.ts:20`.

#### Scenario: Player, spectator and AI see the same thing
- **Given** any `GameViewContext` (`role: "player"` with either colour, or `"spectator"`)
- **When** `projectView` is called
- **Then** the result is identical — the `context` argument is ignored (`_context`).
- **Source**: `src/games/banqi/rules.ts:321` (`_context`), `src/games/banqi/rules.ts:323-341`.
- **Tests**: `tests/banqi/player-view.test.ts:48,66,81`.

#### Scenario: Hidden cell shape
- **Given** a face-down piece at `(2, 3)`
- **Then** its view is exactly `{ id: "hidden-2-3", isRevealed: false }`.
- **Source**: `src/games/banqi/rules.ts:335-339`.

### 8.2 Requirement: Projection is a pure copy

Projection does not mutate the authoritative state, and the view board is structurally independent of it.

- **Source**: `src/games/banqi/rules.ts:323-341` (builds new objects via `map`).
- **Tests**: `tests/banqi/player-view.test.ts:108,120`.

### 8.3 Requirement: `serializeView` is the view as JSON

`serializeView(view)` is `JSON.stringify(view)`; since the view contains no hidden identity, neither does its serialization. `GameSession.getView(context)` delegates to the engine and performs no masking of its own.

- **Source**: `src/games/banqi/engine.ts:83-85`, `src/core/game/session.ts:68-70`.
- **Tests**: `tests/banqi/player-view.test.ts:132`, `tests/serialization/banqi-hidden-info-not-leaked.test.ts:32,105`.

### 8.4 Requirement: Undo restores authoritative identity

Undo restores the previous **authoritative** state (not a view), so a piece that was flipped is face-down again with its original identity.

- **Source**: `src/core/game/session.ts:80-87` (snapshots hold full states), `src/core/game/session.ts:98-104`.
- **Tests**: `tests/banqi/audit.test.ts:199`.

---

## 9. Authoritative Serialization (summary; format lives in `persistence`)

Authoritative `serialize(state)` keeps face-down identities (it must: a saved game cannot be resumed otherwise). It uses the compact `BQK1|…` format; `deserialize` also accepts the older raw-JSON form. The full format, field order and compatibility rules are specified in `openspec/specs/persistence/spec.md`.

- **Source**: `src/games/banqi/engine.ts:79-81,91-93`, `src/games/banqi/serialization.ts:3-9` (face-down identity is deliberately kept), `src/games/banqi/serialization.ts:103-118`.

---

## 10. Known Limitations (written as limitations, not features)

- **L1 — Initial deal is not seedable.** The shuffle uses `Math.random` directly; neither the engine nor `createInitialState()` accepts an injectable random source, so tests cannot produce a deterministic deal through the public API. (`src/games/banqi/board.ts:63-70`.) Contrast with the AIs, which do accept an injectable RNG (see `ai` spec).
- **L2 — The authoritative state is not secret.** Face-down identities live in plain text in the authoritative state, in `BQK1` saves, and in the autosave slot in `localStorage`. The hidden-information guarantee is only about **views, AI observations and public exports** — not about a user inspecting their own browser storage. (`src/games/banqi/serialization.ts:3-9`.)
- **L3 — Views carry no capture record.** The view lists only pieces still on the board, so consumers (notably the AIs) cannot know which pieces have been captured. (`src/games/banqi/types.ts:54-61`; consequence documented at `src/games/banqi/determinize.ts:44-52`.)
- **L4 — No other Banqi variants.** Every non-cannon piece moves exactly one step; there is no sliding chariot and no chain capture. (`src/games/banqi/rules.ts:118-134`.)
- **L5 — Draw thresholds are this project's own choice.** Three repetitions and 60 plies are encoded constants with a rationale comment, not a standard tournament rule. (`src/games/banqi/rules.ts:14-22`, `src/games/banqi/rules.ts:304`.)
- **L6 — Banqi deserialization does not normalise `positionHistory`.** Unlike Xiangqi, which converts legacy full-signature strings to hashes, Banqi passes `positionHistory` through unchanged. (`src/games/banqi/serialization.ts:141-146`, `src/games/banqi/serialization.ts:208`; cf. `src/games/xiangqi/serialization.ts:241-248`.)
