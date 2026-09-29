import { describe, it, expect } from "vitest";
import { emptyBoard } from "../../src/games/banqi/board";
import {
  BANQI_NO_PROGRESS_LIMIT,
  applyMoveUnchecked,
  getLegalMoves,
  getWinner,
  isGameOver,
} from "../../src/games/banqi/rules";
import type { BanqiMove, BanqiPiece, BanqiState } from "../../src/games/banqi/types";

/**
 * 和局可達性守門測試。
 *
 * 為什麼需要它：暗棋原本 `isDraw` 沒有任何程式路徑會設成 true——AI 互打 50 盤
 * 有 35 盤打到 400 手上限仍未結束，紅卒 vs 黑將的殘局跑 500 手還是
 * `isGameOver === false`。既有測試全部在驗「單步規則對不對」，沒有一個在問
 * 「這盤棋到底會不會結束」，所以這個缺陷一直沒被抓到。
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

function revealed(
  id: string,
  player: BanqiPiece["player"],
  type: BanqiPiece["type"],
  rank: number
): BanqiPiece {
  return { id, player, type, rank, isRevealed: true };
}

function move(from: [number, number], to: [number, number]): BanqiMove {
  return { type: "move", from: { row: from[0], col: from[1] }, to: { row: to[0], col: to[1] } };
}

describe("Banqi draw detection", () => {
  it("declares a draw on the third occurrence of the same position", () => {
    // 兩隻車分踞棋盤兩端、永遠碰不到面，只能來回踱步 → 必然重複局面
    const board = emptyBoard();
    board[0][0] = revealed("r-r", "red", "chariot", 4);
    board[3][7] = revealed("b-r", "black", "chariot", 4);

    let state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 0,
    };

    // 一個 4 手循環：紅 (0,0)→(0,1)、黑 (3,7)→(3,6)、紅 (0,1)→(0,0)、黑 (3,6)→(3,7)
    const cycle: BanqiMove[] = [
      move([0, 0], [0, 1]),
      move([3, 7], [3, 6]),
      move([0, 1], [0, 0]),
      move([3, 6], [3, 7]),
    ];

    let plies = 0;
    while (!isGameOver(state) && plies < 40) {
      state = applyMoveUnchecked(state, cycle[plies % cycle.length]);
      plies++;
    }

    expect(isGameOver(state)).toBe(true);
    expect(state.isDraw).toBe(true);
    // 和局沒有贏家（回歸點：getLegalMoves 對和局回傳空陣列，
    // 若少了防護會被「無步可走者負」誤判成一方獲勝）
    expect(getWinner(state)).toBeNull();
    expect(state.winner).toBeNull();
    // 三次重複遠早於無進展上限
    expect(plies).toBeLessThan(BANQI_NO_PROGRESS_LIMIT);
  });

  it(`declares a draw after ${BANQI_NO_PROGRESS_LIMIT} plies without a flip or a capture`, () => {
    const board = emptyBoard();
    board[0][0] = revealed("r-r", "red", "chariot", 4);
    board[3][7] = revealed("b-r", "black", "chariot", 4);

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 100,
      nonProgressCount: BANQI_NO_PROGRESS_LIMIT - 1,
    };

    const next = applyMoveUnchecked(state, move([0, 0], [0, 1]));
    expect(next.nonProgressCount).toBe(BANQI_NO_PROGRESS_LIMIT);
    expect(next.isDraw).toBe(true);
    expect(isGameOver(next)).toBe(true);
    expect(getWinner(next)).toBeNull();
  });

  it("resets the no-progress counter and the repetition history on a flip or a capture", () => {
    const board = emptyBoard();
    board[0][0] = revealed("r-r", "red", "chariot", 4);
    board[0][1] = revealed("b-s", "black", "soldier", 1);
    board[3][7] = { id: "b-h", player: "black", type: "horse", rank: 3, isRevealed: false };

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 50,
      nonProgressCount: 40,
      positionHistory: ["a".repeat(32), "b".repeat(32)],
    };

    const afterCapture = applyMoveUnchecked(state, move([0, 0], [0, 1]));
    expect(afterCapture.nonProgressCount).toBe(0);
    expect(afterCapture.positionHistory).toBeUndefined();

    const blackToMove: BanqiState = { ...state, currentPlayer: "black" };
    const afterFlip = applyMoveUnchecked(blackToMove, { type: "flip", pos: { row: 3, col: 7 } });
    expect(afterFlip.nonProgressCount).toBe(0);
    expect(afterFlip.positionHistory).toBeUndefined();
  });

  it("terminates the red-soldier vs black-general endgame instead of running forever", () => {
    // 這正是回報裡「跑 500 手仍 isGameOver === false」的那個殘局：
    // 紅卒吃不到黑將以外的東西、黑將吃不了紅卒，雙方只能繞圈。
    const board = emptyBoard();
    board[0][0] = revealed("r-s", "red", "soldier", 1);
    board[3][7] = revealed("b-g", "black", "general", 7);

    let state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 0,
    };

    const rng = mulberry32(99);
    let plies = 0;
    while (!isGameOver(state) && plies < 500) {
      const legal = getLegalMoves(state);
      if (legal.length === 0) break;
      state = applyMoveUnchecked(state, legal[Math.floor(rng() * legal.length)]);
      plies++;
    }

    expect(plies).toBeLessThan(500);
    expect(isGameOver(state)).toBe(true);
    expect(state.isDraw).toBe(true);
  });

  it("keeps the stored repetition history bounded by the no-progress limit", () => {
    const board = emptyBoard();
    board[0][0] = revealed("r-r", "red", "chariot", 4);
    board[3][7] = revealed("b-r", "black", "chariot", 4);

    let state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 0,
      // 從「幾乎要到無進展上限」開始，確認歷史不會無限成長
      nonProgressCount: BANQI_NO_PROGRESS_LIMIT - 5,
    };

    // 一路向前走、不回頭，確保每個局面都是新的 —— 觸發的是無進展限招而不是三次重複
    const path: BanqiMove[] = [
      move([0, 0], [0, 1]),
      move([3, 7], [3, 6]),
      move([0, 1], [0, 2]),
      move([3, 6], [3, 5]),
      move([0, 2], [0, 3]),
    ];

    let plies = 0;
    while (!isGameOver(state) && plies < path.length) {
      state = applyMoveUnchecked(state, path[plies]);
      plies++;
    }

    expect(plies).toBe(5);
    expect(state.nonProgressCount).toBe(BANQI_NO_PROGRESS_LIMIT);
    expect(state.isDraw).toBe(true);
    expect((state.positionHistory ?? []).length).toBeLessThanOrEqual(BANQI_NO_PROGRESS_LIMIT + 1);
    // 存的是 32 字元雜湊，不是完整簽章字串（否則長局存檔會再次膨脹）
    for (const entry of state.positionHistory ?? []) {
      expect(entry).toMatch(/^[0-9a-f]{32}$/);
    }
  });
});
