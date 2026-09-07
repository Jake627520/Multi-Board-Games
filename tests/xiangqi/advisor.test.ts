import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Advisor Movement", () => {
  it("moves 1 step diagonally inside Palace", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("ra", "red", "advisor", 9, 3),
    ]);

    const moves = getLegalMoves(s, "red").filter(
      (m) => m.from.row === 9 && m.from.col === 3
    );
    expect(moves).toHaveLength(1);
    expect(moves[0].to).toEqual({ row: 8, col: 4 });
  });

  it("prohibits orthogonal or out-of-palace moves from palace center", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 5),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("ra", "red", "advisor", 8, 4), // center of palace
    ]);

    const moves = getLegalMoves(s, "red").filter(
      (m) => m.from.row === 8 && m.from.col === 4
    );
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("7,3");
    expect(dests).toContain("7,5");
    expect(dests).toContain("9,3");
    expect(dests).not.toContain("9,5"); // occupied by general
    expect(dests).not.toContain("8,3"); // orthogonal prohibited
    expect(dests).not.toContain("8,5"); // orthogonal prohibited
  });
});
