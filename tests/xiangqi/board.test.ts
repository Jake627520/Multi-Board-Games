import { describe, expect, it } from "vitest";
import { crossedRiver, inBounds, isPalace, ROWS, COLS } from "../../src/games/xiangqi/board";

describe("Xiangqi Board Grid & Bounds", () => {
  it("defines standard 9x10 dimensions", () => {
    expect(ROWS).toBe(10);
    expect(COLS).toBe(9);
  });

  it("identifies valid in-bounds intersections", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(9, 8)).toBe(true);
    expect(inBounds(5, 4)).toBe(true);
  });

  it("rejects out-of-bounds intersections", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(10, 4)).toBe(false);
    expect(inBounds(5, 9)).toBe(false);
  });

  it("identifies Red and Black palaces correctly", () => {
    // Red Palace: row 7..9, col 3..5
    expect(isPalace("red", 7, 3)).toBe(true);
    expect(isPalace("red", 8, 4)).toBe(true);
    expect(isPalace("red", 9, 5)).toBe(true);
    expect(isPalace("red", 6, 4)).toBe(false);
    expect(isPalace("red", 8, 2)).toBe(false);

    // Black Palace: row 0..2, col 3..5
    expect(isPalace("black", 0, 3)).toBe(true);
    expect(isPalace("black", 1, 4)).toBe(true);
    expect(isPalace("black", 2, 5)).toBe(true);
    expect(isPalace("black", 3, 4)).toBe(false);
    expect(isPalace("black", 1, 6)).toBe(false);
  });

  it("evaluates river crossings accurately", () => {
    // Red crossed river when row <= 4
    expect(crossedRiver("red", 5)).toBe(false);
    expect(crossedRiver("red", 4)).toBe(true);
    expect(crossedRiver("red", 0)).toBe(true);

    // Black crossed river when row >= 5
    expect(crossedRiver("black", 4)).toBe(false);
    expect(crossedRiver("black", 5)).toBe(true);
    expect(crossedRiver("black", 9)).toBe(true);
  });
});
