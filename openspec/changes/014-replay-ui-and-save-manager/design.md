# Design Document: 014-replay-ui-and-save-manager

## Architecture Overview

This change brings the persistence and replay foundation established in Round 12 (`012-save-load-replay`) directly to the user interface:

```text
┌────────────────────────────────────────────────────────┐
│ UI Components                                          │
│ ┌──────────────────────┐   ┌─────────────────────────┐ │
│ │  SaveManagerPanel    │   │  ReplayControls         │ │
│ │  (List/Save/Load/    │   │  (Step/Play/Speed/Exit) │ │
│ │   Rename/Delete)     │   │                         │ │
│ └──────────┬───────────┘   └────────────┬────────────┘ │
│            │                            │              │
│            ▼                            ▼              │
│    ┌──────────────────────────────────────────────┐    │
│    │ MoveHistory (activeStep highlight + jump)    │    │
│    └──────────────────────┬───────────────────────┘    │
└───────────────────────────┼────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Hook & Session Layer                                   │
│ useGameSession                                         │
│ ├── isReplayMode, replayStep, isPlaying, replaySpeed   │
│ ├── enterReplay(), exitReplay(), replayStepTo()        │
│ └── listLocalSaves(), saveToLocal(), loadFromLocal()   │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌────────────────────────────┐  ┌────────────────────────┐
│ Local Storage Manager      │  │ ReplaySession &        │
│ (src/core/persistence/     │  │ SaveManager            │
│  local-storage.ts)         │  │ (Envelope v1 +         │
│ - Namespaced keys          │  │  atomic validation +   │
│ - Max 20 saves per game    │  │  view sanitization)    │
│ - Safe JSON validation     │  └────────────────────────┘
└────────────────────────────┘
```

## Key Decisions

1. **Storage Isolation**:
   - Keys use the namespace prefix `mbg-save:<id>`.
   - Max 20 saves per gameId to protect browser localStorage quota.
   - Saves store a `SaveMeta` record containing `id`, `name`, `gameId`, `savedAt`, `moveCount`, and `data` (the versioned `GameSaveEnvelope` JSON).
2. **Replay Flow & Mutex**:
   - `isReplayMode` disables live moves, undo, and AI turn automation.
   - Active view state is obtained via `replaySession.viewAt(step, viewContext)`.
   - For Banqi, this automatically guarantees unrevealed face-down pieces remain sanitised at every replay step.
   - Speed toggle supports 1200ms (slow), 800ms (normal), 400ms (fast).
3. **MoveHistory Integration**:
   - Replay mode highlights the current move with class `latest` and allows clicking any step item to jump directly to that position.
