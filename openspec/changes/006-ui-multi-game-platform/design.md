# Change 006 Design: UI Multi-Game Platform

## 1. Architectural Component Hierarchy

```text
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         GameSwitcher.tsx (Select GameId)         │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│            ┌──────────────┴──────────────┐             │
│            ▼                             ▼             │
│     XiangqiBoard.tsx              GomokuBoard.tsx      │
│  ┌──────────────────┐           ┌──────────────────┐   │
│  │  StatusBar.tsx   │           │  StatusBar.tsx   │   │
│  └──────────────────┘           └──────────────────┘   │
│            │                             │             │
│            └──────────────┬──────────────┘             │
│                           ▼                            │
│                   useGameSession.ts                    │
│                           ▼                            │
│                 GameSession (Core)                     │
│                           ▼                            │
│                 GameEngine (Engine)                    │
└────────────────────────────────────────────────────────┘
```

## 2. Component Design & Responsibilities

### 2.1 `useGameSession<State, Move>`
- Creates a `GameSession<State, Move>` using `useMemo`.
- Exposes:
  - `state`: Current state snapshot.
  - `currentPlayer`: Player whose turn it is.
  - `isGameOver`: Boolean.
  - `winner`: Player or null.
  - `isDraw`: Boolean.
  - `legalMoves`: Candidate moves for currently selected or candidate point.
  - `move(m)`: Commits move, catches illegal move errors and populates `error` state.
  - `undo()`: Reverts move and clears errors.
  - `reset()`: Re-initializes session.

### 2.2 `GomokuBoard`
- Renders $15 \times 15$ CSS grid with traditional wooden texture tone (`#e0aa64` / `#f3d6a2`).
- Each cell contains horizontal and vertical grid lines intersecting at center point.
- Stones rendered as rounded 3D gradient discs:
  - Black: `#1f2937` gradient with radial shadow.
  - White: `#f9fafb` gradient with subtle border.
- Hover states preview candidate placement.
- When `isGameOver`, interaction is disabled and victory banner is shown.

### 2.3 `GameSwitcher`
- Reads engines list from `createGameRegistry()`.
- Provides an accessible dropdown to toggle between registered games.
