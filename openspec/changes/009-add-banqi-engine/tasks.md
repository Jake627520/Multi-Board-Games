# Tasks for 009-add-banqi-engine

- [x] 1. Banqi Engine Types & Board (TDD)
  - [x] 1.1 Create `src/games/banqi/types.ts`.
  - [x] 1.2 Create `src/games/banqi/board.ts` with 4x8 utilities and piece generator.
  - [x] 1.3 Write `tests/banqi/board.test.ts` to verify 32 piece distributions.
- [x] 2. Banqi Rules & Engine (TDD)
  - [x] 2.1 Write `tests/banqi/rules.test.ts` (captures, hierarchy, cannon jump, face-down safety).
  - [x] 2.2 Implement `src/games/banqi/rules.ts` and `src/games/banqi/engine.ts`.
  - [x] 2.3 Verify rules and engine pass all tests.
- [x] 3. Platform Integration & UI
  - [x] 3.1 Register Banqi engine in `src/games/registry.ts`.
  - [x] 3.2 Create `src/ui/components/BanqiBoard.tsx`.
  - [x] 3.3 Add Banqi styles in `src/styles.css`.
  - [x] 3.4 Wire up in `src/App.tsx`.
- [x] 4. Verification & Documentation
  - [x] 4.1 Run full vitest suite (30 files, 106 tests passed, 0 regressions).
  - [x] 4.2 Typecheck with `tsc --noEmit` (0 errors).
  - [x] 4.3 Verify production build with `vite build` (323ms).
  - [x] 4.4 Update `openspec/README.md`.
