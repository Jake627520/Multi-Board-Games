# Tasks: 014-replay-ui-and-save-manager

- [x] 1. Core Local Storage Persistence
  - [x] 1.1 Create `src/core/persistence/local-storage.ts` with `listSaves`, `saveGameToStorage`, `loadSaveFromStorage`, `deleteSave`, `renameSave`.
  - [x] 1.2 Write unit tests in `tests/core/local-storage.test.ts`.
- [x] 2. Hook Replay & Local Save Integration
  - [x] 2.1 Update `src/ui/hooks/useGameSession.ts` to include replay states (`isReplayMode`, `replayStep`, `isPlaying`, `replaySpeed`) and local save methods.
  - [x] 2.2 Disable AI and live moves during replay.
- [x] 3. Replay & Save UI Components
  - [x] 3.1 Create `src/ui/components/ReplayControls.tsx`.
  - [x] 3.2 Create `src/ui/components/SaveManagerPanel.tsx`.
  - [x] 3.3 Update `src/ui/components/MoveHistory.tsx` to support click-to-step and active step highlight.
  - [x] 3.4 Append styling in `src/styles.css`.
- [x] 4. Board Integration & Verification
  - [x] 4.1 Integrate Save and Replay controls into `GomokuBoard.tsx`, `XiangqiBoard.tsx`, and `BanqiBoard.tsx`.
  - [x] 4.2 Write integration tests in `tests/ui/replay-ui.test.ts`.
  - [x] 4.3 Verify full test suite, tsc, and vite build (40 files, 163 tests passing).
