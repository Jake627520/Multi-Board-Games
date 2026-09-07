import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Soldier Movement", () => {
  it("moves only forward before crossing the river (Red)", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rs", "red", "soldier", 6, 4), // before river
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 6 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toEqual(["5,4"]);
    expect(dests).not.toContain("6,3");
    expect(dests).not.toContain("6,5");
  });

  it("can move forward, left, and right after crossing the river, never backward", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rs", "red", "soldier", 4, 4), // across river in black side
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 4 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toHaveLength(3);
    expect(dests).toContain("3,4"); // forward
    expect(dests).toContain("4,3"); // left
    expect(dests).toContain("4,5"); // right
    expect(dests).not.toContain("5,4"); // backward strictly forbidden
  });

  it("handles Black Soldier moving downward and laterally after crossing river", () => {
    const s = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 3),
        createPiece("bs", "black", "soldier", 5, 2), // crossed into red territory
      ],
      "black"
    );

    const moves = getLegalMoves(s, "black").filter((m) => m.from.row === 5 && m.from.col === 2);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("6,2"); // forward for black
    expect(dests).toContain("5,1"); // left
    expect(dests).toContain("5,3"); // right
    expect(dests).not.toContain("4,2"); // backward for black forbidden
  });
});
