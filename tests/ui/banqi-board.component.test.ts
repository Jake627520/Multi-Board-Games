import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";
import {
  clickCell,
  getCell,
  loadFirstSave,
  moveHistoryHeaderText,
  renderedMoveCount,
  replayButton,
  saveCurrentGame,
} from "./board-persistence-helpers";

function isFaceDown(row: number, col: number): boolean {
  return (getCell(row, col).getAttribute("aria-label") ?? "").endsWith("暗棋");
}

describe("BanqiBoard 元件層：翻子 → 儲存 → 載入 → 步譜與復盤", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("載入存檔後棋譜仍在，復盤按鈕仍可用，且暗棋身分未被重新洗牌", () => {
    render(createElement(BanqiBoard));

    expect(renderedMoveCount()).toBe(0);
    expect(replayButton().disabled).toBe(true);
    expect(isFaceDown(0, 0)).toBe(true);

    // 使用者操作：翻開 (0,0) 與 (1,1)
    clickCell(0, 0);
    clickCell(1, 1);

    expect(renderedMoveCount()).toBe(2);
    expect(moveHistoryHeaderText()).toContain("對局步譜（2 步）");
    expect(replayButton().disabled).toBe(false);

    const revealedAt00 = getCell(0, 0).getAttribute("aria-label");
    const revealedAt11 = getCell(1, 1).getAttribute("aria-label");
    expect(isFaceDown(0, 0)).toBe(false);

    saveCurrentGame("暗棋兩翻");
    loadFirstSave();

    // 已翻開的棋子身分必須完全一致（暗棋不可因載入而重新隨機化）
    expect(getCell(0, 0).getAttribute("aria-label")).toBe(revealedAt00);
    expect(getCell(1, 1).getAttribute("aria-label")).toBe(revealedAt11);
    expect(isFaceDown(2, 2)).toBe(true);

    // 關鍵回歸點
    expect(renderedMoveCount()).toBe(2);
    expect(moveHistoryHeaderText()).toContain("對局步譜（2 步）");
    expect(replayButton().disabled).toBe(false);
  });

  it("載入存檔後可以直接進入復盤，且總步數與棋譜一致", () => {
    render(createElement(BanqiBoard));

    clickCell(0, 0);
    clickCell(1, 1);

    saveCurrentGame("暗棋復盤");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(2);

    fireEvent.click(replayButton());

    expect(screen.getByTestId("replay-controls")).toBeTruthy();
    expect(screen.getByTestId("replay-step-label").textContent).toBe("0 / 2 步");
  });

  it("載入存檔後悔棋仍可把翻開的棋子蓋回去", () => {
    render(createElement(BanqiBoard));

    clickCell(0, 0);
    saveCurrentGame("暗棋悔棋");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(1);
    expect(isFaceDown(0, 0)).toBe(false);

    fireEvent.click(screen.getByLabelText("悔棋"));

    expect(renderedMoveCount()).toBe(0);
    expect(isFaceDown(0, 0)).toBe(true);
  });
});
