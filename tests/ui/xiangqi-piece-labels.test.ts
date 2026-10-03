import { describe, expect, it, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { PIECE_NAMES } from "../../src/games/xiangqi/notation";

/**
 * 棋盤與記譜必須用同一份棋子字。先前棋盤自己另存一組只有黑方字的對照，
 * 於是紅方被畫成「將士象卒」，而同一局的步譜卻寫「帥」「兵」——畫面與
 * 紀錄互相矛盾。兩邊現在共用 notation 的 PIECE_NAMES，這支測試鎖住它。
 */
describe("象棋棋子字：紅黑分明且與記譜一致", () => {
  afterEach(cleanup);

  it("紅方用帥仕相兵，黑方用將士象卒", () => {
    render(createElement(XiangqiBoard));

    const redGeneral = screen.getByTestId("piece-red-general");
    const blackGeneral = screen.getByTestId("piece-black-general");
    expect(redGeneral.textContent).toBe("帥");
    expect(blackGeneral.textContent).toBe("將");
    expect(redGeneral.textContent).not.toBe(blackGeneral.textContent);

    const redSoldiers = screen.getAllByTestId("piece-red-soldier");
    const blackSoldiers = screen.getAllByTestId("piece-black-soldier");
    expect(redSoldiers[0].textContent).toBe("兵");
    expect(blackSoldiers[0].textContent).toBe("卒");
  });

  it("畫面上的字就是 PIECE_NAMES，沒有第二份副本", () => {
    render(createElement(XiangqiBoard));
    for (const player of ["red", "black"] as const) {
      for (const type of ["general", "advisor", "elephant", "chariot", "horse", "cannon", "soldier"] as const) {
        const nodes = screen.getAllByTestId(`piece-${player}-${type}`);
        expect(nodes[0].textContent).toBe(PIECE_NAMES[player][type]);
      }
    }
  });
});
