# Change 007: AI Framework (007-ai-framework)

## 1. Problem Statement
The platform currently supports two fully implemented games (Xiangqi and Gomoku) playable in local Hot-seat PvP mode (two human players sharing the same device). However, a solo player cannot play against a computer opponent. To make the platform enjoyable for individual players without introducing heavy server infrastructure, a client-side, decoupled AI framework is needed.

## 2. Proposed Change
1. **Core AI Contract (`src/core/ai/types.ts`)**:
   - Define minimal, generic interface `AiPlayer<State, Move>` requiring only `id`, `name`, and `selectMove(state, legalMoves): Promise<Move>`.
   - Re-export in `src/core/game/types.ts` for developer ergonomics.
2. **Gomoku Level 1 AI (`src/games/gomoku/ai.ts`)**:
   - Heuristic evaluation: immediate 5-in-a-row win, blocking opponent's open 4 or 4-in-a-row, extending 3-in-a-row, blocking opponent's 3-in-a-row, center-proximity weighting.
3. **Xiangqi Level 1 AI (`src/games/xiangqi/ai.ts`)**:
   - Material valuation (General 10000, Chariot 900, Cannon 450, Horse 400, Elephant/Advisor 200, Soldier 100/200), resolving check, safe captures, retreating threatened pieces, positional bonuses.
4. **UI Game Mode Integration**:
   - Create `src/ui/components/GameModeSelector.tsx` for PvP vs PvE selection and side selection (Red/Black or Black/White).
   - Update `useGameSession` with AI move auto-dispatch and 300–500ms natural delay.
   - UI fallbacks ensure illegal moves returned by AI are safely handled.

## 3. Non-Goals
- No external server or remote LLM API calls.
- No heavy WebAssembly chess engine blobs.
- No disruption to existing `GameEngine` and `GameSession` rule invariants.
- No network multiplayer.

## 4. Acceptance Criteria
- `AiPlayer<State, Move>` interface resides in Core layer.
- Gomoku Level 1 AI picks winning moves and blocks immediate threats.
- Xiangqi Level 1 AI picks legal moves, resolves checks, and performs greedy material captures.
- UI supports switching between PvP and PvE with player side selection.
- All existing 75 tests pass without regressions; all new AI and UI tests pass.
