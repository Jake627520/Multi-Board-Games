# Change Proposal: 014-replay-ui-and-save-manager

## 1. Why

Round 12（`012-save-load-replay`）已在核心層完成：
- 版本化 `GameSaveEnvelope` / `GameReplayEnvelope`
- `SaveManager` 與 `ReplayManager`（含嚴格校驗、原子回滾、Banqi 視角脫敏）
- `useGameSession` 對 save / load / replay 的底層封裝

然而目前 **UI 層幾乎沒有對應的使用者介面**，導致：
1. 玩家無法方便地瀏覽、載入本機存檔。
2. 回放功能僅停留在底層 API，缺少前後步、跳轉、播放控制等可感知體驗。
3. 存檔與回放能力無法被一般使用者發現與使用，降低平台完整度。

在不引入雲端、不破壞三層解耦、不新增外部素材的前提下，補齊可視化 Replay 與存檔管理介面，是讓既有基礎建設真正產生價值的必要一步。

## 2. Goal

- 提供完整的 **Replay 控制面板**（適用於所有已註冊遊戲）：
  - 逐步前進 / 後退
  - 跳至任意步數（slider 或輸入）
  - 自動播放 / 暫停（可調 3 檔速度：慢 1200ms / 正常 800ms / 快 400ms）
  - 顯示目前步數 / 總步數與對應記譜
- 提供本機 **存檔列表管理 UI**：
  - 列出目前瀏覽器本機所有存檔（含遊戲種類、時間戳、步數摘要）
  - 一鍵載入、刪除、重新命名
  - 儲存目前對局為新存檔（支援自訂名稱）
- 嚴格遵守既有 Serialization Policy：
  - Trusted Local Save 可保留完整私有狀態
  - Public Replay / Export 必須經過 `projectView`，確保 Banqi 未翻開棋子不洩漏
- 所有操作透過現有 `useGameSession` / `SaveManager` / `ReplayManager` 完成，UI 層不直接操作引擎狀態。
- 維持零外部二進位素材、純 CSS / Unicode 渲染。
- 以 TDD 方式補齊對應單元測試與基本整合測試。

## 3. Non-Goals

- 雲端同步、帳號系統、遠端分享連結。
- 多裝置即時對戰或 WebSocket 網路協定。
- 新增任何新棋種或修改現有棋類規則（Xiangqi / Gomoku / Banqi 規則層完全不動）。
- 引入外部 UI 元件庫、圖示庫、音效或字型檔。
- 複雜的時間旅行除錯工具（僅提供一般玩家可用的回放體驗）。
- 修改存檔格式版本（繼續使用既有 Envelope v1）。

## 4. Success Metrics

- 使用者可在不開啟 DevTools 的情況下，完整進行「存檔 → 載入 → 回放」流程。
- Replay 面板在三大棋類皆可正常運作，且 Banqi 回放過程中未翻開棋子保持隱藏。
- 所有既有測試持續全綠，並新增針對 Replay UI 與存檔列表的測試。
- 建置與型別檢查（`tsc --noEmit`、`vite build`）無錯誤。
- OpenSpec 文件（proposal / design / tasks）齊備並登錄於 `openspec/README.md`。
