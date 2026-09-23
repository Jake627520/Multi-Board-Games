# UI Platform Specification (Change 006)

> **後續變更（2026-09，commit `39525ed`）**
> 本文件記錄 Round 6 當時的 UI 行為，保留原樣。App 進入流程之後有變，下文第一個 Scenario 的前提已不同：
> - App 現在以首頁 `GameHome` 開場（`gameId === null`），三張遊戲卡由 `registry.list()` 產生；先選一種棋才會掛載棋盤。
> - `GameSwitcher` 只在已進入某局時出現於 topbar，旁邊另有「← 回首頁」。
> - 對局進行中切換遊戲或回首頁會先跳 `window.confirm` 確認放棄本局；取消則維持原狀。
> 其餘 Scenario（下子、狀態列、悔棋）仍然成立。

## 1. Scope
Governs UI rendering, user interaction, game switching, and session synchronization across board games.

## 2. Scenarios

### Scenario: Switching games in App shell
- **Given** the user is viewing the platform
- **When** the game switcher selects `"gomoku"`
- **Then** the 15x15 Gomoku board mounts
- **And** the session starts at a fresh Gomoku initial state
- **When** the game switcher selects `"xiangqi"`
- **Then** the 9x10 Xiangqi board mounts with initial 32 pieces.

### Scenario: Playing Gomoku in browser
- **Given** an active Gomoku session
- **When** the user clicks an empty point `(7, 7)`
- **Then** a Black stone appears at `(7, 7)`
- **And** the status bar indicates it is White's turn
- **When** the user clicks point `(7, 8)`
- **Then** a White stone appears at `(7, 8)`
- **And** the status bar indicates it is Black's turn.

### Scenario: Undo in UI
- **Given** a match where one or more moves have occurred
- **When** the user clicks the "悔棋" (Undo) button
- **Then** the last placed stone/piece is removed from the board
- **And** the turn indicator restores to the prior player.
