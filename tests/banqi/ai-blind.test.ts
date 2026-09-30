/**
 * 暗棋 AI 決策邊界的隱藏資訊測試。
 *
 * 既有的 hidden-information 測試守的是「序列化邊界」；AI 從不序列化任何東西，
 * 所以這裡守的是另一條邊界：AI 收到什麼、能不能靠蓋著的棋子身分做決定。
 * 舊版 Level 2 直接吃權威完整狀態，開局首手翻子 100% 翻到將（平均階級 7.00）。
 *
 * 所有隨機性都用固定種子，結果是確定的、不會 flaky；區間的寬度用二項分布的
 * 標準差估（n=400、p=1/16 → σ≈4.8，區間取 ±3σ 以上）。
 */
import { describe, expect, it } from "vitest";
import { createSeededRng, type Rng } from "../../src/core/ai/random";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { determinize, unseenPieces } from "../../src/games/banqi/determinize";
import { emptyBoard, generateAllPieces } from "../../src/games/banqi/board";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { applyMoveUnchecked, getLegalMoves } from "../../src/games/banqi/rules";
import type { BanqiPiece, BanqiState, BanqiViewState } from "../../src/games/banqi/types";

const engine = createBanqiEngine();

function seededState(rng: Rng): BanqiState {
  const pieces = generateAllPieces();
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  const board = emptyBoard();
  let k = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) board[r][c] = pieces[k++];
  return { board, currentPlayer: "red", player1Color: null, winner: null, moveNumber: 0 };
}

const view = (s: BanqiState): BanqiViewState =>
  engine.projectView(s, { role: "player", player: s.currentPlayer });

describe("暗棋 AI 不偷看蓋著的棋子：翻子無偏性", () => {
  const N = 400;
  // 期望：32 子中 2 張是將/帥 => 6.25%（25/400）；平均階級 = 104/32 = 3.25。
  const GENERAL_MIN = 25 - 15; // ±3.1σ
  const GENERAL_MAX = 25 + 15;

  for (const [name, make] of [
    ["Level 1", createBanqiAiLevel1],
    ["Level 2", createBanqiAiLevel2],
  ] as const) {
    it(`${name} 開局首手：翻到將/帥的比率落在隨機區間內（舊版 L2 是 100%）`, async () => {
      const boardRng = createSeededRng(2024);
      let generals = 0;
      let rankSum = 0;
      for (let i = 0; i < N; i++) {
        const s = seededState(boardRng);
        const m = await make({ seed: 900 + i }).selectMove(view(s), getLegalMoves(s));
        expect(m.type).toBe("flip");
        if (m.type !== "flip") continue;
        const p = s.board[m.pos.row][m.pos.col]!;
        if (p.type === "general") generals++;
        rankSum += p.rank;
      }
      expect(generals).toBeGreaterThanOrEqual(GENERAL_MIN);
      expect(generals).toBeLessThanOrEqual(GENERAL_MAX);
      const meanRank = rankSum / N;
      expect(meanRank).toBeGreaterThan(2.85);
      expect(meanRank).toBeLessThan(3.65);
    });

    it(`${name} 第二手（對手只能翻子）：選到的子階級不偏離盤上蓋子的平均`, async () => {
      const boardRng = createSeededRng(77);
      let diffSum = 0;
      const M = 300;
      for (let i = 0; i < M; i++) {
        const s0 = seededState(boardRng);
        // 首翻左上角（隨便一格），輪到對手；此時對手手上沒有翻開的子，只能翻。
        const s = applyMoveUnchecked(s0, { type: "flip", pos: { row: 0, col: 0 } });
        const legal = getLegalMoves(s);
        expect(legal.every((m) => m.type === "flip")).toBe(true);
        const m = await make({ seed: 5000 + i }).selectMove(view(s), legal);
        if (m.type !== "flip") throw new Error("expected flip");
        const hidden: BanqiPiece[] = s.board.flat().filter((p): p is BanqiPiece => !!p && !p.isRevealed);
        const mean = hidden.reduce((a, p) => a + p.rank, 0) / hidden.length;
        diffSum += s.board[m.pos.row][m.pos.col]!.rank - mean;
      }
      // 每局差的標準差約 2；300 局平均的標準誤約 0.12，±0.4 約 3.3σ。
      expect(Math.abs(diffSum / M)).toBeLessThan(0.4);
    });
  }

  it("決策只取決於「看得見的東西」：蓋著的子身分洗牌後，同 seed 給出同一手（含直接傳完整狀態）", async () => {
    const boardRng = createSeededRng(31337);
    for (let i = 0; i < 40; i++) {
      // 先走幾步隨機的合法步，製造有翻開/未翻開混合的中局。
      let s = seededState(boardRng);
      const plies = 3 + (i % 10);
      for (let p = 0; p < plies; p++) {
        const legal = getLegalMoves(s);
        if (!legal.length) break;
        s = applyMoveUnchecked(s, legal[Math.floor(boardRng() * legal.length)]);
      }
      const legal = getLegalMoves(s);
      if (!legal.length) continue;

      // 把蓋著的子彼此對調身分（位置與翻開狀態不變）。
      const hiddenCells: [number, number][] = [];
      s.board.forEach((row, r) => row.forEach((p, c) => { if (p && !p.isRevealed) hiddenCells.push([r, c]); }));
      const identities = hiddenCells.map(([r, c]) => s.board[r][c]!);
      const shuffled = [...identities].reverse();
      const board2 = s.board.map((row) => row.map((p) => (p ? { ...p } : null)));
      hiddenCells.forEach(([r, c], idx) => {
        const src = shuffled[idx];
        board2[r][c] = { ...src, id: identities[idx].id, isRevealed: false };
      });
      const s2: BanqiState = { ...s, board: board2 };

      for (const make of [createBanqiAiLevel1, createBanqiAiLevel2]) {
        const a = await make({ seed: i }).selectMove(s, legal);
        const b = await make({ seed: i }).selectMove(s2, legal);
        const c = await make({ seed: i }).selectMove(view(s), legal);
        expect(b).toEqual(a);
        expect(c).toEqual(a);
      }
    }
  });
});

