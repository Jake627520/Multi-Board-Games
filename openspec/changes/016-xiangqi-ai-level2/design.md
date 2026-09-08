# Design Document: 016-xiangqi-ai-level2

## Search Architecture

```text
XiangqiAiLevel2.selectMove(state, legalMoves)
  │
  ├── 1. Move Ordering (orderMoves):
  │     Capture moves (highest victim value) > Checking moves > Quiet moves
  │
  └── 2. Minimax with Alpha-Beta (depth = 2):
        ├── Root (Maximizing for rootPlayer)
        │     └── Child (Minimizing for opponent)
        │           └── Leaf Evaluation (evaluateState)
        │                 ├── Material evaluation (General: 10000, Chariot: 900, Cannon: 450,
        │                 │                        Horse: 400, Elephant: 200, Advisor: 200,
        │                 │                        Soldier: 100 + crossed river 100)
        │                 ├── In-Check penalty / bonus (+80 for check, -90 if checked)
        │                 └── Terminal checkmate / stalemate: ±100,000 via getWinner(state)
```

## Performance & Latency Considerations

1. **Move Ordering Pruning Efficiency**:
   Sorting high-value captures and checks first ensures Alpha-Beta cuts off the vast majority of suboptimal branches early, keeping depth-2 searches under 150ms on modern browsers.
2. **UI Integration**:
   `XiangqiBoard.tsx` exposes difficulty toggle (等級 1 vs 等級 2), mirroring the `GomokuBoard` design and reusing the `.side-btn` styling without CSS bloat.
