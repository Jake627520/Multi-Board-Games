# Autosave & Resume Specification

## 1. Scope & Purpose

This specification governs the **autosave slot** (a reserved, automatically maintained copy of the game in progress), how it is restored, how the home page offers "continue", and when the UI asks for confirmation before leaving or discarding a game.

**How to read this document.** Every Requirement and Scenario carries a `Source:` line (repository-relative `file:line`, checked against HEAD `1a564ba`). If the code and this document disagree, the code is right.

Related specs: `persistence` (the envelope and the load-time validation that autosave reuses), `game-session` (history, restore), `replay` (replay does not affect autosave).

---

## 2. Storage Layout

### 2.1 Requirement: One slot per game under a dedicated key prefix

Autosave uses the key `mbg-autosave:<gameId>` (`AUTOSAVE_PREFIX = "mbg-autosave:"`). There is exactly one slot per game; writing replaces it and slots do not accumulate.

- **Source**: `src/core/persistence/autosave.ts:15,35-37`, `:4-14` (doc comment).
- **Tests**: `tests/core/autosave.test.ts:29,35`.

#### Scenario: Slot key
- **Given** game `"banqi"`
- **Then** `autosaveKey("banqi") === "mbg-autosave:banqi"`.
- **Source**: `src/core/persistence/autosave.ts:35-37`.

### 2.2 Requirement: Autosave never appears in the user's save list

Manual saves use the prefix `mbg-save:` and `listSaves` scans only that prefix, so an autosave slot is never listed, counted, or trimmed as a manual save. The manual-save limit (20 per game) trims only `mbg-save:` entries.

- **Source**: `src/core/persistence/local-storage.ts:12-13,84-99,120-126`, `src/core/persistence/autosave.ts:15`.
- **Tests**: `tests/core/autosave.test.ts:29,44,58`, `tests/ui/autosave-resume.component.test.ts:195`.

#### Scenario: Manual save list unaffected
- **Given** an autosave exists for a game
- **When** the manual save list is read
- **Then** the autosave is not in it, and saving a 21st manual save does not remove the autosave.
- **Source**: `src/core/persistence/local-storage.ts:90,120-126`.
- **Tests**: `tests/core/autosave.test.ts:44,58`.

### 2.3 Requirement: Content is a v2 save envelope plus UI settings

The stored text is the output of `SaveManager.save` (a v2 envelope: `state`, `initialState`, `history`, …) with an extra `ui` field when UI settings are supplied. `formatVersion` stays 2; `SaveManager.load` ignores the extra field, and manual saves never carry it.

- **Source**: `src/core/persistence/autosave.ts:17-33,51-62`, `src/core/persistence/save-manager.ts:21-35,53-107`, `src/ui/hooks/useGameSession.ts:213-215,245-253` (manual saves are written by `saveGame()` without `ui`).

#### Scenario: Manual save has no `ui`
- **Given** the user presses "儲存目前局"
- **Then** the stored envelope has no `ui` key.
- **Source**: `src/ui/hooks/useGameSession.ts:245-253`.

---

## 3. Writing

### 3.1 Requirement: Written after every change of the live position

When autosave is enabled (all three boards enable it), the hook re-runs an effect whenever the live state changes, UI settings change, or the engine/session changes; the effect writes `saveManager.save(session, engine)` together with the UI settings. It reads the **session**, not React state alone, because a Gomoku rule-mode change rebuilds the session.

- **Source**: `src/ui/hooks/useGameSession.ts:163-165,183-205`, `src/ui/XiangqiBoard.tsx:49-50`, `src/ui/components/GomokuBoard.tsx:60-61`, `src/ui/components/BanqiBoard.tsx:88-89`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:155`.

#### Scenario: Move then remount
- **Given** a board with autosave and one move played
- **When** the board is unmounted and mounted again
- **Then** history, board, replay and undo are restored.
- **Source**: `src/ui/hooks/useGameSession.ts:170-181,193-205`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:155`.

### 3.2 Requirement: Cleared when there is nothing to resume

The same effect clears the slot — instead of writing — when the session history is empty (a new game, restart, or undo back to the start) or the game is over. A finished game therefore leaves no autosave.

- **Source**: `src/ui/hooks/useGameSession.ts:193-198`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:213,233,241`, `tests/ui/app-resume.component.test.ts:94,104`.

#### Scenario: Restart
- **Given** a game with moves and an autosave
- **When** the user restarts (and confirms, §8.2)
- **Then** the autosave is removed and a remount shows an empty board.
- **Source**: `src/ui/hooks/useGameSession.ts:152-157,195-198`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:213`.

