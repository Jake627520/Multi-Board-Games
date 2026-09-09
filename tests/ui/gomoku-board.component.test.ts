import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import {
  clickCell,
  getCell,
  loadFirstSave,
  moveHistoryHeaderText,
  renderedMoveCount,
  replayButton,
  saveCurrentGame,
} from "./board-persistence-helpers";

describe("GomokuBoard 元件層：落子 → 儲存 → 載入 → 步譜與復盤", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("載入存檔後棋譜仍在，復盤按鈕仍可用", () => {
    render(createElement(GomokuBoard));

    expect(renderedMoveCount()).toBe(0);
    expect(replayButton().disabled).toBe(true);

    // 使用者操作：黑子 (7,7)、白子 (7,8)
    clickCell(7, 7);
    clickCell(7, 8);

    expect(renderedMoveCount()).toBe(2);
    expect(moveHistoryHeaderText()).toContain("對局步譜（2 步）");
    expect(replayButton().disabled).toBe(false);
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");

    saveCurrentGame("五子棋兩手");
    loadFirstSave();

    // 局面還原
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");
    expect(getCell(7, 8).getAttribute("aria-label")).toBe("7-8 white");

    // 關鍵回歸點
    expect(renderedMoveCount()).toBe(2);
    expect(moveHistoryHeaderText()).toContain("對局步譜（2 步）");
    expect(replayButton().disabled).toBe(false);
  });

  it("載入存檔後可以直接進入復盤，且總步數與棋譜一致", () => {
    render(createElement(GomokuBoard));

    clickCell(7, 7);
    clickCell(7, 8);
    clickCell(8, 8);

    saveCurrentGame("五子棋三手");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(3);

    fireEvent.click(replayButton());

    expect(screen.getByTestId("replay-controls")).toBeTruthy();
    expect(screen.getByTestId("replay-step-label").textContent).toBe("0 / 3 步");
  });

  it("載入存檔後悔棋仍可退回上一步", () => {
    render(createElement(GomokuBoard));

    clickCell(7, 7);
    clickCell(7, 8);
    saveCurrentGame("五子棋悔棋");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(2);

    fireEvent.click(screen.getByLabelText("悔棋"));

    expect(renderedMoveCount()).toBe(1);
    expect(getCell(7, 8).getAttribute("aria-label")).toBe("7-8 空位");
  });
});
