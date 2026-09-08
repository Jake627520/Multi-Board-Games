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
- [ ] Write `tests/integration/banqi-hidden-information.integration.test.ts`
- [ ] Write `tests/integration/save-load-replay.integration.test.ts`
- [ ] Write `tests/integration/ai-session-isolation.integration.test.ts`
- [ ] Write `tests/integration/player-view-boundary.integration.test.ts`
- [ ] Write `tests/integration/e2e-flows.integration.test.ts`

## Phase D: Run Regression Tests & Confirm RED
- [ ] Execute new integration tests to observe failures on unpatched edge cases (e.g. viewState mutation, AI cancellation)

## Phase E: Minimal Fixes (GREEN)
- [ ] Add cancellation token to `useGameSession` AI effect
- [ ] Add board shallow copy to `XiangqiEngine.projectView` and `GomokuEngine.projectView`
- [ ] Pass `disabled={isAiThinking}` to `BanqiBoard`'s `SaveManagerPanel`
- [ ] Disable Undo and Reset buttons in `StatusBar` when `isAiThinking` is true
- [ ] Add `base: "./"` to `vite.config.ts`
- [ ] Create `playwright.config.ts` and `e2e/flows.spec.ts`

## Phase F: Full Regression Verification
- [ ] Run `npm run test` (all unit + integration tests)
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run build`
- [ ] Verify `npm run test:e2e`

## Phase G: Documentation & License Alignment
- [ ] Update `NOTICE.md` and `docs/THIRD_PARTY_LICENSES.md` regarding Google Fonts
- [ ] Update `README.md` metrics and architecture description

## Phase H: Release Gate Evaluation & Commit
- [ ] Check Release Gate items
- [ ] Commit changes with clear message
- [ ] Push to `origin/main`
- [ ] Report final commit SHA and Release Status
