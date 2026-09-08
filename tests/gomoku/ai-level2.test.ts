import { describe, it, expect } from "vitest";
import { createInitialState } from "../../src/games/gomoku/board";
import { createGomokuAiLevel2 } from "../../src/games/gomoku/ai";
import { getLegalMoves } from "../../src/games/gomoku/rules";

describe("Gomoku AI Level 2 (Minimax) (Round 13)", () => {
  it("plays center (7, 7) on empty board", async () => {
    const ai = createGomokuAiLevel2();
    const state = createInitialState("freestyle");
    const legalMoves = getLegalMoves(state);

    const move = await ai.selectMove(state, legalMoves);
    expect(move).toEqual({ row: 7, col: 7 });
  });

  it("takes immediate winning move when 4 stones are aligned", async () => {
    const ai = createGomokuAiLevel2();
    const state = createInitialState("freestyle");

    // White has 4 stones in a row
    state.board[7][3] = "white";
    state.board[7][4] = "white";
    state.board[7][5] = "white";
    state.board[7][6] = "white";

    // Set currentPlayer to white
    (state as any).currentPlayer = "white";

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // AI should choose either (7, 2) or (7, 7) to win
    const isWin =
      (move.row === 7 && move.col === 2) || (move.row === 7 && move.col === 7);
    expect(isWin).toBe(true);
  });

  it("blocks opponent's immediate winning move", async () => {
    const ai = createGomokuAiLevel2();
    const state = createInitialState("freestyle");

    // Opponent (black) has 4 stones in a row: (7, 3), (7, 4), (7, 5), (7, 6)
    state.board[7][3] = "black";
    state.board[7][4] = "black";
    state.board[7][5] = "black";
    state.board[7][6] = "black";

    // AI is white
    (state as any).currentPlayer = "white";

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // AI must block at (7, 2) or (7, 7)
    const blocksThreat =
      (move.row === 7 && move.col === 2) || (move.row === 7 && move.col === 7);
    expect(blocksThreat).toBe(true);
  });

  it("completes search within acceptable latency (< 500ms)", async () => {
    const ai = createGomokuAiLevel2();
    const state = createInitialState("freestyle");

    // Several stones on board
    state.board[7][7] = "black";
    state.board[7][8] = "white";
    state.board[8][7] = "black";
    state.board[6][8] = "white";

    const legalMoves = getLegalMoves(state);

    const start = performance.now();
    const move = await ai.selectMove(state, legalMoves);
    const duration = performance.now() - start;

    expect(move).toBeDefined();
    expect(duration).toBeLessThan(500); // Fast enough for smooth browser play
  });
});
