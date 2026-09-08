import { describe, it, expect } from "vitest";
import { createInitialState } from "../../src/games/gomoku/board";
import { applyMove, findWinningLine } from "../../src/games/gomoku/rules";

describe("Gomoku Winning Line Detection (Round 13)", () => {
  it("detects horizontal winning line coordinates", () => {
    const state = createInitialState("freestyle");
    // Place 4 stones horizontally
    state.board[7][3] = "black";
    state.board[7][4] = "black";
    state.board[7][5] = "black";
    state.board[7][6] = "black";

    const next = applyMove(state, { row: 7, col: 7 });
    expect(next.winner).toBe("black");
    expect(next.winningLine).toBeDefined();
    expect(next.winningLine).toHaveLength(5);
    expect(next.winningLine).toEqual([
      { row: 7, col: 3 },
      { row: 7, col: 4 },
      { row: 7, col: 5 },
      { row: 7, col: 6 },
      { row: 7, col: 7 },
    ]);
  });

  it("detects vertical winning line coordinates", () => {
    const state = createInitialState("freestyle");
    state.board[2][5] = "white";
    state.board[3][5] = "white";
    state.board[4][5] = "white";
    state.board[5][5] = "white";

    const line = findWinningLine(state.board, 6, 5, "white");
    expect(line).toBeNull(); // not yet on board

    state.board[6][5] = "white";
    const winning = findWinningLine(state.board, 6, 5, "white");
    expect(winning).toHaveLength(5);
    expect(winning).toEqual([
      { row: 2, col: 5 },
      { row: 3, col: 5 },
      { row: 4, col: 5 },
      { row: 5, col: 5 },
      { row: 6, col: 5 },
    ]);
  });

  it("detects diagonal winning line coordinates", () => {
    const state = createInitialState("freestyle");
    state.board[3][3] = "black";
    state.board[4][4] = "black";
    state.board[5][5] = "black";
    state.board[6][6] = "black";

    const next = applyMove(state, { row: 7, col: 7 });
    expect(next.winner).toBe("black");
    expect(next.winningLine).toEqual([
      { row: 3, col: 3 },
      { row: 4, col: 4 },
      { row: 5, col: 5 },
      { row: 6, col: 6 },
      { row: 7, col: 7 },
    ]);
  });

  it("returns undefined winningLine for ongoing moves", () => {
    const state = createInitialState("freestyle");
    const next = applyMove(state, { row: 7, col: 7 });
    expect(next.winner).toBeNull();
    expect(next.winningLine).toBeUndefined();
  });
});
