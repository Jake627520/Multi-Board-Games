import { describe, expect, it } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../src/games/banqi/ai";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/**
 * 穩健型（Level 2）必須強過進取型（Level 1）。
 *
 * 勝負歸屬是這支測試的重點，不是細節。暗棋首翻之前沒有人有顏色，開局的
 * currentPlayer 只是「先手」的佔位標籤；先手的真實顏色要用 moverOf 從首翻取得。
 * 本 session 先前的量測直接拿佔位當先手顏色，首翻翻出黑子的那一半局勝負被
 * 整個歸錯邊，任何真實差距都被拉向五五波——同一批 60 局，錯誤歸屬算出
 * 20:19（看似相當），正確歸屬是 35:4。「兩種風格強度相當」的結論就是這樣來的。
 */
describe("暗棋 AI 強度階梯（正確歸屬勝負）", () => {
  it("穩健型勝場明顯多於進取型", async () => {
    let cautious = 0;
    let aggressive = 0;

    for (let g = 0; g < 20; g++) {
      const real = Math.random;
      Math.random = lcg(g + 1);
      const engine = createBanqiEngine();
      let state = engine.createInitialState();
      Math.random = real;

      const cautiousAi = createBanqiAiLevel2({ rng: lcg(g + 500) });
      const aggressiveAi = createBanqiAiLevel1({ rng: lcg(g + 900) });
      const cautiousFirst = g % 2 === 0;
      let firstMover = "";

      for (let ply = 0; ply < 400 && !engine.isGameOver(state); ply++) {
        const legal = engine.getLegalMoves(state);
        if (!legal.length) break;
        const ai = (ply % 2 === 0) === cautiousFirst ? cautiousAi : aggressiveAi;
        const view = engine.projectView(state, {
          role: "player",
          player: engine.getCurrentPlayer(state),
        });
        const before = state;
        state = engine.applyMove(state, await ai.selectMove(view, legal));
        if (ply === 0) firstMover = engine.moverOf!(before, state);
      }

      const winner = engine.getWinner(state);
      if (!winner) continue;
      const cautiousColour = cautiousFirst
        ? firstMover
        : firstMover === "red" ? "black" : "red";
      if (winner === cautiousColour) cautious++;
      else aggressive++;
    }

    expect(cautious).toBeGreaterThan(aggressive * 3);
  });
});
