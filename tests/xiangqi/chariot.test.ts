import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Chariot Movement", () => {
  it("slides orthogonally across empty lines and captures enemy piece", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rc", "red", "chariot", 5, 4),
      createPiece("bp", "black", "soldier", 2, 4),
      createPiece("friendly", "red", "soldier", 5, 6),
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 5 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Upward: can move to 4,4 and 3,4 and capture 2,4; cannot continue past 2,4
    expect(dests).toContain("4,4");
    expect(dests).toContain("3,4");
    expect(dests).toContain("2,4");
    expect(dests).not.toContain("1,4");
    expect(dests).not.toContain("0,4");

    // Right: can move to 5,5; cannot capture or pass friendly piece at 5,6
    expect(dests).toContain("5,5");
    expect(dests).not.toContain("5,6");
    expect(dests).not.toContain("5,7");
  });
});
