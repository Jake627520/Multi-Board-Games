import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { clickCell, renderedMoveCount } from "./board-persistence-helpers";

/** 黑方在第 7 列連成五子的走法序列（白方下在遠離的角落）。 */
const BLACK_WINS: readonly [number, number][] = [
  [7, 7], [0, 0], [7, 8], [0, 1], [7, 9], [0, 2], [7, 10], [0, 3], [7, 11],
];

describe("離開與續局的守門", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  /**
   * 對局結束時自動存檔會被刻意清掉，但 inProgress 若只看「棋譜非空」，
   * 下完一盤棋按回首頁就會跳出「本局無法自動保存」——棋都下完了，
   * 沒有東西要保存。不實的警告會訓練使用者忽略警告。
   */
  it("對局結束後不再回報進行中，離開不該再警告", () => {
    const reports: boolean[] = [];
    render(
      createElement(GomokuBoard, { onProgressChange: (v: boolean) => reports.push(v) })
    );

    clickCell(7, 7);
    expect(reports[reports.length - 1]).toBe(true); // 有棋譜 = 進行中

    for (const [r, c] of BLACK_WINS.slice(1)) clickCell(r, c);

    expect(document.querySelector(".gameover")).not.toBeNull();
    expect(renderedMoveCount()).toBe(BLACK_WINS.length);
    expect(reports[reports.length - 1]).toBe(false); // 已結束 = 沒有東西可丟
  });

  /**
   * 自動存檔原本只存棋局，mode/執方/難度/規則模式都是 Board 的本地 state，
   * 所以 PvE 局續局後會變回 PvP，再點「對戰電腦」就 reset() 清掉棋譜——
   * 等於人機局事實上無法續。
   */
  it("PvE 續局後仍是 PvE，棋譜完整", () => {
    const first = render(createElement(GomokuBoard));
    fireEvent.click(screen.getByTestId("mode-pve"));
    clickCell(7, 7);

    const moves = renderedMoveCount();
    expect(moves).toBeGreaterThan(0);
    expect(screen.getByTestId("mode-pve").className).toContain("active");

    first.unmount();
    render(createElement(GomokuBoard));

    expect(screen.getByTestId("mode-pve").className).toContain("active");
    expect(screen.getByTestId("mode-pvp").className).not.toContain("active");
    expect(renderedMoveCount()).toBe(moves);
  });

  /** 有棋譜時按「重新開始」會毀掉對局，先前無聲執行。 */
  it("有棋譜時按重新開始會先確認；取消則棋譜留著", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(createElement(GomokuBoard));
    clickCell(7, 7);
    const before = renderedMoveCount();

    fireEvent.click(screen.getByText("重新開始"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(renderedMoveCount()).toBe(before);
  });
});