describe("determinize / unseenPieces", () => {
  it("開局：看不見的多重集合就是完整 32 子（每方 將1 士2 象2 車2 馬2 炮2 卒5）", () => {
    const s = seededState(createSeededRng(1));
    const pool = unseenPieces(view(s));
    expect(pool).toHaveLength(32);
    const count = (player: string, type: string) =>
      pool.filter((p) => p.player === player && p.type === type).length;
    for (const player of ["red", "black"]) {
      expect(count(player, "general")).toBe(1);
      expect(count(player, "advisor")).toBe(2);
      expect(count(player, "elephant")).toBe(2);
      expect(count(player, "chariot")).toBe(2);
      expect(count(player, "horse")).toBe(2);
      expect(count(player, "cannon")).toBe(2);
      expect(count(player, "soldier")).toBe(5);
    }
  });

  it("已翻開的子從集合扣除；determinize 保留翻開的子與蓋著的格子位置，且不使用真實 id", () => {
    let s = seededState(createSeededRng(2));
    s = applyMoveUnchecked(s, { type: "flip", pos: { row: 0, col: 0 } });
    s = applyMoveUnchecked(s, { type: "flip", pos: { row: 1, col: 3 } });
    const v = view(s);
    expect(unseenPieces(v)).toHaveLength(30);

    const d = determinize(v, createSeededRng(3));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const orig = s.board[r][c]!;
        const got = d.board[r][c]!;
        expect(got.isRevealed).toBe(orig.isRevealed);
        if (orig.isRevealed) expect(got).toEqual(orig);
        else expect(got.id).toBe(`det-${r}-${c}`);
      }
    }
  });

  it("同一個 rng 種子得到同一個 determinization；不同種子通常不同", () => {
    const v = view(seededState(createSeededRng(4)));
    const a = determinize(v, createSeededRng(10));
    const b = determinize(v, createSeededRng(10));
    const c = determinize(v, createSeededRng(11));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("取樣結果的蓋子身分分布接近全套 32 子（沒有系統性偏向）", () => {
    const v = view(seededState(createSeededRng(5)));
    const rng = createSeededRng(6);
    let generals = 0;
    const T = 600;
    for (let t = 0; t < T; t++) {
      const d = determinize(v, rng);
      if (d.board[0][0]!.type === "general") generals++;
    }
    // 期望 6.25% * 600 = 37.5，σ≈5.9
    expect(generals).toBeGreaterThan(37.5 - 20);
    expect(generals).toBeLessThan(37.5 + 20);
  });
});
