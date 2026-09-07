import { describe, expect, it } from "vitest";
import { isInCheck } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Xiangqi Check Detection", () => {
  it("detects check delivered by an open file chariot", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bc", "black", "chariot", 2, 4),
    ]);

    expect(isInCheck(s, "red")).toBe(true);
    expect(isInCheck(s, "black")).toBe(false);
  });

  it("detects check delivered by an unblocked horse", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bh", "black", "horse", 7, 3), // attacks (9,4) via (8,3)
    ]);

    expect(isInCheck(s, "red")).toBe(true);
  });

  it("detects check delivered by a cannon over exactly one screen", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bcn", "black", "cannon", 2, 4),
      createPiece("screen", "red", "advisor", 8, 4), // 1 screen
    ]);

    expect(isInCheck(s, "red")).toBe(true);
  });

  it("does NOT detect check from cannon if 0 or 2 screens exist", () => {
    // 0 screens
    const s0 = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bcn", "black", "cannon", 2, 4),
    ]);
    expect(isInCheck(s0, "red")).toBe(false);

    // 2 screens
    const s2 = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bcn", "black", "cannon", 2, 4),
      createPiece("s1", "red", "advisor", 8, 4),
      createPiece("s2", "black", "soldier", 5, 4),
    ]);
    expect(isInCheck(s2, "red")).toBe(false);
  });
});
