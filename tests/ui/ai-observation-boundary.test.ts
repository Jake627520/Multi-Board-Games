/**
 * useGameSession 餵給 AI 的資料來源：必須是 engine.projectView 投影後的 view，
 * 不是權威完整狀態。暗棋的完整狀態含每顆蓋著的子的真實身分。
 */
import { describe, expect, it } from "vitest";
import { act, createElement, useMemo } from "react";
import { createRoot } from "react-dom/client";
import type { AiPlayer } from "../../src/core/ai/types";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import type { BanqiMove, BanqiState, BanqiViewState } from "../../src/games/banqi/types";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel1 } from "../../src/games/xiangqi/ai";
import type { XiangqiMove, XiangqiState } from "../../src/games/xiangqi/types";
import { useGameSession } from "../../src/ui/hooks/useGameSession";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AI 決策邊界：hook 傳給 AI 的是投影後的 view", () => {
  it("暗棋：AI 收到的蓋著的棋子沒有 player / type / rank", async () => {
    const received: BanqiViewState[] = [];
    const spy: AiPlayer<BanqiViewState, BanqiMove> = {
      id: "spy",
      name: "spy",
      async selectMove(view, legalMoves) {
        received.push(view);
        return legalMoves[0];
      },
    };

    let api!: ReturnType<typeof useGameSession<BanqiState, BanqiMove, BanqiViewState>>;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      // 暗棋每次 createInitialState 都重新洗牌，而首翻翻出的顏色決定誰先走。
      // 不固定種子的話，約一半的情況下輪不到 AI，received 會是空的 —— 實測
      // 連跑 8 次是 4 綠 4 紅。種子固定後翻出的是黑子，AI（紅）必然接著走。
      const engine = useMemo(() => {
        const realRandom = Math.random;
        let seed = 0x2f6e2b1 >>> 0;
        Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        try {
          return createBanqiEngine();
        } finally {
          Math.random = realRandom;
        }
      }, []);
      api = useGameSession<BanqiState, BanqiMove, BanqiViewState>(engine, {
        aiPlayer: spy,
        aiColor: "red", // 固定種子下首翻翻出黑子 → 紅方（AI）接著走
        aiDelayMs: 10,
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });
    await act(async () => {
      api.move({ type: "flip", pos: { row: 0, col: 0 } });
    });
    // 輪詢而非賭單一時間點：AI 由 setTimeout(aiDelayMs) 觸發，固定等待時間
    // 在機器忙碌時仍可能太短。
    for (let i = 0; i < 50 && received.length === 0; i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }

    expect(received.length).toBeGreaterThanOrEqual(1);
    for (const view of received) {
      const hidden = view.board.flat().filter((p) => p && !p.isRevealed);
      expect(hidden.length).toBeGreaterThan(0);
      for (const p of hidden) {
        expect(Object.keys(p as object).sort()).toEqual(["id", "isRevealed"]);
      }
      // 序列化後也不得含任何蓋著的子的身分關鍵字（只有已翻開的那顆可以有）
      const json = JSON.stringify(view);
      const revealedCount = view.board.flat().filter((p) => p && p.isRevealed).length;
      expect((json.match(/"rank"/g) ?? []).length).toBe(revealedCount);
    }

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("象棋（完全資訊）：view 與權威狀態等價，AI 行為不受影響", async () => {
    const received: XiangqiState[] = [];
    const inner = createXiangqiAiLevel1({ seed: 1 });
    const spy: AiPlayer<XiangqiState, XiangqiMove> = {
      id: "spy",
      name: "spy",
      async selectMove(view, legalMoves) {
        received.push(view);
        return inner.selectMove(view, legalMoves);
      },
    };

    let api!: ReturnType<typeof useGameSession<XiangqiState, XiangqiMove>>;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const engine = useMemo(() => createXiangqiEngine(), []);
      api = useGameSession<XiangqiState, XiangqiMove>(engine, {
        aiPlayer: spy,
        aiColor: "black",
        aiDelayMs: 10,
      });
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });
    await act(async () => {
      api.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(received).toHaveLength(1);
    // AI 看到的是人類走完中炮之後的盤面
    expect(received[0].board[7][4]?.type).toBe("cannon");
    expect(received[0].board[7][1]).toBeNull();
    expect(received[0].currentPlayer).toBe("black");
    expect(api.history).toHaveLength(2);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