#### Scenario: Last move ends the game
- **Given** a game one move from the end
- **When** the final move is played
- **Then** the autosave is removed.
- **Source**: `src/ui/hooks/useGameSession.ts:195`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:241`.

### 3.3 Requirement: A failed write degrades silently and drops the old slot

All storage access swallows exceptions. When a write fails (quota exceeded, storage disabled, or serialization error), the **previous** autosave for that game is also removed — a stale slot would silently roll the player back a few moves on "continue", which is worse than having no autosave. The game continues normally.

- **Source**: `src/core/persistence/autosave.ts:39-45,47-68,70-76`, `src/ui/hooks/useGameSession.ts:199-203`.
- **Tests**: `tests/core/autosave.test.ts:80,94`, `tests/ui/autosave-resume.component.test.ts:262,288`, `tests/ui/app-resume.component.test.ts:136,147`.

#### Scenario: Quota exceeded
- **Given** `localStorage.setItem` throws `QuotaExceededError`
- **When** a move is played
- **Then** the move succeeds, no exception reaches the UI, `writeAutosave` returns `false`, and any older autosave for that game is gone.
- **Source**: `src/core/persistence/autosave.ts:51-68`.
- **Tests**: `tests/core/autosave.test.ts:80`.

---

## 4. Restoring

### 4.1 Requirement: Restored once, on mount, through the normal load path

When a board mounts with autosave enabled it reads the slot and loads it with `SaveManager.load` (same validation and replay-consistency check as a manual load), before the first paint. Restoration happens only on mount — not on every engine/session rebuild — because rebuilding (e.g. Gomoku rule change) means "new game".

- **Source**: `src/ui/hooks/useGameSession.ts:166-181` (comment at 166-169).
- **Tests**: `tests/ui/autosave-resume.component.test.ts:155,182`, `tests/ui/app-resume.component.test.ts:50,71,161`.

#### Scenario: Banqi is not reshuffled
- **Given** an autosave of a Banqi game
- **When** the board mounts
- **Then** the restored game has the saved initial deal (it is not a new shuffle) and can continue.
- **Source**: `src/core/persistence/save-manager.ts:152,176`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:182`.

### 4.2 Requirement: A bad slot is discarded

If loading fails (corrupt text, wrong game, a history that does not reproduce the state), the live session is left unchanged (see `persistence` §4.3), the slot is cleared, and the board starts empty. Additionally, if a board crashes, the error boundary clears that game's autosave so a reload cannot crash again.

- **Source**: `src/ui/hooks/useGameSession.ts:170-181` (catch at 177-179), `src/ui/components/GameErrorBoundary.tsx:17-39`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:298,306`.

#### Scenario: Corrupted autosave
- **Given** the slot contains text that cannot be loaded
- **When** the board mounts
- **Then** an empty game starts and the slot is removed.
- **Source**: `src/ui/hooks/useGameSession.ts:177-179`.
- **Tests**: `tests/ui/autosave-resume.component.test.ts:298`.

---

## 5. UI Settings Saved With the Game

### 5.1 Requirement: Which settings, and how they are read back

Saved with the game: `mode` (`"pvp" | "pve"`), `humanPlayer` (a string), `aiLevel` (`"l1" | "l2"`), and for Gomoku `ruleMode`. Reading them back requires a resumable autosave (§6.1) and validates each field's type; any invalid field makes the whole `ui` count as absent and the board falls back to defaults — no exception. Allowed values are further filtered per game: `humanPlayer` must be one of the game's selectable seats, `ruleMode` one of the game's rule modes.

- **Source**: `src/core/persistence/autosave.ts:17-33,95-121`, `src/ui/saved-ui.ts:13-34`, `src/ui/components/GomokuBoard.tsx:27-35`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:46` (PvE stays PvE after resume).

