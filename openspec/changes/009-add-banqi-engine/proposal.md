# Change 009: Add Banqi Game Engine (009-add-banqi-engine)

## 1. Problem Statement
The platform currently supports two perfect-information abstract board games (Xiangqi and Gomoku). To validate the platform's multi-game abstraction against hidden information (face-down pieces), stochastic board setup (shuffled tokens), and heterogeneous action types (flip vs orthogonal move vs cannon jump capture), a 3rd game engine—**Banqi (半盤暗棋)**—is introduced.

## 2. Proposed Change
1. **Banqi Game Engine (`src/games/banqi/`)**:
   - $4 \times 8 = 32$ squares grid initialized with all 32 Xiangqi pieces face-down in random order.
   - Dual action type:
     - `flip`: turn an unrevealed piece face-up at `{ row, col }`.
     - `move`: move a face-up piece from `{ from }` to `{ to }` (adjacent orthogonal step or cannon jump).
   - **Color Determination**: First player to flip a piece establishes their side (e.g. flipping a red piece assigns Red to Player 1 and Black to Player 2).
   - **Capture Rules**:
     - Hierarchy: 將/帥 (7) > 士/仕 (6) > 象/相 (5) > 車/俥 (4) > 馬/傌 (3) > 炮/包 (2) > 卒/兵 (1).
     - Exception: 卒/兵 (1) can capture 將/帥 (7); 將/帥 (7) CANNOT capture 卒/兵 (1).
     - Same ranks can capture each other.
     - Cannon (炮/包): moves 1 orthogonal square into an empty space (cannot capture this way). Captures by jumping over exactly 1 screen piece (face-up or face-down, friend or foe) onto an enemy face-up piece of any rank.
     - Non-cannon pieces can only capture adjacent orthogonal enemy face-up pieces of equal or lower rank.
     - Unrevealed (face-down) pieces cannot be captured.
   - **Victory Condition**:
     - A player wins when all 16 pieces of the opponent have been eliminated from the board, OR when the opponent has no legal moves remaining.
2. **Platform Registry**:
   - Register `banqi` in `src/games/registry.ts`.
3. **UI Layer (`src/ui/components/BanqiBoard.tsx`, `src/App.tsx`, `src/styles.css`)**:
   - Render $4 \times 8$ board with face-down tokens, face-up piece badges, selection outlines, and legal target highlights.
   - GameSwitcher dynamically switches between Xiangqi, Gomoku, and Banqi.

## 3. Non-Goals
- No Banqi AI in this round (rules and stochastic state are verified first).
- No notation converter for Banqi in this round.
- No network multiplayer.

## 4. Acceptance Criteria
- $4 \times 8$ board setup initializes with 32 shuffled, face-down pieces.
- First flip assigns color to the active player.
- Movement, orthogonal captures, rank hierarchy, pawn-king exception, and cannon jumps behave strictly according to traditional rules.
- Face-down pieces cannot be captured.
- Game ends when one player's pieces are completely wiped out or has no legal moves.
- All unit, integration, and platform tests pass with zero regressions.
