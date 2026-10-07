import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";

/**
 * 三種棋的兩個 AI 都是難度階梯，所以選擇器都用「難度 / Level」措辭。
 * 括號裡的描述必須說實話：象棋與五子棋的 Level 2 是 minimax 搜尋，
 * 暗棋的 Level 2 是只讀明子的穩健型貪婪，不是搜尋——寫成 Minimax 就是不實宣稱。
 *
 * 暗棋曾經被標成「對手風格」並宣稱兩者等強。那是量測錯誤造成的：勝負用開局的
 * currentPlayer（首翻前只是先手的佔位標籤）歸屬，真實差距被拉成五五波。
 * 強弱關係現在由 tests/banqi/ai-strength-ladder.test.ts 用正確的歸屬守門。
 */
describe("AI 難度選擇器的措辭", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("象棋：Level 措辭，Level 2 是 Minimax", () => {
    render(createElement(XiangqiBoard));
    fireEvent.click(screen.getByTestId("mode-pve"));
    expect(screen.getByTestId("ai-level-selector").textContent).toContain("難度");
    expect(screen.getByTestId("ai-level-1").textContent).toContain("Level 1");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("Level 2");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("Minimax");
  });

  it("暗棋：Level 措辭，但不得宣稱 Level 2 是 Minimax", () => {
    render(createElement(BanqiBoard));
    fireEvent.click(screen.getByTestId("mode-pve"));
    const selector = screen.getByTestId("ai-level-selector");
    expect(selector.textContent).toContain("難度");
    expect(screen.getByTestId("ai-level-1").textContent).toContain("Level 1");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("Level 2");
    expect(screen.getByTestId("ai-level-2").textContent).toContain("穩健");
    expect(selector.textContent).not.toContain("Minimax");
  });
});
