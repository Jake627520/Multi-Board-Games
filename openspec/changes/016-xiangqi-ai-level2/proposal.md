# Change Proposal: 016-xiangqi-ai-level2

## 1. Why

五子棋已具備 Level 2（Minimax + Alpha-Beta + 鄰近剪枝），象棋仍只有 Level 1 單層貪婪啟發式，單機對弈深度明顯不足。

在不改動規則層、不引入 Worker / 外部引擎的前提下，補上與五子棋對等的 Level 2 AI，可讓三大棋類的 PvE 體驗一致，並延續既有 TDD / OpenSpec 紀律。

## 2. Goal

- 實作 `XiangqiAiLevel2`：
  - 2-ply Minimax + Alpha-Beta 剪枝演算法
  - 走法排序（吃子優先、將軍優先）以提升剪枝效率
  - 靜態評估：子力價值 + 過河兵加成 + 將軍獎懲 + 終局判定
- 保留既有 `XiangqiAiLevel1`，UI 提供「等級 1 / 等級 2」切換
- 純前端、目標單次落子通常 < 200ms（中盤合法走法規模下）
- 新增單元測試：必勝一步（立即將死）、必擋一步（解殺防禦）、只回傳合法走法、基本耗時上限
- 規則層（`rules.ts`）零變更；存檔格式零變更

## 3. Non-Goals

- 開局庫、殘局庫、Zobrist 哈希、迭代加深（Iterative Deepening）。
- Web Worker / 多執行緒。
- 修改將軍、困斃、長將、三次重複、六十著等既有規則。
- 引入 Stockfish / Pikafish 等外部重型引擎。

## 4. Success Metrics

- Level 2 在「可立即將死」局面選擇殺著。
- Level 2 在「對方下一步可將死」局面選擇解殺或阻擋。
- 全專案測試持續全綠；`tsc` 與 `vite build` 通過。
- OpenSpec 016 文件齊備並登錄。
