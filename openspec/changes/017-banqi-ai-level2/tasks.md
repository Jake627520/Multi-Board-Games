# Tasks: 017-banqi-ai-level2

- [x] 1. Core Banqi AI Implementation
  - [x] 1.1 Implement `BanqiAiLevel1` with single-ply heuristic (captures, safe moves, flips).
  - [x] 1.2 Implement `BanqiAiLevel2` with 2-ply Minimax, Alpha-Beta pruning, and move ordering.
  - [x] 1.3 Export `createBanqiAiLevel1` and `createBanqiAiLevel2` in `src/games/banqi/index.ts`.
- [x] 2. Automated Tests (TDD)
  - [x] 2.1 Create `tests/banqi/ai-level2.test.ts` (metadata, legal moves, immediate capture, self-preservation, latency budget).
  - [x] 2.2 Add Banqi PvE scenario to `tests/ui/pve-session.test.ts`.
- [x] 3. UI Integration & Verification
  - [x] 3.1 Update `src/ui/components/BanqiBoard.tsx` with `GameModeSelector` and AI difficulty tabs (Level 1 / Level 2).
  - [x] 3.2 Implement first-flip color determination synchronization in BanqiBoard.
  - [x] 3.3 Update `package.json` to version 0.6.0.
  - [x] 3.4 Update `README.md` test metrics (42 files / 174 tests) and feature descriptions.
  - [x] 3.5 Register change in `openspec/README.md`.
  - [x] 3.6 Full validation (vitest, tsc, build) and git push.
