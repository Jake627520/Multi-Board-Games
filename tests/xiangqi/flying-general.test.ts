import { describe, expect, it } from "vitest";
import { isInCheck } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Flying General (飛將) Detection", () => {
  it("detects flying general when generals share same file with no pieces between", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 4),
    ]);

    expect(isInCheck(s, "red")).toBe(true);
    expect(isInCheck(s, "black")).toBe(true);
  });

  it("does NOT detect flying general when at least one piece shields the file", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 4),
      createPiece("shield", "red", "soldier", 5, 4),
    ]);

    expect(isInCheck(s, "red")).toBe(false);
    expect(isInCheck(s, "black")).toBe(false);
  });
});
