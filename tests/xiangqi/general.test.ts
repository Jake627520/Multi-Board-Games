import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("General Movement", () => {
  it("allows 1 step orthogonal moves within Palace", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 8, 4),
      createPiece("bg", "black", "general", 0, 0), // column 0 avoids flying general on files 3, 4, 5
    ]);

    const moves = getLegalMoves(s, "red");
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("7,4");
    expect(dests).toContain("9,4");
    expect(dests).toContain("8,3");
    expect(dests).toContain("8,5");
    expect(dests).toHaveLength(4);
  });

  it("prohibits General from stepping outside Palace", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 7, 3), // corner of red palace
      createPiece("bg", "black", "general", 0, 5),
    ]);

    const moves = getLegalMoves(s, "red");
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Cannot step up (row 6) or left (col 2)
    expect(dests).not.toContain("6,3");
    expect(dests).not.toContain("7,2");
    expect(dests).toContain("8,3");
    expect(dests).toContain("7,4");
  });
});
