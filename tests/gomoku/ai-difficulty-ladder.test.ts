import { describe, it, expect } from "vitest";
import { createInitialState } from "../../src/games/gomoku/board";
import { applyMove, getLegalMoves } from "../../src/games/gomoku/rules";
import { createGomokuAiLevel1, createGomokuAiLevel2 } from "../../src/games/gomoku/ai";
import type { GomokuMove, GomokuState } from "../../src/games/gomoku/types";

/**
 * 難度單調性守門測試。
 *
 * 為什麼需要它：專案原本有 242 個測試，全部在問「AI 走的是不是合法棋」「會不會
 * 擋住眼前的四連」，沒有任何一個在問「Level 2 到底有沒有比 Level 1 強」。
 * 結果 Level 2 的葉節點評估退化成純置中偏好，實測對 Level 1 幾乎全敗
 * （12 局 0 勝、50 局 1 勝），難度階梯是反的，而全綠的測試完全沒有反應。
 *
 * 做法：小樣本配對對打（先後手各半、開局用固定種子隨機兩手製造變化），
 * 斷言 Level 2 勝場嚴格多於 Level 1。樣本刻意壓到 10 局讓它能進 CI；
 * 判準只要求「明顯較強」而不是某個精確勝率，避免評估函式微調就紅一片。
 */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GAMES = 10;
const MAX_PLIES = 300;

describe("Gomoku difficulty ladder: Level 2 must be stronger than Level 1", () => {
  it(`wins strictly more head-to-head games than Level 1 over ${GAMES} paired games`, async () => {
    const l1 = createGomokuAiLevel1();
    const l2 = createGomokuAiLevel2();

    let l2Wins = 0;
    let l1Wins = 0;
    const moveTimes: number[] = [];

    for (let g = 0; g < GAMES; g++) {
      const rng = mulberry32(20_260_929 + g);
      let state: GomokuState = createInitialState("freestyle");
      // 先後手對調：偶數局 Level 2 執黑，奇數局執白
      const l2IsBlack = g % 2 === 0;

      // 固定種子的隨機開局兩手，讓每一局的局面不同（兩個 AI 都是決定性的，
      // 沒有這一步的話 10 局只會是同一盤棋重播 10 次）
      for (let k = 0; k < 2; k++) {
        const nearCenter = getLegalMoves(state).filter(
          (m) => Math.abs(m.row - 7) <= 2 && Math.abs(m.col - 7) <= 2
        );
        state = applyMove(state, nearCenter[Math.floor(rng() * nearCenter.length)]);
      }

      let plies = 0;
      while (state.winner === null && state.isDraw !== true && plies < MAX_PLIES) {
        const legal = getLegalMoves(state);
        if (legal.length === 0) break;

        const isL2Turn = (state.currentPlayer === "black") === l2IsBlack;
        let move: GomokuMove;
        if (isL2Turn) {
          const started = performance.now();
          move = await l2.selectMove(state, legal);
          moveTimes.push(performance.now() - started);
        } else {
          move = await l1.selectMove(state, legal);
        }
        state = applyMove(state, move);
        plies++;
      }

      if (state.winner !== null) {
        if ((state.winner === "black") === l2IsBlack) l2Wins++;
        else l1Wins++;
      }
    }

    expect(l2Wins).toBeGreaterThan(l1Wins);
    // 一併守住「不可因為變強而變卡」：Level 2 的單手思考時間必須維持在
    // 可以即時互動的量級（實測 avg 約 3ms）。
    const avg = moveTimes.reduce((a, b) => a + b, 0) / moveTimes.length;
    expect(avg).toBeLessThan(100);
  }, 120_000);
});