#### Scenario: PvE game resumes as PvE
- **Given** a PvE game in progress
- **When** it is resumed
- **Then** mode, seat and opponent are as before and the history is intact.
- **Source**: `src/ui/components/BanqiBoard.tsx:58-63`, `src/ui/saved-ui.ts:24-33`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:46`.

### 5.2 Requirement: Read once at mount; state is authoritative afterwards

Settings are read once, when the board mounts (lazy `useState` initialisers). Afterwards the in-memory settings are authoritative and are written back with every autosave. For Gomoku the stored `ruleMode` comes from the **actual position** (`state.ruleMode`) when available, because loading a save can change the effective mode.

- **Source**: `src/ui/saved-ui.ts:13-18`, `src/ui/components/BanqiBoard.tsx:58-63`, `src/ui/components/GomokuBoard.tsx:60-61`, `src/ui/hooks/useGameSession.ts:186-192`.

#### Scenario: Gomoku rule mode
- **Given** a Forbidden-Moves Gomoku game
- **When** it is autosaved
- **Then** `ui.ruleMode` is `"forbidden_moves"`.
- **Source**: `src/ui/components/GomokuBoard.tsx:61`.

---

## 6. When a Game Counts as Resumable

### 6.1 Requirement: `hasAutosave` criterion

`hasAutosave(gameId)` is true only if the slot exists, parses as a JSON object, and its `history` is a non-empty array. It is a cheap check: it does not validate the game id, the state, or the replay — full validation happens at load (§4.2).

- **Source**: `src/core/persistence/autosave.ts:78-93`.
- **Tests**: `tests/core/autosave.test.ts:66`.

#### Scenario: Not resumable
- **Given** an empty slot, unparseable text, an object without `history`, or `history: []`
- **Then** `hasAutosave` is `false`.
- **Source**: `src/core/persistence/autosave.ts:83-92`.
- **Tests**: `tests/core/autosave.test.ts:66`.

---

## 7. Home Page "Continue"

### 7.1 Requirement: When the continue bar appears

The home page shows the top "繼續上次的 <game>" bar only when **both** the last-played game (stored under `mbg:last-game`) is a registered game **and** `canResume(that game)` (= `hasAutosave`) is true. Merely having played a game is not enough, so the bar is never an empty promise. The last-played game is recorded when a game is entered and is read defensively (storage errors give "none").

- **Source**: `src/ui/components/GameHome.tsx:9-14,58-78`, `src/App.tsx:27,50-55,126`, `src/ui/last-game.ts:3-27`.
- **Tests**: `tests/ui/app-resume.component.test.ts:37,43,50,129,136`.

#### Scenario: Entered a board but made no move
- **Given** the user opened a game, made no move, and returned home
- **Then** there is no continue bar.
- **Source**: `src/core/persistence/autosave.ts:88-89` (empty history is not resumable), `src/ui/hooks/useGameSession.ts:195-198`.
- **Tests**: `tests/ui/app-resume.component.test.ts:43`.

#### Scenario: Move, home, continue
- **Given** one move played in any game
- **When** the user goes home and presses the continue bar
- **Then** the board returns with the same move count.
- **Source**: `src/App.tsx:50-55`, `src/ui/hooks/useGameSession.ts:170-181`.
- **Tests**: `tests/ui/app-resume.component.test.ts:50,71`.

### 7.2 Requirement: Every card states whether it will resume

Each game card shows "繼續對局 Resume →" if that game is resumable and "開始對局 Play →" otherwise, because selecting a card enters the game **without clearing** its autosave (so it resumes). A resumable card also shows "放棄存檔，開新局 New game" when the handler is provided.

- **Source**: `src/ui/components/GameHome.tsx:87-138`, `src/App.tsx:50-55` (`enterGame` does not clear).

#### Scenario: Card of a game that is not the last played
- **Given** game B has an autosave but the last played game is A
- **Then** B's card shows "繼續對局" and the new-game button (the continue bar shows A only if A is resumable).
- **Source**: `src/ui/components/GameHome.tsx:59-62,91,117-137`.

### 7.3 Requirement: "New game" from home asks before throwing a save away

`startNewGame(id)` asks `window.confirm("開新局會放棄這個棋種已保存、尚未結束的棋局。確定要開新局嗎？")` when the game has an autosave; on confirmation it clears the slot and enters the game, on refusal it does nothing.

- **Source**: `src/App.tsx:57-73`.

---

## 8. Confirmations

### 8.1 Requirement: Leaving the game page asks only when the game cannot be saved

Going home or switching game asks for confirmation only when **both** the game is in progress (reported by the board) **and** the game has no usable autosave (`hasAutosave` false — storage disabled, quota exceeded, write failed). With a usable autosave, leaving is silent because nothing is lost.

- **Source**: `src/App.tsx:29-48,75-92`, `src/ui/components/BanqiBoard.tsx:201-205`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:25` (a finished game reports "not in progress").

