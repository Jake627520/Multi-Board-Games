# Design Document: 017-banqi-ai-level2

## 1. Search Architecture & Evaluation

```text
BanqiAiLevel2.selectMove(state, legalMoves)
  │
  ├── 1. Move Ordering (orderMoves):
  │     Capture moves (highest victim value) > Normal moves > Flip moves
  │
  └── 2. Minimax with Alpha-Beta (depth = 2):
        ├── Root (Maximizing for rootPlayer)
        │     └── Child (Minimizing for opponent)
        │           └── Leaf Evaluation (evaluateState)
        │                 ├── Material evaluation (General: 900, Chariot: 500, Cannon: 450,
        │                 │                        Advisor: 400, Elephant: 350, Horse: 350,
        │                 │                        Soldier: 120)
        │                 └── Terminal check: ±100,000 via state.winner
```

## 2. Incomplete Information & Authority Model

| Layer | Authority & Visibility |
|---|---|
| Engine & Full State | `BanqiFullState` maintains all hidden piece positions and types. |
| Local AI Player | Receives authoritative full state from `session.getState()`, enabling fast determinism during search without Monte Carlo sampling overhead. |
| UI & Player View | Strictly renders `projectView(state)`, projecting face-down pieces as `{ id, isRevealed: false }` with zero rank or player leaks in DOM / network. |

## 3. First-Flip Color Determination & Turn Synchronization

1. **Before First Flip**:
   - `player1Color` is `null`.
   - If Human selected "先手 (玩家先翻)", Human is Player 1 (`aiColor` = `"black"`).
   - If Human selected "後手 (電腦先翻)", AI is Player 1 (`aiColor` = `"red"`).
2. **After First Flip**:
   - `player1Color` is established based on the revealed piece's player.
   - `establishedP1Color` synchronizes with `viewState.player1Color`.
   - `aiColor` dynamically maps to the opponent color if Human is Player 1, or Player 1's color if AI started first.
   - All turns alternate correctly according to traditional Banqi rules.
