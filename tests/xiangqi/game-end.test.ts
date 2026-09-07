import { describe, expect, it } from "vitest";
import { getLegalMoves, getWinner, isGameOver } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Xiangqi Game End & Winner Determination", () => {
  it("identifies checkmate when player is in check with 0 legal moves", () => {
    // Red general trapped in corner with no escape and under direct attack
    // Red General at (9,3). Black Chariots at (9,0) and (8,0). Black General at (0,5).
    // Red general cannot move to (8,3) because of chariot on rank 8. Cannot stay on rank 9.
    const s = buildState(
      [
        createPiece("rg", "red", "general", 9, 3),
        createPiece("bg", "black", "general", 0, 5),
        createPiece("bc1", "black", "chariot", 9, 0), // attacks rank 9
        createPiece("bc2", "black", "chariot", 8, 0), // attacks rank 8
      ],
      "red"
    );

    expect(getLegalMoves(s, "red")).toHaveLength(0);
    expect(isGameOver(s)).toBe(true);
    expect(getWinner(s)).toBe("black");
  });

  it("identifies stalemate (困斃) when player is NOT in check but has 0 legal moves, awarding win to opponent", () => {
    // Stalemate setup:
    // Red General at (9,4), not attacked.
    // Surrounded by friendly soldiers or blocked by enemy control:
    // Suppose Red General is at (9,3).
    // Black Chariot at (8,0) covers rank 8 (so (8,3) is covered).
    // Red soldier at (9,4) blocks move to (9,4), and soldier at (9,4) cannot move because it's facing backward or pinned.
    // Or Red General at (9,4):
    // Black chariot at (8,0) covers (8,4).
    // Black chariot at (0,3) covers col 3 (preventing (9,3)).
    // Black chariot at (0,5) covers col 5 (preventing (9,5)).
    // General is at (9,4). Rank 9 is NOT attacked (chariots are at col 3 and col 5, and rank 8).
    // So General is NOT in check at (9,4)!
    // But any move to (8,4), (9,3), (9,5) walks into check!
    // Red has 0 legal moves. Red is NOT in check.
    const s = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 0),
        createPiece("bc_left", "black", "chariot", 1, 3),  // controls col 3
        createPiece("bc_right", "black", "chariot", 1, 5), // controls col 5
        createPiece("bc_rank8", "black", "chariot", 8, 1), // controls rank 8
      ],
      "red"
    );

    // Red general at (9,4) is NOT in check
    // Legal destinations: (8,4) attacked by bc_rank8; (9,3) attacked by bc_left; (9,5) attacked by bc_right.
    expect(getLegalMoves(s, "red")).toHaveLength(0);
    expect(isGameOver(s)).toBe(true);
    // In Chinese Chess, Stalemate is a LOSS for the immobilized player (Red), so winner is Black!
    expect(getWinner(s)).toBe("black");
  });

  it("returns isGameOver: false and getWinner: null when legal moves exist", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
    ]);

    expect(getLegalMoves(s, "red").length).toBeGreaterThan(0);
    expect(isGameOver(s)).toBe(false);
    expect(getWinner(s)).toBeNull();
  });
});
