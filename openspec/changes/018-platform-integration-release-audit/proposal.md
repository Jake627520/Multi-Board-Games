# Change Proposal: 018-platform-integration-release-audit

## 1. Why

經過 Round 001–017 的連續迭代，Multi-Board-Games 平台已具備三大傳統棋種（中國象棋、五子棋、半盤暗棋）、雙人對弈 (PvP)、單人對電腦 (PvE，支援 Level 1 啟發式與 Level 2 Minimax)、通用視角投影 (Generic Player View)、版本化存檔與載入 (Save Manager)、步譜回放系統 (Replay Manager) 與 Phase 1 古典水墨視覺設計。

為了確保平台具備 Release Candidate (RC) 等級的穩定性與發布準備度，必須執行全面的跨模組整合與發布就緒度審計 (Platform Integration & Release Readiness Audit)，徹底驗證：
1. **安全性與非完全資訊邊界**：暗棋的權威全狀態在 UI、公開視角匯出、公開回放與 AI 決策中皆不發生資訊洩漏。
2. **狀態機與邊界隔離**：Save/Load/Replay/Undo/Redo 在各棋種之間的交互作用不破壞遊戲狀態、不引發副作用、不觸發舊 AI 任務殘留。
3. **AI 運算與並行安全**：AI 非同步決策在面對使用者重設、悔棋、切換遊戲或重新載入存檔時，具備嚴格的取消防護 (Cancellation Token) 與 Session 邊界保護。
4. **視角結構獨立性**：`projectView` 回傳的 ViewState 具備結構不可變性，UI 端的操作或變異不可逆向污染遊戲引擎的核心全狀態。
5. **部署與合規審計**：Vite 資源基底路徑 (`base: "./"`)、GitHub Actions CI 工作流程、Playwright E2E 配置、Google Fonts 與第三方套件授權合規性。

## 2. Goal

- 建立完整的跨模組整合矩陣 (Integration Matrix)，覆蓋 3 種棋類 × 11 個關鍵維度。
- 嚴格落實 P0 / P1 / P2 缺陷審計分類與門禁標準。
- 撰寫 5 組高保真整合測試套件（Integration Test Suites）：
  - `tests/integration/banqi-hidden-information.integration.test.ts`
  - `tests/integration/save-load-replay.integration.test.ts`
  - `tests/integration/ai-session-isolation.integration.test.ts`
  - `tests/integration/player-view-boundary.integration.test.ts`
  - `tests/integration/e2e-flows.integration.test.ts`
- 修復審計發現的整合缺陷：
  - P1: `useGameSession` AI `useEffect` 非同步決策缺乏取消防護與重設競爭問題。
  - P1: `XiangqiEngine` 與 `GomokuEngine` 的 `projectView` 回傳原始狀態參照，未做棋盤淺拷貝，存在 UI 變異污染核心狀態風險。
  - P1: `BanqiBoard` 的 `SaveManagerPanel` 未綁定 `disabled={isAiThinking}`。
  - P1: `StatusBar` 的「悔棋」與「重新開始」在 AI 思考期間未實質禁用按鈕。
  - P1: `vite.config.ts` 缺少 `base: "./"`，導致 GitHub Pages 子目錄部署時資源 404。
  - P1: `package.json` 的 `test:e2e` 因缺少 `playwright.config.ts` 導致 Playwright 誤掃 Vitest 單元測試而崩潰。
  - P2: `README.md`、`NOTICE.md`、`docs/THIRD_PARTY_LICENSES.md` 對 Google Fonts 的版權與外聯字型說明精確度校準。
- 達成 Release Gate 所有檢驗項目，輸出完整審計報告。

## 3. Non-Goals

- 重新實作或重寫 Round 001–017 已確立的規則邏輯、遊戲引擎架構與存檔封裝規格。
- 實作線上多人連線、WebRTC 或外部雲端 AI。
- 引進重型外部函式庫。

## 4. Success Metrics

- P0 = 0，P1 = 0，所有發現之缺陷皆遵循 TDD (RED → GREEN) 修正。
- 整合測試套件全數通過，無任何警告、洩漏或狀態污染。
- `npx tsc --noEmit`、`npm run test`、`npm run build` 全綠。
- 產出結構化 Release Gate 報告，達成 `RELEASE READY`。