#### Scenario: Autosave works
- **Given** a game in progress with a successful autosave
- **When** the user presses "回首頁"
- **Then** no confirmation is shown.
- **Source**: `src/App.tsx:41-48`.

#### Scenario: Autosave unavailable
- **Given** a game in progress and writes failing
- **When** the user presses "回首頁"
- **Then** `window.confirm("本局無法自動保存，回首頁會放棄目前棋局。確定要離開嗎？")` is asked.
- **Source**: `src/App.tsx:41-48,86-92`, `src/core/persistence/autosave.ts:51-68`.

### 8.2 Requirement: Definition of "in progress"

A game is in progress when the **live** session has at least one move **and** the live position is not game over. Replay position does not matter.

- **Source**: `src/ui/hooks/useGameSession.ts:207-211`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:25`.

#### Scenario: Finished game
- **Given** a game that has just ended
- **Then** `inProgress` is `false` and leaving never asks.
- **Source**: `src/ui/hooks/useGameSession.ts:211`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:25`.

### 8.3 Requirement: Discard confirmation for destructive in-game actions

`confirmDiscardGame(inProgress, action)` returns `true` with no prompt when the game is not in progress; otherwise it returns the user's answer to `window.confirm("<action>會放棄目前尚未結束的棋局，已走的棋步與自動存檔都會清除。確定要繼續嗎？")`. It guards: restart, switching PvP/PvE, changing seat/colour (all three games), and changing Gomoku's rule mode. Re-selecting the option already active is a no-op and does not prompt or reset. Changing the AI opponent does not prompt (it does not discard the game).

- **Source**: `src/ui/confirm-discard.ts:1-11`, `src/ui/components/BanqiBoard.tsx:125-142,180-194`, `src/ui/XiangqiBoard.tsx:112,120,135`, `src/ui/components/GomokuBoard.tsx:111-147`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:64` (restart asks first; refusing keeps the record), `tests/ui/autosave-resume.component.test.ts:213`.

#### Scenario: Restart during a game
- **Given** a game in progress
- **When** the user presses "重新開始" and refuses
- **Then** the game and its history are unchanged.
- **Source**: `src/ui/components/BanqiBoard.tsx:188-194`.
- **Tests**: `tests/ui/leave-and-resume-guards.test.ts:64`.

#### Scenario: Restart after the game is over
- **Given** a finished game
- **When** the user presses "重新開始"
- **Then** no prompt appears.
- **Source**: `src/ui/confirm-discard.ts:9`.

---

## 9. Known Limitations (written as limitations, not features)

- **L1 — One slot per game, last writer wins; no cross-tab coordination.** No `storage` event listener exists, so two tabs of the same game overwrite each other's autosave. (`src/core/persistence/autosave.ts:35-37`; `grep` for a storage listener in `src/` finds none.)
- **L2 — `hasAutosave` is a cheap check, so the continue button can appear for a slot that later fails to load.** The slot is then cleared on entry and an empty board opens (§4.2). Unparseable text is already treated as not resumable. (`src/core/persistence/autosave.ts:78-93`.)
- **L3 — Loading a manual save does not ask for confirmation.** `loadFromLocal` → `loadGame` replaces the live game (and, via the next autosave, the autosave) without `confirmDiscardGame`. (`src/ui/hooks/useGameSession.ts:217-230,255-262`, `src/ui/components/SaveManagerPanel.tsx:105-112`.)
- **L4 — Manual saves do not carry UI settings.** Loading one does not change mode, seat, or opponent. (`src/ui/hooks/useGameSession.ts:245-253`.)
- **L5 — Switching games from the top bar resumes the target game's autosave.** `switchGame` enters the other game without clearing its slot. (`src/App.tsx:75-84`.)
- **L6 — The "unavailable autosave → ask before leaving" branch has no direct test.** Existing tests mock `confirm` for restart and new-game flows; none asserts that leaving prompts when writes fail or stays silent when they work. (`tests/ui/leave-and-resume-guards.test.ts:25,64`, `tests/ui/app-resume.component.test.ts:29,147`.)
- **L7 — `localStorage` is shared with whatever else is on the same origin.** Quota is shared (the code's own comment notes the GitHub Pages sharing). Hence the failure handling in §3.3. (`src/core/persistence/autosave.ts:12-13`.)
- **L8 — Hidden Banqi identities are stored in plain text in the slot** (authoritative state). (`src/games/banqi/serialization.ts:3-9`; see `persistence` L5.)
