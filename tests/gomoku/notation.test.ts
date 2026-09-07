import { describe, it, expect } from "vitest";
import { toGomokuNotation } from "../../src/games/gomoku/notation";

describe("Gomoku Move Notation", () => {
  it("converts center move (7, 7) to H8", () => {
    expect(toGomokuNotation({ row: 7, col: 7 })).toBe("H8");
  });

  it("converts board corners accurately", () => {
    // Top-left (row 0, col 0) -> A15
    expect(toGomokuNotation({ row: 0, col: 0 })).toBe("A15");
    // Bottom-right (row 14, col 14) -> O1
    expect(toGomokuNotation({ row: 14, col: 14 })).toBe("O1");
    // Top-right (row 0, col 14) -> O15
    expect(toGomokuNotation({ row: 0, col: 14 })).toBe("O15");
    // Bottom-left (row 14, col 0) -> A1
    expect(toGomokuNotation({ row: 14, col: 0 })).toBe("A1");
  });
});
