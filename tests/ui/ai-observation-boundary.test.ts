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
      const engine = useMemo(() => createBanqiEngine(), []);
      api = useGameSession<BanqiState, BanqiMove, BanqiViewState>(engine, {
        aiPlayer: spy,
        aiColor: "black", // 首翻前的佔位：人類（紅）先翻，AI 接著走
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
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

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
