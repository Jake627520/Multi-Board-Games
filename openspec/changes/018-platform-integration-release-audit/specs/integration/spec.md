# Specification: Platform Integration & Release Gate

## 1. Scope of Audit

本規格規範 Multi-Board-Games Platform 的跨模組整合準則與發布門禁要求。

### 1.1 涵蓋領域
1. **遊戲引擎合規性**：象棋、五子棋、暗棋之走法合法性、終局判定、將軍/禁手/相剋規則。
2. **資訊安全邊界**：暗棋非完全資訊在記憶體、視角、存檔與回放中皆不外洩。
3. **資料持久化與回放一致性**：SaveManager、ReplayManager、LocalStorage 存檔管理。
4. **AI 整合與並行安全**：思考延遲、走法合法性、取消防護、Session 隔離。
5. **UI 與響應式整合**：古典水墨 Token、狀態列防護、按鈕禁用態。
6. **建置與部屬鏈路**：TypeScript 型別嚴格度、Vite 打包、GitHub Actions CI、Playwright E2E。

## 2. P0 / P1 / P2 缺陷分類定義

- **P0（Release Blocker）**：造成核心遊戲狀態損毀、暗棋未翻開資訊外洩、AI 產生非法走法、回放修改即時對弈、生產環境打包失敗。
- **P1（Release Risk）**：AI 非同步取消競爭條件、視角變異污染引擎、UI 缺少思考禁用保護、靜態資源基底路徑問題、E2E 腳本崩潰。
- **P2（Minor Improvement）**：文檔描述精確度、非破壞性排版微調、微小效能優化。

## 3. Release Gate 檢核清單

```text
[x] P0 = 0
[x] P1 = 0 OR explicitly accepted
[x] Unit tests PASS
[x] Typecheck PASS
[x] Build PASS
[x] E2E PASS (or documented environment constraints)
[x] CI configuration verified
[x] Production deployment verified
[x] Banqi hidden state verified
[x] Save/Load verified
[x] Replay verified
[x] AI verified
[x] Session isolation verified
[x] README verified
[x] License verified
```
只有在上述所有項目皆為 PASS 時，Release Status 方可標記為 `RELEASE READY`。
