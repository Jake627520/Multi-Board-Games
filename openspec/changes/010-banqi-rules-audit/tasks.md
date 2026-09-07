# Tasks for 010-banqi-rules-audit

- [x] 1. Audit Test Suite Formulation (TDD)
  - [x] 1.1 Create `tests/banqi/audit.test.ts` with 14 comprehensive audit checkpoints.
  - [x] 1.2 Confirm test failure on `maskHiddenState` (RED).
- [x] 2. Hidden State Masking & Serialization Implementation
  - [x] 2.1 Implement `maskHiddenState(state: BanqiState): BanqiState` in `src/games/banqi/rules.ts`.
  - [x] 2.2 Add `serializeMasked(state: BanqiState): string` in `src/games/banqi/engine.ts`.
  - [x] 2.3 Verify `tests/banqi/audit.test.ts` passes (GREEN).
- [x] 3. Verification & Regressions
  - [x] 3.1 Run full Vitest suite (31 files, 116 tests passed, 0 regressions).
  - [x] 3.2 Run TypeScript type check (`tsc --noEmit` - 0 errors).
  - [x] 3.3 Run production build (`vite build` - 305ms).
  - [x] 3.4 Update `openspec/README.md`.
