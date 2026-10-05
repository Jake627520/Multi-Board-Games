import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { clickCell, renderedMoveCount, saveCurrentGame } from "./board-persistence-helpers";

function loadButton(): HTMLButtonElement {
  const b = document.querySelector<HTMLButtonElement>('[data-testid^="save-load-"]');
  if (!b) throw new Error("沒有存檔可載入");
  return b;
}

/**
 * 存檔後立刻載入，載入前後局面完全相同——所以既有的「存檔→載入→步譜仍在」
 * 測試分不出載入成功和根本沒載入（把載入改成空操作，它們照樣全綠）。
 * 這裡在存檔之後多走一步，載入就必須把局面退回存檔當時，才分得出來。
 */
describe("載入存檔", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("確實把局面退回存檔當時（不是什麼都沒做）", () => {
    render(createElement(GomokuBoard));
    clickCell(7, 7);
    clickCell(0, 0);
    saveCurrentGame("兩步");
    clickCell(7, 8);
    expect(renderedMoveCount()).toBe(3);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(loadButton());

    expect(renderedMoveCount()).toBe(2);
  });

  /** 載入會取代進行中的局；先前是唯一不經確認的破壞性操作。 */
  it("對局進行中載入會先確認；取消則局面不變", () => {
    render(createElement(GomokuBoard));
    clickCell(7, 7);
    saveCurrentGame("一步");
    clickCell(0, 0);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(loadButton());

    expect(confirmSpy).toHaveBeenCalled();
    expect(renderedMoveCount()).toBe(2);
  });
});
