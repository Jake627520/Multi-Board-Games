import { describe, it, expect } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { positionSignature } from "../../src/games/banqi/rules";
import type { BanqiPiece, BanqiState } from "../../src/games/banqi/types";

/**
 * 隱藏資訊紅線：三次重複偵測用的局面簽章，本身不能變成洩漏管道。
 *
 * 暗棋的核心機制是「未翻開的子不知道是什麼」。簽章必須包含「哪些格子已翻開」
 * （否則翻子前後會被誤判成同一個局面），但**絕對不能**包含未翻開棋子的
 * player / type / rank / id。
 *
 * 這裡用兩種互補的檢查：
 *   1. 結構檢查：未翻開的格子在簽章裡只能長成 `r,c:#`。
 *   2. 置換不變性：把所有未翻開棋子的真實身分任意重排，簽章必須一字不差——
 *      這是「簽章完全不依賴隱藏身分」最強的證明，比字串比對更難繞過。
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

function hiddenCells(state: BanqiState): { row: number; col: number; piece: BanqiPiece }[] {
  const out: { row: number; col: number; piece: BanqiPiece }[] = [];
  state.board.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece && !piece.isRevealed) out.push({ row: r, col: c, piece });
    })
  );
  return out;
}

/** 把所有未翻開棋子的真實身分循環位移一格，翻開的子與空格完全不動。 */
function permuteHiddenIdentities(state: BanqiState): BanqiState {
  const hidden = hiddenCells(state);
  if (hidden.length < 2) return state;

  const board = state.board.map((row) => [...row]);
  hidden.forEach(({ row, col }, i) => {
    const donor = hidden[(i + 1) % hidden.length].piece;
    board[row][col] = {
      id: donor.id,
      player: donor.player,
      type: donor.type,
      rank: donor.rank,
      isRevealed: false,
    };
  });
  return { ...state, board };
}

describe("Banqi position signature never leaks hidden piece identity", () => {
  const engine = createBanqiEngine();

  it("renders every face-down cell as an anonymous marker, across a whole random game", () => {
    const rng = mulberry32(31_337);
    const originalRandom = Math.random;
    Math.random = rng;
    let state: BanqiState;
    try {
      state = engine.createInitialState();
    } finally {
      Math.random = originalRandom;
    }

    let checkedWithHidden = 0;

    for (let step = 0; step < 120; step++) {
      if (engine.isGameOver(state)) break;
      const legal = engine.getLegalMoves(state);
      if (legal.length === 0) break;

      const signature = positionSignature(state);
      const hidden = hiddenCells(state);
      if (hidden.length > 0) checkedWithHidden++;

      for (const { row, col, piece } of hidden) {
        // 未翻開的格子只能是匿名標記
        expect(signature).toContain(`${row},${col}:#`);
        // 真實身分（id、以及 "player-type" 這個組合）不得出現在簽章任何位置
        expect(signature).not.toContain(piece.id);
        expect(signature).not.toContain(`${row},${col}:${piece.player}-${piece.type}`);
      }

      // 匿名標記的數量必須剛好等於未翻開棋子的數量（沒有漏網之魚）
      expect(signature.split(":#").length - 1).toBe(hidden.length);

      state = engine.applyMove(state, legal[Math.floor(rng() * legal.length)]);
    }

    expect(checkedWithHidden).toBeGreaterThan(10);
  });

  it("is invariant under any permutation of the face-down pieces' real identities", () => {
    const rng = mulberry32(4_242);
    const originalRandom = Math.random;
    Math.random = rng;
    let state: BanqiState;
    try {
      state = engine.createInitialState();
    } finally {
      Math.random = originalRandom;
    }

    for (let step = 0; step < 40; step++) {
      if (engine.isGameOver(state)) break;
      const legal = engine.getLegalMoves(state);
      if (legal.length === 0) break;

      const permuted = permuteHiddenIdentities(state);
      expect(positionSignature(permuted)).toBe(positionSignature(state));

      state = engine.applyMove(state, legal[Math.floor(rng() * legal.length)]);
    }
  });

  it("distinguishes positions that differ only in which cells are face-up", () => {
    // 反向保護：簽章不能為了保密而「什麼都不說」——翻開狀態是公開資訊，
    // 必須反映在簽章裡，否則翻子前後會被誤判成重複局面。
    const state = engine.createInitialState();
    const flipped = engine.applyMove(state, engine.getLegalMoves(state)[0]);
    expect(positionSignature(flipped)).not.toBe(positionSignature(state));
  });
});
