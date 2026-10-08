import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";
import { banqiMoveCells, gomokuMoveCells, xiangqiMoveCells } from "../../src/ui/move-cells";
import { clickCell, replayButton } from "./board-persistence-helpers";
import { mulberry32 } from "./autosave-helpers";

/**
 * 「上一步標記」：棋盤上被標 .last-move 的格子必須等於「當前有效步」牽涉的格子，
 * 走下一步後移走、復盤時跟著復盤步數走（不是整局最後一步）。
 * 以 aria-label 前綴 `${row}-${col}` 回報，與 board-persistence-helpers.getCell 同一套定位。
 */
function markedCells(): string[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button.last-move"))
    .map((b) => (b.getAttribute("aria-label") ?? "").split(" ")[0])
    .sort();
}

function enterReplayAndStepTo(step: number): void {
  fireEvent.click(replayButton());
  for (let i = 0; i < step; i++) fireEvent.click(screen.getByTestId("replay-next"));
  expect(screen.getByTestId("replay-step-label").textContent).toContain(`${step} /`);
}

describe("上一步標記（last-move）", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // 暗棋洗牌用 Math.random：固定種子，棋盤配置才可重現
    vi.spyOn(Math, "random").mockImplementation(mulberry32(20261008));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  describe("象棋", () => {
    it("走一步標起訖兩格；再走一步標記移到新的起訖，舊格不再有", () => {
      render(createElement(XiangqiBoard));
      expect(markedCells()).toEqual([]);

      clickCell(6, 0); // 紅兵選取：此時不該有任何標記
      expect(markedCells()).toEqual([]);
      clickCell(5, 0);
      expect(markedCells()).toEqual(["5-0", "6-0"]);

      clickCell(3, 8);
      clickCell(4, 8);
      expect(markedCells()).toEqual(["3-8", "4-8"]);
    });

    it("復盤停在第 N 步，標的是第 N 步而不是整局最後一步", () => {
      render(createElement(XiangqiBoard));
      clickCell(6, 0); clickCell(5, 0); // 1
      clickCell(3, 8); clickCell(4, 8); // 2
      clickCell(6, 2); clickCell(5, 2); // 3
      expect(markedCells()).toEqual(["5-2", "6-2"]);

      enterReplayAndStepTo(0);
      expect(markedCells()).toEqual([]);
      fireEvent.click(screen.getByTestId("replay-next"));
      expect(markedCells()).toEqual(["5-0", "6-0"]);
      fireEvent.click(screen.getByTestId("replay-next"));
      expect(markedCells()).toEqual(["3-8", "4-8"]);
    });
  });

  describe("五子棋", () => {
    it("落子標該格；再落一子標記移過去，舊格不再有", () => {
      render(createElement(GomokuBoard));
      expect(markedCells()).toEqual([]);
      clickCell(7, 7);
      expect(markedCells()).toEqual(["7-7"]);
      clickCell(7, 8);
      expect(markedCells()).toEqual(["7-8"]);
    });

    it("復盤停在第 N 步，標的是第 N 步而不是整局最後一步", () => {
      render(createElement(GomokuBoard));
      clickCell(7, 7); clickCell(7, 8); clickCell(8, 7);
      expect(markedCells()).toEqual(["8-7"]);

      enterReplayAndStepTo(2);
      expect(markedCells()).toEqual(["7-8"]);
      fireEvent.click(screen.getByTestId("replay-prev"));
      expect(markedCells()).toEqual(["7-7"]);
    });

    it("對電腦：電腦落子後標記在電腦剛下的那格，人類那格不再有", async () => {
      render(createElement(GomokuBoard));
      fireEvent.click(screen.getByTestId("mode-pve"));
      clickCell(7, 7);
      await waitFor(() => expect(screen.getAllByTestId("stone-white")).toHaveLength(1), {
        timeout: 3000,
      });
      const whiteCell = screen
        .getByTestId("stone-white")
        .closest("button")!
        .getAttribute("aria-label")!
        .split(" ")[0];
      expect(whiteCell).not.toBe("7-7");
      expect(markedCells()).toEqual([whiteCell]);
    });
  });

  describe("暗棋", () => {
    it("翻子後被翻的那格被標記；再翻一顆標記移過去，舊格不再有", () => {
      render(createElement(BanqiBoard));
      expect(markedCells()).toEqual([]);
      clickCell(0, 0);
      expect(markedCells()).toEqual(["0-0"]);
      clickCell(1, 1);
      expect(markedCells()).toEqual(["1-1"]);
    });

    it("復盤停在第 N 步，標的是第 N 步翻的那格而不是整局最後一翻", () => {
      render(createElement(BanqiBoard));
      clickCell(0, 0); clickCell(1, 1); clickCell(2, 2);
      expect(markedCells()).toEqual(["2-2"]);

      enterReplayAndStepTo(2);
      expect(markedCells()).toEqual(["1-1"]);
      fireEvent.click(screen.getByTestId("replay-prev"));
      expect(markedCells()).toEqual(["0-0"]);
    });
  });

  describe("move → 格子的對應", () => {
    it("象棋：起點與終點", () => {
      expect(xiangqiMoveCells({ from: { row: 6, col: 0 }, to: { row: 5, col: 0 } })).toEqual([
        { row: 6, col: 0 },
        { row: 5, col: 0 },
      ]);
    });
    it("五子棋：落子格", () => {
      expect(gomokuMoveCells({ row: 3, col: 4 })).toEqual([{ row: 3, col: 4 }]);
    });
    it("暗棋：翻子只有被翻的格；走子/吃子是起訖兩格", () => {
      expect(banqiMoveCells({ type: "flip", pos: { row: 2, col: 5 } })).toEqual([
        { row: 2, col: 5 },
      ]);
      expect(
        banqiMoveCells({ type: "move", from: { row: 0, col: 0 }, to: { row: 0, col: 1 } })
      ).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]);
    });
  });
});
