# Change Proposal: 017-banqi-ai-level2

## 1. Why

象棋與五子棋皆已具備 Level 1 / Level 2 AI，暗棋仍僅支援本地雙人，單機 PvE 模式缺失。
暗棋為不完全資訊遊戲，適合驗證：在權威全狀態供本地 AI 使用的同時，UI 仍嚴格經 `projectView` 脫敏，確保非翻開棋子零資訊洩漏。

在不改動規則層、不引入外部引擎或 Worker 的前提下，補上 Level 1（啟發式）與 Level 2（Minimax + Alpha-Beta），達成三大棋種全數具備雙難度單機對弈支援。

## 2. Goal

- 新增 `src/games/banqi/ai.ts`：
  - `BanqiAiLevel1`：單層啟發式（吃子優先、避免白送、適度翻子）
  - `BanqiAiLevel2`：2-ply Minimax + Alpha-Beta 剪枝 + 走法排序（吃子 > 移動 > 翻子）
  - 工廠函數：`createBanqiAiLevel1()`、`createBanqiAiLevel2()`
- `BanqiBoard` 整合：
  - 支援 PvP / PvE 切換
  - 支援先手 / 後手（首翻決定執色）
  - 支援 AI 難度切換（Level 1 啟發式 / Level 2 Minimax）
  - 電腦思考中禁點與狀態提示
- 單元與整合測試：
  - 必吃目標：主動吃掉相鄰敵方高階棋子
  - 避險自保：2-ply 視野下避免走入對方卒/兵等相剋威脅範圍
  - 合法性：開局與中盤保證回傳走法皆屬 `getLegalMoves`
  - 延遲預算：開局 32 步翻子搜索在 500ms 內完成（實測 < 20ms）
- 規則層（`rules.ts`）零變更；不破壞既有 Player View 與 Replay 脫敏

## 3. Non-Goals

- 對隱藏棋做蒙地卡羅樹搜尋 (MCTS) 或信念狀態 (Belief State) 採樣
- Web Worker / 多執行緒
- 修改吃子階級、炮跳吃、首翻定色等既有規則
- 線上多人或雲端 AI 引擎

## 4. Success Metrics

- Level 2 在「可立即吃子」時選擇吃子
- Level 2 在 2-ply 預判下避免步入敵子射程
- 回傳走法必屬於 `getLegalMoves`
- 開中盤單次決策通常 < 50ms（預算 < 500ms）
- 全專案 42 個測試檔案、174 個測試全綠；`tsc` 與 `vite build` 通過
- OpenSpec 017 文件齊備並登錄
