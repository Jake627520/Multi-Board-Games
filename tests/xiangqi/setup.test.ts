import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/games/xiangqi/setup";

describe("Xiangqi Initial Setup", () => {
  it("generates exactly 32 pieces with 16 red and 16 black", () => {
    const state = createInitialState();
    const pieces = state.board.flat().filter((p) => p !== null);

    expect(pieces).toHaveLength(32);
    expect(pieces.filter((p) => p.player === "red")).toHaveLength(16);
    expect(pieces.filter((p) => p.player === "black")).toHaveLength(16);
    expect(state.currentPlayer).toBe("red");
    expect(state.winner).toBeNull();
    expect(state.moveNumber).toBe(1);
  });

  it("places key pieces at official initial coordinates", () => {
    const state = createInitialState();

    // Generals
    expect(state.board[9][4]?.type).toBe("general");
    expect(state.board[9][4]?.player).toBe("red");
    expect(state.board[0][4]?.type).toBe("general");
    expect(state.board[0][4]?.player).toBe("black");

    // Cannons
    expect(state.board[7][1]?.type).toBe("cannon");
    expect(state.board[7][7]?.type).toBe("cannon");
    expect(state.board[2][1]?.type).toBe("cannon");
    expect(state.board[2][7]?.type).toBe("cannon");

    // Soldiers
    for (const col of [0, 2, 4, 6, 8]) {
      expect(state.board[6][col]?.type).toBe("soldier");
      expect(state.board[6][col]?.player).toBe("red");
      expect(state.board[3][col]?.type).toBe("soldier");
      expect(state.board[3][col]?.player).toBe("black");
    }
  });
});
