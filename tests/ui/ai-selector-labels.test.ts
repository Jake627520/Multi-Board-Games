import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";

/**
 * 對手選擇器的措辭是刻意的，不是隨手寫的文案：
 * 象棋與五子棋的兩個 AI 是真正的難度階梯（配對對打 8:0 與 11:1），
 * 暗棋的兩個等強（14:14）、差別在風格。把等強的東西標成「難度」是不實宣稱，
 * 所以暗棋用自己的標籤。這支測試鎖住這個決定，避免重構共用元件時被改回去。
 */
describe("AI 對手選擇器的措辭", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("象棋：是真的難度階梯，維持 Level 措辭", () => {
    render(createElement(XiangqiBoard));
    fireEvent.click(screen.getByTestId("mode-pve"));
    expect(screen.getByTestId("ai-level-selector").textContent).toContain("難度");
    expect(screen.getByTestId("ai-level-1").textContent).toContain("Level 1");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("Level 2");
  });

  it("暗棋：兩個 AI 等強，用風格措辭且不得出現 Level", () => {
    render(createElement(BanqiBoard));
    fireEvent.click(screen.getByTestId("mode-pve"));
    const selector = screen.getByTestId("ai-level-selector");
    expect(selector.textContent).toContain("風格");
    expect(selector.textContent).not.toContain("難度");
    expect(selector.textContent).not.toContain("Level");
    expect(screen.getByTestId("ai-level-1").textContent).toContain("進取");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("穩健");
  });
});
