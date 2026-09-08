# Change Proposal: 013-gomoku-enhancement

## 1. Why

The Gomoku implementation currently operates under basic $15 \times 15$ free-style rules with a simple 1-ply greedy heuristic AI (`GomokuAiLevel1`).
To enhance competitive depth, playability, and visual engagement while preserving zero-binary-asset and strict three-layer decoupled architecture:
1. **Rule Balance**: Free-style Gomoku heavily favors the first player (Black). Competitive Gomoku introduces forbidden move constraints for Black (double-three, double-four, and overline) to restore game balance.
2. **Visual Feedback**: Players need unambiguous visual confirmation of victory through glowing line highlights for the 5 winning stones.
3. **AI Depth**: A 1-ply heuristic cannot anticipate multi-step tactical threats (such as double open threes or four-threes). A Level 2 Minimax AI with Alpha-Beta pruning and candidate neighbor pruning provides an engaging single-player experience without lagging the browser thread.

## 2. Goal

- Introduce configurable `GomokuRuleMode` (`"freestyle"` | `"forbidden_moves"`).
- Implement Black foul detection in `src/games/gomoku/rules.ts`:
  - Overline (長連, $\ge 6$)
  - Double Open Three (三三禁手)
  - Double Four (四四禁手)
  - Five-in-a-row precedence (五連成五優先勝，不受禁手約束)
  - White freedom (白方不受任何禁手限制，長連亦算勝)
- Provide exact winning 5-stone coordinates via `winningLine` on `GomokuState` and highlight winning stones with pure CSS pulse animations in UI.
- Implement `GomokuAiLevel2` using Minimax search, Alpha-Beta pruning, and neighbor pruning (radius $\le 2$).
- Provide interactive rule mode and AI level selectors in `GomokuBoard.tsx`.

## 3. Non-Goals

- Using trademarked names such as "Renju".
- Multi-game rule pollution (Xiangqi and Banqi remain completely untouched).
- Web Worker multithreading (Minimax search is bounded to depth 2 with neighbor pruning, executing in $< 100$ms).
- External image/sound assets.
