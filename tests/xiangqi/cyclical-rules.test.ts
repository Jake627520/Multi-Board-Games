import { describe, expect, it } from "vitest";
import { applyMove, getWinner, isGameOver } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Xiangqi Cyclical & Adjudication Rules", () => {
  it("detects threefold repetition when an identical position occurs 3 times without check", () => {
    // Both sides make quiet non-checking reversible moves:
    // Red chariot at (6, 0) <-> (5, 0)
    // Black chariot at (3, 8) <-> (4, 8)
    // Red general at (9, 4), Black general at (0, 4), shielded by soldier at (5, 4)
    let s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 4),
      createPiece("shield", "red", "soldier", 5, 4),
      createPiece("rc", "red", "chariot", 6, 0),
      createPiece("bc", "black", "chariot", 3, 8),
    ]);

    // Round 1:
    s = applyMove(s, { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } }); // Red move 1
    s = applyMove(s, { from: { row: 3, col: 8 }, to: { row: 4, col: 8 } }); // Black move 1
    s = applyMove(s, { from: { row: 5, col: 0 }, to: { row: 6, col: 0 } }); // Red returns (2nd occurrence of initial)
    s = applyMove(s, { from: { row: 4, col: 8 }, to: { row: 3, col: 8 } }); // Black returns

    expect(isGameOver(s)).toBe(false);

    // Round 2:
    s = applyMove(s, { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
    s = applyMove(s, { from: { row: 3, col: 8 }, to: { row: 4, col: 8 } });
    s = applyMove(s, { from: { row: 5, col: 0 }, to: { row: 6, col: 0 } });
    s = applyMove(s, { from: { row: 4, col: 8 }, to: { row: 3, col: 8 } }); // 3rd occurrence!

    expect(isGameOver(s)).toBe(true);
    expect(s.isDraw).toBe(true);
    expect(getWinner(s)).toBeNull();
    expect(s.terminationReason).toBe("threefold_repetition");
  });

  it("penalizes perpetual check (長將判負) by awarding win to the checked opponent", () => {
    // Red chariot checks continuously on rank 9 while moving between (9,0) and (8,0).
    // Setup:
    // Red general at (9,5), Black general at (0,3).
    // Red chariot at (9,0) directly attacks Red rank? No, attack Black General along file or rank:
    // Black general is at (0,3).
    // Red chariot at (0,0) checks Black general at (0,3) along rank 0!
    // Black advisor at (0,4).
    // Black general moves to (1,3).
    // Red chariot moves to (1,0) checking Black general at (1,3) along rank 1!
    // Black general moves back to (0,3).
    // Red chariot moves back to (0,0) checking Black general at (0,3)!
    // Red is checking on EVERY move! When the position repeats, Red is guilty of Perpetual Check!
    let s = buildState([
      createPiece("rg", "red", "general", 9, 5),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("rc", "red", "chariot", 2, 0),
    ]);

    // Red step 1: (2,0) -> (0,0) delivering check to (0,3)
    s = applyMove(s, { from: { row: 2, col: 0 }, to: { row: 0, col: 0 } }); // Checks black general
    // Black escapes: (0,3) -> (1,3)
    s = applyMove(s, { from: { row: 0, col: 3 }, to: { row: 1, col: 3 } });
    // Red step 2: (0,0) -> (1,0) delivering check to (1,3)
    s = applyMove(s, { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }); // Checks black general
    // Black returns: (1,3) -> (0,3)
    s = applyMove(s, { from: { row: 1, col: 3 }, to: { row: 0, col: 3 } });
    // Red step 3: (1,0) -> (0,0) delivering check to (0,3) -> identical position recurs!
    s = applyMove(s, { from: { row: 1, col: 0 }, to: { row: 0, col: 0 } });

    // In Chinese Chess, single-sided perpetual check results in immediate forfeiture for Red:
    expect(isGameOver(s)).toBe(true);
    expect(getWinner(s)).toBe("black");
    expect(s.terminationReason).toBe("perpetual_check");
  });

  it("declares draw after 120 non-capture half-moves (60 full rounds / 自然限招)", () => {
    const s = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 4),
        createPiece("shield", "red", "soldier", 5, 4),
      ],
      "red",
      null,
      121
    );

    // Create state simulating nonCaptureCount = 119
    const simulatedState = {
      ...s,
      nonCaptureCount: 119,
    };

    // Make 120th non-capture move: soldier forward (5,4) -> (4,4)
    const next = applyMove(simulatedState, {
      from: { row: 5, col: 4 },
      to: { row: 4, col: 4 },
    });

    expect(isGameOver(next)).toBe(true);
    expect(next.isDraw).toBe(true);
    expect(getWinner(next)).toBeNull();
    expect(next.terminationReason).toBe("sixty_move_draw");
  });
});
