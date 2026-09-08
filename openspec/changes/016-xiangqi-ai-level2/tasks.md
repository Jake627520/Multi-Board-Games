# Tasks: 016-xiangqi-ai-level2

- [x] 1. Core AI Implementation
  - [x] 1.1 Implement `XiangqiAiLevel2` in `src/games/xiangqi/ai.ts` with Alpha-Beta pruning, move ordering, and material/terminal evaluation.
  - [x] 1.2 Export `createXiangqiAiLevel2` factory function.
- [x] 2. Automated Tests (TDD)
  - [x] 2.1 Create `tests/xiangqi/ai-level2.test.ts`.
  - [x] 2.2 Verify immediate mate execution, threat blocking, legal move constraint, and latency limits.
- [x] 3. UI Integration & Verification
  - [x] 3.1 Update `src/ui/XiangqiBoard.tsx` with AI difficulty selector (等級 1 vs 等級 2).
  - [x] 3.2 Update `README.md` and `package.json` metrics.
  - [x] 3.3 Register change in `openspec/README.md`.
  - [x] 3.4 Full validation (vitest, tsc, build) and git push.
