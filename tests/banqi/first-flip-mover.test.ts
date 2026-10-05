import { describe, expect, it } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { GameSession } from "../../src/core/game/session";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** 用固定種子建立暗棋，並找出一個「首翻會翻出指定顏色」的開局。 */
function sessionWhoseFirstFlipIs(color: "red" | "black") {
  for (let seed = 1; seed <= 200; seed++) {
    const real = Math.random;
    Math.random = lcg(seed);
    const engine = createBanqiEngine();
    const session = new GameSession(engine);
    Math.random = real;
    const piece = (session.getState() as { board: { player: string }[][] }).board[0][0];
    if (piece.player === color) return { session, engine };
  }
  throw new Error(`200 個種子內找不到首翻為 ${color} 的開局`);
}

/**
 * 暗棋開局時雙方還沒有顏色，走棋前的 currentPlayer 只是「先手」的佔位標籤。
 * 先前首翻翻出黑子時，棋譜把這一手記成紅方，接著又「輪到紅方」——畫面看起來
 * 回合沒換，而且這個錯誤會寫進存檔與復盤。
 */
describe("暗棋首翻：記錄的走棋者要是翻出的顏色", () => {
  it("首翻翻出黑子：這一手記為黑方，接著輪到紅方", () => {
    const { session } = sessionWhoseFirstFlipIs("black");
    session.move({ type: "flip", pos: { row: 0, col: 0 } });

    expect(session.getHistory()[0].player).toBe("black");
    expect(session.getCurrentPlayer()).toBe("red");
  });

  it("首翻翻出紅子：這一手記為紅方，接著輪到黑方", () => {
    const { session } = sessionWhoseFirstFlipIs("red");
    session.move({ type: "flip", pos: { row: 0, col: 0 } });

    expect(session.getHistory()[0].player).toBe("red");
    expect(session.getCurrentPlayer()).toBe("black");
  });

  it("首翻之後的每一手，記錄的走棋者都等於走棋前的 currentPlayer", () => {
    const { session, engine } = sessionWhoseFirstFlipIs("black");
    session.move({ type: "flip", pos: { row: 0, col: 0 } });
    for (let i = 0; i < 6; i++) {
      const expected = session.getCurrentPlayer();
      const legal = engine.getLegalMoves(session.getState());
      if (!legal.length) break;
      session.move(legal[0]);
      expect(session.getHistory()[session.getHistory().length - 1].player).toBe(expected);
    }
  });
});
