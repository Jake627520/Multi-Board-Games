# Design Specification: 018-platform-integration-release-audit

## 1. 跨模組整合矩陣 (Integration Matrix)

| Area | Xiangqi | Gomoku | Banqi | 說明 / 狀態 |
|---|---|---|---|---|
| **PvP** | ✓ | ✓ | ✓ | 支援本地輪流走步、首翻決定執色、棋盤點擊合法落點驗證 |
| **PvE** | ✓ | ✓ | ✓ | 支援人機對弈、先後手選擇、思考中防護 |
| **AI Level 1** | ✓ | ✓ | ✓ | 單層啟發式貪婪走法與探索評估 |
| **AI Level 2** | ✓ | ✓ | ✓ | Minimax + Alpha-Beta 剪枝搜尋，走法預排序 |
| **Player View** | ✓ | ✓ | ✓ | 通用視角隔離；暗棋未翻開子零陣營/兵種資訊洩漏 |
| **Save** | ✓ | ✓ | ✓ | 信賴本機存檔 `GameSaveEnvelope v1`，原子序列化 |
| **Load** | ✓ | ✓ | ✓ | 格式/遊戲ID/版本嚴格校驗，載入後正確覆寫 Session 狀態 |
| **Replay** | ✓ | ✓ | ✓ | 步譜時間軸回放，單步前進/後退/滑桿，回放期無 AI 副作用 |
| **Undo/Redo** | ✓ (Undo) | ✓ (Undo) | ✓ (Undo) | 支援單步撤銷與快照還原；Redo: N/A (本期設計僅提供 Undo) |
| **Session isolation**| ✓ | ✓ | ✓ | 切換遊戲或重設對弈時，各 GameSession 與 AI 運算完全隔離 |
| **Mobile UI** | ✓ | ✓ | ✓ | RWD 棋盤縮放、卡片排版、按鈕觸控目標尺寸適配 |

> 註：本平台目前規格支援 `undo()` 快照機制；`Redo` 為 N/A（現階段規格未包含前進堆疊，不視為缺漏）。

---

## 2. 整合邊界與安全性設計 (Integration Boundaries)

### 2.1 非完全資訊隔離邊界 (Banqi Hidden Information Boundary)
```text
Authoritative Full State (BanqiFullState)
   │
   ├──> projectView(context) ──> BanqiViewState (暗棋格僅有 id: "hidden-r-c", isRevealed: false)
   │                                  ├──> UI 組件渲染 (無 player, type, rank)
   │                                  ├──> exportPublicView()
   │                                  └──> Replay.viewAt() / exportPublicReplay()
   │
   └──> AI Engine (僅計算已翻開棋子價值，不利用未翻開棋子作弊)
```

### 2.2 AI 並行與競態安全 (AI Concurrency & Cancellation Guard)
在 `useGameSession.ts` 中：
- 新增非同步取消防護標記 `cancelled` 與 Timer 清理：
  ```ts
  useEffect(() => {
    if (isReplayMode || !aiPlayer || !aiColor || isGameOver) return;
    if (currentPlayer === aiColor) {
      setIsAiThinking(true);
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const chosenMove = await aiPlayer.selectMove(
            stateRef.current,
            legalMovesRef.current
          );
          if (cancelled) return;
          const notation = formatMove
            ? formatMove(chosenMove, stateRef.current)
            : undefined;
          const nextState = session.move(chosenMove, notation);
          setState(nextState);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "AI 走步失敗");
          }
        } finally {
          if (!cancelled) {
            setIsAiThinking(false);
          }
        }
      }, aiDelayMs);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [...]);
  ```
- 當使用者在 AI 思考期間呼叫 `reset()`、切換遊戲或觸發組件卸載時，`cancelled` 立刻生效，防止已運算完畢的走步寫入重設後或錯誤的 Session。

### 2.3 視角結構獨立性 (Structural Independence)
- `XiangqiEngine.projectView` 與 `GomokuEngine.projectView` 必須回傳棋盤淺拷貝副本：
  ```ts
  projectView: (state) => ({
    ...state,
    board: state.board.map((row) => [...row]),
  })
  ```
- 防止 UI 或測試對 `viewState.board` 的賦值操作直接污染引擎內部之 `state.board`。

### 2.4 E2E 測試與建置隔離
- 建立 `playwright.config.ts`，明確指定 `testDir: "./e2e"` 與 `testMatch: "**/*.spec.ts"`，防止 Playwright 誤掃 `tests/` 下的 Vitest 測試。
- 撰寫 `e2e/flows.spec.ts` 覆蓋 Flow A ~ Flow E 完整端對端流程。
- `vite.config.ts` 設定 `base: "./"`，支援 GitHub Pages 與任何靜態子路徑部署。
