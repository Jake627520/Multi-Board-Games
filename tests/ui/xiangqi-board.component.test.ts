import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import {
  clickCell,
  getCell,
  loadFirstSave,
  moveHistoryHeaderText,
  renderedMoveCount,
  replayButton,
  saveCurrentGame,
} from "./board-persistence-helpers";

describe("XiangqiBoard 元件層：落子 → 儲存 → 載入 → 步譜與復盤", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("載入存檔後棋譜仍在，復盤按鈕仍可用", () => {
    render(createElement(XiangqiBoard));

    // 初始：無棋譜、復盤按鈕停用
    expect(renderedMoveCount()).toBe(0);
    expect(replayButton().disabled).toBe(true);

    // 使用者操作：選紅兵 (6,4) → 走到 (5,4)
    clickCell(6, 4);
    clickCell(5, 4);

    expect(renderedMoveCount()).toBe(1);
    expect(moveHistoryHeaderText()).toContain("對局步譜（1 步）");
    expect(replayButton().disabled).toBe(false);
    expect(getCell(5, 4).getAttribute("aria-label")).toBe("5-4 red soldier");

    // 儲存 → 載入
    saveCurrentGame("象棋一步");
    loadFirstSave();

    // 局面必須還原
    expect(getCell(5, 4).getAttribute("aria-label")).toBe("5-4 red soldier");
    expect(getCell(6, 4).getAttribute("aria-label")).toBe("6-4 empty");

    // 關鍵回歸點：棋譜不得歸零，復盤不得被停用
    expect(renderedMoveCount()).toBe(1);
    expect(moveHistoryHeaderText()).toContain("對局步譜（1 步）");
    expect(replayButton().disabled).toBe(false);
  });

  it("載入存檔後可以直接進入復盤，且總步數與棋譜一致", () => {
    render(createElement(XiangqiBoard));

    clickCell(6, 4); // 紅兵
    clickCell(5, 4);
    clickCell(3, 4); // 黑卒
    clickCell(4, 4);

    expect(renderedMoveCount()).toBe(2);

    saveCurrentGame("象棋兩步");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(2);

    const replayBtn = replayButton();
    expect(replayBtn.disabled).toBe(false);
    fireEvent.click(replayBtn);

    expect(screen.getByTestId("replay-controls")).toBeTruthy();
    expect(screen.getByTestId("replay-step-label").textContent).toBe("0 / 2 步");
  });

  it("載入存檔後悔棋仍可退回上一步", () => {
    render(createElement(XiangqiBoard));

    clickCell(6, 4);
    clickCell(5, 4);
    saveCurrentGame("象棋悔棋");
    loadFirstSave();

    expect(renderedMoveCount()).toBe(1);

    fireEvent.click(screen.getByLabelText("悔棋"));

    expect(renderedMoveCount()).toBe(0);
    expect(getCell(6, 4).getAttribute("aria-label")).toBe("6-4 red soldier");
  });
});
