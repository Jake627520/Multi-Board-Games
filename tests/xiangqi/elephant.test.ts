import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Elephant Movement", () => {
  it("moves 2 steps diagonally on own side of river", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("re", "red", "elephant", 9, 2),
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 9 && m.from.col === 2);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("7,0");
    expect(dests).toContain("7,4");
  });

  it("blocks move when elephant eye is occupied", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("re", "red", "elephant", 9, 2),
      createPiece("block", "red", "soldier", 8, 3), // blocks diagonal to (7,4)
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 9 && m.from.col === 2);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("7,0");
    expect(dests).not.toContain("7,4");
  });

  it("prohibits elephant from crossing the river", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("re", "red", "elephant", 5, 2), // at riverbank
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 5 && m.from.col === 2);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Cannot cross to row 3
    expect(dests).not.toContain("3,0");
    expect(dests).not.toContain("3,4");
    // Can move backward on own side
    expect(dests).toContain("7,0");
    expect(dests).toContain("7,4");
  });
});
