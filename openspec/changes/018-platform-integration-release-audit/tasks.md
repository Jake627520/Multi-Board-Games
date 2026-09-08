# Task Breakdown: 018-platform-integration-release-audit

## Phase A: Read-Only Repository Audit
- [x] Inspect git status, branch, HEAD, remotes
- [x] Search for deprecated patterns (`BanqiFullState`, `maskHiddenState`, `serializeMasked`)
- [x] Audit UI state access (`getState` vs `getView`)
- [x] Audit Save / Load / Replay round-trip architecture
- [x] Audit AI concurrency, cancellation, and timer leaks
- [x] Audit ViewState structural independence
- [x] Audit build, CI, package scripts, and licensing

## Phase B: OpenSpec 018 Creation
- [x] Create `proposal.md`
- [x] Create `design.md`
- [x] Create `tasks.md`
- [x] Create `specs/integration/spec.md`
- [x] Update `openspec/README.md`

## Phase C: Integration Test Design (RED)
- [x] Write `tests/integration/banqi-hidden-information.integration.test.ts`
- [x] Write `tests/integration/save-load-replay.integration.test.ts`
- [x] Write `tests/integration/ai-session-isolation.integration.test.ts`
- [x] Write `tests/integration/player-view-boundary.integration.test.ts`
- [x] Write `tests/integration/e2e-flows.integration.test.ts`

## Phase D: Run Regression Tests & Confirm RED
- [x] Execute new integration tests to observe failures on unpatched edge cases (e.g. viewState mutation, AI cancellation)

## Phase E: Minimal Fixes (GREEN)
- [x] Add cancellation token to `useGameSession` AI effect
- [x] Add board shallow copy to `XiangqiEngine.projectView` and `GomokuEngine.projectView`
- [x] Pass `disabled={isAiThinking}` to `BanqiBoard`'s `SaveManagerPanel`
- [x] Disable Undo and Reset buttons in `StatusBar` when `isAiThinking` is true
- [x] Add `base: "./"` to `vite.config.ts`
- [x] Create `playwright.config.ts` and `e2e/flows.spec.ts`

## Phase F: Full Regression Verification
- [x] Run `npm run test` (all unit + integration tests: 47 files, 192 tests passed)
- [x] Run `npx tsc --noEmit` (0 errors)
- [x] Run `npm run build` (built in 305ms)
- [x] Configure Vitest include filter in `vite.config.ts` to isolate from Playwright

## Phase G: Documentation & License Alignment
- [x] Update `NOTICE.md` and `docs/THIRD_PARTY_LICENSES.md` regarding Google Fonts
- [x] Update `README.md` metrics and architecture description

## Phase H: Round 18.1 Final Release Verification
- [x] Install Playwright Chromium headless browser binaries (`npx playwright install chromium`)
- [x] Add `data-testid="game-switcher-select"` to `GameSwitcher.tsx`
- [x] Execute real Playwright browser E2E test suite (`npm run test:e2e`): 5 passed (Flows A-E)
- [x] Verify production build output assets in `dist/` (relative paths confirmed)
- [x] Verify production deployment accessibility (GitHub Pages 404 unconfigured status documented)
- [x] Commit and push changes to `origin/main`
