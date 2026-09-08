# Design Document: 013-gomoku-enhancement

## Architectural Approach

This enhancement builds directly upon the existing three-layer decoupled architecture:
1. **Core / Game Engine Layer (`src/games/gomoku/`)**:
   - `types.ts`: Adds `GomokuRuleMode = "freestyle" | "forbidden_moves"` and `winningLine?: ReadonlyArray<Position>`.
   - `board.ts`: Adds parameter `ruleMode: GomokuRuleMode = "freestyle"` to `createInitialState`.
   - `rules.ts`: Implements `findWinningLine` for exact 5-stone coordinate extraction. Implements foul detection for Black (`isForbiddenMove`):
     - Overline (長連, $\ge 6$ stones)
     - Double open three (雙活三)
     - Double four (雙四)
     - Precedence: Five-in-a-row (成五) takes priority over forbidden moves.
     - White is exempt from all forbidden move rules.
     - In `getLegalMoves`, forbidden moves are pruned for Black under `forbidden_moves` mode.
     - In `applyMove`, attempting a forbidden move throws an error.
   - `ai.ts`: Implements `GomokuAiLevel2` using:
     - Candidate neighbor pruning (radius $\le 2$ of placed stones) to limit search branches.
     - Minimax search with Alpha-Beta pruning (depth 2).
     - Heuristic evaluation favoring 5-in-a-row, open fours, and open threes.
   - `engine.ts`: `createGomokuEngine(ruleMode = "freestyle")` injects `ruleMode`.

2. **UI Layer (`src/ui/components/GomokuBoard.tsx`)**:
   - Selector for Rule Mode: "自由規則 (Freestyle)" vs "禁手規則 (Forbidden Moves)".
   - Selector for AI Difficulty: "等級 1 (啟發式)" vs "等級 2 (Minimax)".
   - Visual highlighting of winning stones via `.stone.winning` and pure CSS animations (`@keyframes winPulse`).

3. **OpenSpec & Zero-Asset Compliance**:
   - Strictly generic terminology: avoid trademarked terms like "Renju".
   - Zero binary assets: purely CSS rendering and Unicode fonts.
