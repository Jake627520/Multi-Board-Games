import { describe, expect, it } from "vitest";
import { BOARD_SIZE, createEmptyBoard, inBounds } from "../../src/games/gomoku/board";

describe("Gomoku Board Grid & Bounds", () => {
  it("defines standard 15x15 board dimensions", () => {
    expect(BOARD_SIZE).toBe(15);
  });

  it("creates an empty 15x15 board with 225 null intersections", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(15);
    for (const row of board) {
      expect(row).toHaveLength(15);
      expect(row.every((cell) => cell === null)).toBe(true);
    }
  });

  it("identifies in-bounds and out-of-bounds coordinates", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(14, 14)).toBe(true);
    expect(inBounds(7, 7)).toBe(true);

    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(15, 7)).toBe(false);
    expect(inBounds(7, 15)).toBe(false);
  });
});
