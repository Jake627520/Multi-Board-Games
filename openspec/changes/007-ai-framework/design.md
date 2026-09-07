# Design 007: AI Framework Architecture

## 1. System Context & Layer Boundaries

```text
┌────────────────────────────────────────────────────────┐
│                       UI Layer                         │
│ src/ui/                                                │
│ - GameModeSelector (PvP vs PvE, human side toggle)     │
│ - useGameSession (AI turn scheduler, 300-500ms delay)  │
└──────────────┬──────────────────────────┬──────────────┘
               │ Human Move               │ AI Move
               ▼                          ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│        Game Session        │ │      AiPlayer           │
│ src/core/game/session.ts   │ │ src/games/<game>/ai.ts  │
│ history / undo / validate  │ │ implements AiPlayer     │
└──────────────┬─────────────┘ └──────────┬──────────────┘
               │                          │ queries legal moves
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│                      Game Engine                       │
│ src/games/<game>/                                      │
│ rules / state / legal moves                            │
└────────────────────────────────────────────────────────┘
```

## 2. Core Abstractions (`src/core/ai/types.ts`)

```typescript
export interface AiPlayer<State, Move> {
  readonly id: string;
  readonly name: string;
  selectMove(state: State, legalMoves: Move[]): Promise<Move>;
}
```

- **Clean and Minimal**: Takes current `state` and the array of precomputed `legalMoves`.
- **Async Execution**: Returns a `Promise<Move>`, enabling synchronous heuristics, Web Workers, or asynchronous timeouts without interface alteration.
- **Robustness**: If `legalMoves` is empty or invalid, the AI returns a sensible rejection; the caller falls back gracefully.

## 3. Gomoku Level 1 AI Strategy (`src/games/gomoku/ai.ts`)

For each candidate move in `legalMoves`:
1. **Winning Move (Score: 100,000)**: Placing stone yields $\ge 5$ in-a-row.
2. **Defensive Block (Score: 50,000)**: If opponent would immediately win at this cell on their next turn.
3. **Open 4 / Four-in-a-row Creation (Score: 10,000)**: Placing stone forms an open 4 or 4-in-a-row.
4. **Block Opponent 3 / Open 3 (Score: 5,000)**: Blocking opponent from completing an open 4.
5. **Open 3 Creation (Score: 1,000)**: Creating active offensive line of 3 stones.
6. **Positional Center Proximity (Score: 0–100)**: Preference for cells closer to $(7, 7)$.

Deterministic tie-breaker: index order of legal moves.

## 4. Xiangqi Level 1 AI Strategy (`src/games/xiangqi/ai.ts`)

1. **Material Values**:
   - `general`: 10,000
   - `chariot`: 900
   - `cannon`: 450
   - `horse`: 400
   - `elephant`: 200
   - `advisor`: 200
   - `soldier`: 100 (crossed river: 200)
2. **Move Evaluation**:
   - **Capture Value**: Difference between captured piece value and risk.
   - **Check Bonus**: $+50$ if move places opponent in check.
   - **Hanging Piece Evasion**: Moving an under-attack piece to safety.
   - **Advancement Bonus**: $+5$ to $+10$ for advancing pawns or activating knights/chariots.

## 5. UI Integration & Ergonomics

- `useGameSession`:
  - Accepts `aiPlayer?: AiPlayer<State, Move>`, `aiColor?: Player`, and `isAiThinking: boolean`.
  - When `currentPlayer === aiColor` and game is not over, schedules AI move calculation after a delay of $400$ms.
  - While AI is calculating, input events on the board are ignored.
