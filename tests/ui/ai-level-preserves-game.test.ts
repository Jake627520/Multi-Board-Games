import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";
import { clickCell, getCell, renderedMoveCount } from "./board-persistence-helpers";

/**
 * 切換 AI 難度不得毀掉進行中的對局。
 *
 * 原本象棋與暗棋會在換難度時 reset()，五子棋不會——同一個動作三種棋三種結果，
 * 而且前兩者是無預警的資料遺失，與「切換遊戲會先確認」的處理自相矛盾。
 *
 * 注意：難度按鈕的 disabled 綁在 isAiThinking，所以必須等 AI 回完手才點得動；
 * 落子後立刻點會撞上停用狀態，測試會假性通過。
 */
function levelButton(level: "1" | "2"): HTMLButtonElement {
  return screen.getByTestId(`ai-level-${level}`) as HTMLButtonElement;
}

async function enterPveMoveAndWaitForAi(makeMove: () => void): Promise<void> {
  fireEvent.click(screen.getByTestId("mode-pve"));
  makeMove();
  await waitFor(() => expect(levelButton("2").disabled).toBe(false), { timeout: 5000 });
}

describe("切換 AI 難度：保留對局，三種棋一致", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("象棋：換難度後棋譜仍在", async () => {
    render(createElement(XiangqiBoard));
    await enterPveMoveAndWaitForAi(() => {
      clickCell(6, 4);
      clickCell(5, 4);
    });
    const before = renderedMoveCount();
    expect(before).toBeGreaterThan(0);

    fireEvent.click(levelButton("2"));
    expect(renderedMoveCount()).toBe(before);

    await waitFor(() => expect(levelButton("1").disabled).toBe(false), { timeout: 5000 });
    fireEvent.click(levelButton("1"));
    expect(renderedMoveCount()).toBe(before);
  });

  it("五子棋：換難度後棋譜仍在（原本就正確，鎖住不讓它退化）", async () => {
    render(createElement(GomokuBoard));
    await enterPveMoveAndWaitForAi(() => clickCell(7, 7));
    const before = renderedMoveCount();
    expect(before).toBeGreaterThan(0);

    fireEvent.click(levelButton("2"));
    expect(renderedMoveCount()).toBe(before);
  });

  it("暗棋：換難度後棋譜仍在，且已翻開的棋子不被蓋回去", async () => {
    render(createElement(BanqiBoard));
    await enterPveMoveAndWaitForAi(() => clickCell(0, 0));
    const before = renderedMoveCount();
    const revealedBefore = getCell(0, 0).textContent;
    expect(before).toBeGreaterThan(0);

    fireEvent.click(levelButton("2"));

    expect(renderedMoveCount()).toBe(before);
    expect(getCell(0, 0).textContent).toBe(revealedBefore);
  });
});
