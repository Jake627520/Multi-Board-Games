# Replay (復盤) Specification

## 1. Scope & Purpose

This specification governs replaying a finished or in-progress match: how replay is entered, stepped and auto-played, how it is isolated from the live game, and — for Banqi — **which position the board shows at each step**.

**How to read this document.** Every Requirement and Scenario carries a `Source:` line (repository-relative `file:line`, checked against HEAD `1a564ba`). `openspec/changes/012-save-load-replay` and `014-replay-ui-and-save-manager` are historical and are not a source of truth. If the code and this document disagree, the code is right.

Related specs: `persistence` (the replay envelope and the restore of `initialState`), `banqi` (the view projection), `game-session` (history and `initialState`).

---

## 2. Replay Model

### 2.1 Requirement: A replay is `initialState` + moves, precomputed

A `ReplaySession` is built from a `GameReplayEnvelope` (`initialState`, `moves`). On construction it deserializes `initialState` and applies every `moves[i].move` with `engine.applyMove`, storing the full position after each move. So a replay of N moves has N + 1 stored positions (index 0 = before any move). Construction therefore fails (throws) if any recorded move is illegal.

- **Source**: `src/core/persistence/replay-manager.ts:12-28`, `src/core/persistence/types.ts:23-29`.
- **Tests**: `tests/core/replay.test.ts:13`.

#### Scenario: Positions are deterministic
- **Given** a replay envelope of N moves
- **When** it is loaded
- **Then** `getStepCount()` is N
- **And** `stepTo(k)` for `0 ≤ k ≤ N` returns the position after k moves.
- **Source**: `src/core/persistence/replay-manager.ts:30-47`.

