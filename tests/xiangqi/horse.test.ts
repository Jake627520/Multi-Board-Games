import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Horse Movement", () => {
  it("allows 8 potential L-shaped jumps when completely unblocked", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rh", "red", "horse", 5, 4),
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 5 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toHaveLength(8);
    expect(dests).toEqual(
      expect.arrayContaining(["3,3", "3,5", "4,2", "4,6", "6,2", "6,6", "7,3", "7,5"])
    );
  });

  it("blocks moves in a direction when horse leg is occupied", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rh", "red", "horse", 5, 4),
      createPiece("block", "red", "soldier", 4, 4), // upward leg
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 5 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Upward targets (3,3) and (3,5) must be blocked
    expect(dests).not.toContain("3,3");
    expect(dests).not.toContain("3,5");
    // Lateral and downward remain open
    expect(dests).toContain("4,2");
    expect(dests).toContain("4,6");
    expect(dests).toContain("7,3");
    expect(dests).toContain("7,5");
  });
});
