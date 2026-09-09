import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import {
  clickCell,
  getCell,
  loadFirstSave,
  moveHistoryHeaderText,
  renderedMoveCount,
  replayButton,
  seedLocalSave,
} from "./board-persistence-helpers";

/**
 * v1（formatVersion: 1）舊存檔沒有 history 欄位。
 * 升級到 v2 之後這些存檔仍必須能載入，只是棋譜視為空陣列、復盤無步可放。
 */

/** 手寫的 v1 五子棋盤面：黑 (7,7)、白 (7,8)，輪到黑方。 */
function handwrittenGomokuStateV1(): string {
  const board: (string | null)[][] = Array.from({ length: 15 }, () =>
    Array<string | null>(15).fill(null)
  );
  board[7][7] = "black";
  board[7][8] = "white";

  return JSON.stringify({
    board,
    currentPlayer: "black",
    winner: null,
    isDraw: false,
    moveNumber: 3,
    ruleMode: "freestyle",
  });
}

describe("v1 舊存檔相容性（元件層）", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("五子棋：手寫的 formatVersion 1 存檔仍可載入且不炸", () => {
    seedLocalSave({
      id: "gomoku-legacy-v1",
      name: "舊版存檔 (v1)",
      gameId: "gomoku",
      moveCount: 2,
      envelopeJson: JSON.stringify({
        formatVersion: 1,
        gameId: "gomoku",
        engineVersion: "0.11.0",
        state: handwrittenGomokuStateV1(),
        savedAt: "2026-01-01T00:00:00.000Z",
      }),
    });

    render(createElement(GomokuBoard));
    loadFirstSave();

    // 沒有錯誤訊息
    expect(document.querySelector(".error")).toBeNull();

    // 盤面確實被還原
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");
    expect(getCell(7, 8).getAttribute("aria-label")).toBe("7-8 white");

    // v1 沒有棋譜可還原：步譜為空、復盤按鈕停用（但不得拋錯）
    expect(renderedMoveCount()).toBe(0);
    expect(moveHistoryHeaderText()).toContain("對局步譜（0 步）");
    expect(replayButton().disabled).toBe(true);

    // 載入後仍可繼續下棋，新的一步會正常進入棋譜
    clickCell(8, 8);
    expect(renderedMoveCount()).toBe(1);
    expect(replayButton().disabled).toBe(false);
  });

  it("象棋：formatVersion 1 存檔載入後不顯示錯誤，且可繼續對局", () => {
    const engine = createXiangqiEngine();

    seedLocalSave({
      id: "xiangqi-legacy-v1",
      name: "舊版存檔 (v1)",
      gameId: "xiangqi",
      moveCount: 0,
      envelopeJson: JSON.stringify({
        formatVersion: 1,
        gameId: "xiangqi",
        engineVersion: "0.11.0",
        state: engine.serialize(engine.createInitialState()),
        savedAt: "2026-01-01T00:00:00.000Z",
      }),
    });

    render(createElement(XiangqiBoard));
    loadFirstSave();

    expect(document.querySelector(".error")).toBeNull();
    expect(renderedMoveCount()).toBe(0);
    expect(replayButton().disabled).toBe(true);

    clickCell(6, 4);
    clickCell(5, 4);

    expect(renderedMoveCount()).toBe(1);
    expect(screen.getByTestId("enter-replay-btn")).toBeTruthy();
    expect(replayButton().disabled).toBe(false);
  });
});