#### Scenario: Illegal recorded move
- **Given** an envelope containing a move that is illegal at that point
- **When** `loadReplay` is called
- **Then** construction throws (the engine's `applyMove` error propagates).
- **Source**: `src/core/persistence/replay-manager.ts:24-27`.

### 2.2 Requirement: Replay envelope validation

`ReplayManager.loadReplay` rejects: a non-object envelope (`Invalid replay envelope`); `formatVersion !== 1` (`Unsupported format version`); a `gameId` different from the engine's (`Game ID mismatch`); a non-array `moves` (`Invalid replay envelope: Missing moves list`).

- **Source**: `src/core/persistence/replay-manager.ts:10,90-108`.

#### Scenario: Wrong game
- **Given** a Xiangqi replay envelope and a Banqi engine
- **When** `loadReplay` is called
- **Then** it throws `Game ID mismatch…`.
- **Source**: `src/core/persistence/replay-manager.ts:100-102`.

### 2.3 Requirement: Step bounds

`ReplaySession.stepTo(step)` and `viewAt(step, ctx)` accept only `0 ≤ step ≤ moves.length` and throw `Step index out of bounds` otherwise. The UI-level `replayStepTo` clamps its argument into `[0, stepCount]` first, so UI controls never trigger the throw.

- **Source**: `src/core/persistence/replay-manager.ts:41-47,52-57`, `src/ui/hooks/useGameSession.ts:295-300`.

#### Scenario: Stepping past the end in the UI
- **Given** a replay at the last step
- **When** `replayNext()` is called
- **Then** the step stays at the last step (no error).
- **Source**: `src/ui/hooks/useGameSession.ts:295-305`.

---

## 3. Entering and Leaving Replay

### 3.1 Requirement: Entry condition

The "復盤回放本局" button is enabled only when the live history is non-empty (`history.length > 0`), and is not rendered while already in replay. It is **not** gated on game-over: an in-progress match can be replayed. The hook-level `enterReplay()` itself has no history check (calling it with an empty history gives a 0-step replay).

- **Source**: `src/ui/components/BoardSidePanel.tsx:123-147` (button at 139-146, `disabled={history.length === 0}` at 142), `src/ui/hooks/useGameSession.ts:273-286`.
- **Tests**: `tests/ui/banqi-board.component.test.ts:33,42` (disabled at 0 moves, enabled after).

#### Scenario: Fresh board
- **Given** a board with no moves played
- **Then** the replay button is disabled.
- **Source**: `src/ui/components/BoardSidePanel.tsx:142`.

#### Scenario: Replaying a game still in progress
- **Given** a PvE game in progress with 5 moves
- **When** the replay button is pressed
- **Then** replay mode starts at step 0 of 5.
- **Source**: `src/ui/components/BoardSidePanel.tsx:142` (only `history.length` gates), `src/ui/hooks/useGameSession.ts:277-281`.

### 3.2 Requirement: What entering does

`enterReplay()` stops auto-play, clears the AI-thinking flag, builds an envelope from the live session (`createReplay`: the session's `initialState` and a copy of its history) unless one is supplied, loads it, resets the step to 0 and sets replay mode. If loading fails it sets the error message and does **not** enter replay.

- **Source**: `src/ui/hooks/useGameSession.ts:273-286`, `src/core/persistence/replay-manager.ts:74-85`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:172-175` (step label `0 / N 步`).

#### Scenario: Entering replay
- **Given** a live game with N moves
- **When** replay is entered
- **Then** the step label reads `0 / N 步`.
- **Source**: `src/ui/hooks/useGameSession.ts:278-281`, `src/ui/components/ReplayControls.tsx:80-82`.

### 3.3 Requirement: Leaving replay

`exitReplay()` stops auto-play, clears replay mode, drops the `ReplaySession` and resets the step. The live game is unaffected. Loading a save (`loadGame`) and `reset()` also leave replay first (`loadGame` does so before attempting the load, so a failed load still leaves replay).

- **Source**: `src/ui/hooks/useGameSession.ts:152-157,217-230,288-293`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:175` (exit button).

#### Scenario: Exit returns to the live position
- **Given** a replay stopped at step 2 of 5
- **When** `exitReplay()` is called
- **Then** the board shows the live position (after all 5 moves).
- **Source**: `src/ui/hooks/useGameSession.ts:77-79` (`activeState` is the live `state` when not in replay), `:288-293`.

---

## 4. Stepping and Auto-play

### 4.1 Requirement: Manual stepping

Replay offers: jump to start (⏮, step 0), previous (◀, disabled at step 0), next (▶, disabled at the last step), jump to end (⏭), a slider over `0..totalSteps`, and click-to-jump on a move-list entry (`index + 1`; Enter/Space also activate it). All go through the clamped `replayStepTo`.

- **Source**: `src/ui/components/ReplayControls.tsx:37-78,108-117`, `src/ui/components/MoveHistory.tsx:60-73`, `src/ui/hooks/useGameSession.ts:295-310`.
- **Tests**: `tests/ui/replay-ui.test.ts:134` (keyboard activation).

#### Scenario: Previous at the start
- **Given** replay at step 0
- **Then** the previous button is disabled.
- **Source**: `src/ui/components/ReplayControls.tsx:48`.

### 4.2 Requirement: Auto-play

Auto-play advances one step per `replaySpeed` milliseconds. Speeds are `400`, `800` (default) and `1200` ms. Auto-play stops itself when the last step is reached; pressing play while already at the last step turns playing off immediately.

- **Source**: `src/ui/hooks/useGameSession.ts:58,75,312-323`, `src/ui/components/ReplayControls.tsx:16-20`.

#### Scenario: Playing to the end
- **Given** replay playing at step N − 1 of N
- **When** the timer fires
- **Then** the step becomes N and the next effect run sets `isPlaying` to false.
- **Source**: `src/ui/hooks/useGameSession.ts:313-323`.

### 4.3 Requirement: What the status area shows during replay

During replay, `currentPlayer`, `isGameOver`, `winner` and the draw flag are all computed from the **replayed** position at the current step, not from the live game. The move list shows only the first `replayStep` moves (it grows as the replay advances); the move list's displayed player names come from the recorded `MoveRecord.player`, not from replayed state.

- **Source**: `src/ui/hooks/useGameSession.ts:77-89` (state-derived values), `:387-391` (history slice), `src/ui/components/BoardSidePanel.tsx:174-183`.

#### Scenario: Winner banner appears only at the final step
- **Given** a finished game replayed from step 0
- **Then** no winner is shown until the step whose position is terminal.
- **Source**: `src/ui/hooks/useGameSession.ts:85-89`.

---

## 5. Isolation from the Live Game

### 5.1 Requirement: Replay never mutates the live session

The replay works on its own array of positions (`stepStates`); stepping it does not touch the `GameSession`. The live position is held in React `state` / the session and is only read when the replay is created.

- **Source**: `src/core/persistence/replay-manager.ts:12-28,41-47`, `src/ui/hooks/useGameSession.ts:64-65,103-104`.
- **Tests**: `tests/core/replay.test.ts:49`.

#### Scenario: Stepping back does not undo
- **Given** a live game with 3 moves and replay at step 3
- **When** the user steps to step 0 and exits
- **Then** the live game still has 3 moves.
- **Source**: `src/core/persistence/replay-manager.ts:41-47`, `src/ui/hooks/useGameSession.ts:288-293`.

### 5.2 Requirement: Live-game actions are disabled during replay

While in replay: `move()` returns `false` and does nothing; `undo()` does nothing; `legalMoves` is empty; the undo and restart buttons are disabled with an explanatory hint and the board's `handleReset` returns early; board cells are disabled; the local-save panel is not rendered.

- **Source**: `src/ui/hooks/useGameSession.ts:87-88` (`legalMoves`), `:113-114` (`move`), `:127-128` (`undo`), `src/ui/components/StatusBar.tsx:58-81`, `src/ui/components/BanqiBoard.tsx:189,241`, `src/ui/components/BoardSidePanel.tsx:185-194`.
- **Tests**: none — no test asserts that undo, restart or moves are blocked during replay (see L7).

#### Scenario: Undo during replay
- **Given** replay mode
- **When** the undo button is pressed (or `undo()` is called)
- **Then** nothing is undone; the button is disabled and shows `復盤中：悔棋與重新開始已停用…`.
- **Source**: `src/ui/hooks/useGameSession.ts:127-128`, `src/ui/components/StatusBar.tsx:59-63,77-81`.

### 5.3 Requirement: The AI is suspended during replay and resumes after

During replay the AI effect returns early, and entering replay clears the thinking flag; the effect's cleanup also cancels any pending AI timer when `isReplayMode` changes. After leaving replay the effect runs again, so if it is the AI's turn in the live game the AI moves as usual.

- **Source**: `src/ui/hooks/useGameSession.ts:273-275,325-372` (early return at 327, cancellation at 357-360, `isReplayMode` in deps at 371).

#### Scenario: Replay while the AI is thinking
- **Given** PvE with the AI to move
- **When** the user enters replay
- **Then** the pending AI move is cancelled and not applied during replay.
- **Source**: `src/ui/hooks/useGameSession.ts:341,357-360`.

### 5.4 Requirement: Autosave and "in progress" ignore replay

Autosave and the "game in progress" flag read the **live** session, never the replay position, so replaying a finished or truncated view cannot change what is saved or whether leaving needs confirmation.

- **Source**: `src/ui/hooks/useGameSession.ts:183-205` (autosave effect reads `session`), `:207-211` (`inProgress` reads live `session`, with the explanation comment).

#### Scenario: Stopped at an early replay step
- **Given** an in-progress live game, replay stopped at step 1
- **Then** `inProgress` is still `true` (and the autosave slot unchanged).
- **Source**: `src/ui/hooks/useGameSession.ts:211`.

---

## 6. Banqi: Replay Shows What Was Visible Then

### 6.1 Requirement: Each step is projected through the view

The board displays `viewState`, which in replay is `replaySession.viewAt(replayStep, viewContext)` = `engine.projectView(stepStates[step], ctx)`. Banqi's projection depends only on that step's position: a piece appears face-up at step k **only if it had been flipped within the first k moves**; every other piece is `{ id: "hidden-r-c", isRevealed: false }` with no `player`, `type` or `rank`. Consequently, replay never shows a piece's identity before the move that revealed it.

- **Source**: `src/ui/hooks/useGameSession.ts:96-101`, `src/core/persistence/replay-manager.ts:52-57`, `src/games/banqi/rules.ts:319-351`, `src/ui/components/BanqiBoard.tsx:231-263` (the board renders `viewState`, not the authoritative state).
- **Tests**: `tests/ui/replay-ui.test.ts:68` (view at step 0 hides the cell, step 1 reveals only it), `tests/core/replay.test.ts:91`, `tests/integration/banqi-hidden-information.integration.test.ts:55`.

#### Scenario: Step 0 shows a fully face-down board
- **Given** a Banqi game with at least one move
- **When** replay is at step 0
- **Then** all 32 cells are face-down.
- **Source**: `src/games/banqi/rules.ts:335-339`, `src/games/banqi/board.ts:54` (initial deal is face-down).

#### Scenario: Step k shows exactly the first k flips
- **Given** a Banqi replay whose first move flips `(0, 0)`
- **When** the replay is at step 1
- **Then** `(0, 0)` is face-up and all other cells are still face-down.
- **Source**: `src/games/banqi/rules.ts:323-341`.
- **Tests**: `tests/ui/replay-ui.test.ts:68`.

### 6.2 Design rationale (stated by the maintainer; the code itself carries no comment for the UI path)

The replay deliberately shows the position **as the players saw it**, not the position with all identities known afterwards:
1. If identities known only later were shown, a replay could not tell the user whether a flip at that moment was a gamble or a mistake — the information they had then is the information the replay must show.
2. Showing post-hoc identities would let someone replaying an *in-progress* human-vs-AI game peek at face-down pieces.

The second point follows from the mechanism below: the replay and the live board use the same projection, applied to equal positions at the final step, so replay cannot show more than the live board does.

- **Source (mechanism)**: `src/games/banqi/rules.ts:319-351` is the only projection; the replay and live paths both use `engine.projectView` (`src/ui/hooks/useGameSession.ts:96-101`). The authoritative per-step positions exist only inside `ReplaySession.stepStates` (`src/core/persistence/replay-manager.ts:14,20-27`); the UI hook returns it as `state` (`src/ui/hooks/useGameSession.ts:376`) but `BanqiBoard` does not use it (`src/ui/components/BanqiBoard.tsx:92-106`).

#### Scenario: Replaying an in-progress PvE game does not leak
- **Given** an in-progress PvE Banqi game
- **When** the user enters replay and steps to the last step
- **Then** exactly the cells that are face-up in the live game are face-up (no extra identity is revealed).
- **Source**: `src/games/banqi/rules.ts:323-341`.

### 6.3 Requirement: Public replay export projects every step

`ReplaySession.exportPublicReplay(context)` returns the JSON of `projectView` for every step, so hidden identities never appear in it.

- **Source**: `src/core/persistence/replay-manager.ts:59-67`.
- **Tests**: `tests/core/replay.test.ts:91`, `tests/integration/banqi-hidden-information.integration.test.ts:55`.

---

## 7. Known Limitations (written as limitations, not features)

- **L1 — Replay cannot be exported, imported or shared from the UI.** `exportPublicReplay` and the `enterReplay(envelope)` parameter exist, but the only UI call is `enterReplay()` with no argument, so replay is only ever of the current live game. (`src/ui/components/BoardSidePanel.tsx:141`, `src/ui/hooks/useGameSession.ts:273-277`.)
- **L2 — There is no component-level test that the rendered Banqi board hides face-down pieces during replay.** The guard is at `ReplaySession.viewAt` / projection level (`tests/ui/replay-ui.test.ts:68`); the board's use of `viewState` is verified by reading `BanqiBoard.tsx`, not by a rendering test.
- **L3 — The move list is truncated to the current step in replay**, so list entries ahead of the current step are not clickable; forward jumps use the controls or slider. (`src/ui/hooks/useGameSession.ts:387-391`.)
- **L4 — The Banqi replay's "current player" label follows the placeholder rule.** At step 0 (and until the first flip) the status shows the placeholder first-mover, not a colour. (`src/ui/hooks/useGameSession.ts:81-83`, `src/games/banqi/engine.ts:19,30-34`.)
- **L5 — Replay starts from the restored `initialState`.** For a game loaded from a v1 save (or v2 without history) that is the loaded position itself, so earlier play cannot be replayed. (`src/core/persistence/save-manager.ts:98-101`, `src/core/game/session.ts:41-46`.)
- **L6 — The hook does not forbid entering replay with zero moves.** Only the button is disabled. (`src/ui/hooks/useGameSession.ts:273-286`, `src/ui/components/BoardSidePanel.tsx:142`.)
- **L7 — Blocking of live actions during replay (§5.2) has no test.** `StatusBar`'s `isReplayMode` hint and disabled buttons, the hook's early returns in `move` / `undo`, and `BanqiBoard.handleReset`'s early return are untested. (`src/ui/hooks/useGameSession.ts:113-114,127-128`, `src/ui/components/StatusBar.tsx:58-81`.)
