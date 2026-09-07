# Tasks: 004 Core Genericity and Xiangqi Advanced Rules

## Phase 1: Core Genericity TDD
- [x] RED: Write failing test in `tests/core/registry.test.ts` for registering arbitrary `GameId` (e.g. `"othello"`) and non-Red/Black players (`"white" | "black"`).
- [x] GREEN: Update `src/core/game/types.ts` to generalize `Player` and `GameId` to `string`.
- [x] REFACTOR: Verify existing core and session tests pass.

## Phase 2: Xiangqi Repetition & Perpetual Check TDD
- [x] RED: Create `tests/xiangqi/perpetual-check.test.ts` testing:
  - Single-sided perpetual check results in forfeiture (loss for checking player).
  - Normal peaceful repetition leads to draw on 3rd occurrence.
  - 120 non-capture moves triggers sixty-move draw.
- [x] GREEN: Implement `boardSignature`, `positionHistory`, `checkHistory`, and `nonCaptureCount` in `src/games/xiangqi/rules.ts` and `types.ts`.
- [x] REFACTOR: Ensure `isGameOver` and `getWinner` accurately reflect draw vs win.

## Phase 3: Verification
- [x] Run full vitest suite (52+ tests).
- [x] Run TypeScript type checking.
- [x] Run production build.
