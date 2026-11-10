import { describe, it, expect, vi } from "vitest";
import { createXiangqiAiLevel2 } from "../../src/games/xiangqi/ai";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { buildState, createPiece } from "./test-helper";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import * as xiangqiRules from "../../src/games/xiangqi/rules";

describe("Xiangqi AI Level 2 (Minimax)", () => {
  const ai = createXiangqiAiLevel2();
  const engine = createXiangqiEngine();

  it("should have correct id and name metadata", () => {
    expect(ai.id).toBe("xiangqi-ai-l2");
    expect(ai.name).toContain("Level 2");
  });

  it("should select a strictly legal move from initial opening", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = getLegalMoves(initialState);

    const move = await ai.selectMove(initialState, legalMoves);
    const isLegal = legalMoves.some(
      (m) =>
        m.from.row === move.from.row &&
        m.from.col === move.from.col &&
        m.to.row === move.to.row &&
        m.to.col === move.to.col
    );

    expect(isLegal).toBe(true);
  });

  it("should select an immediate checkmate when available", async () => {
    // Red turn.
    // Black General trapped at corner (0, 3).
    // Red General at (9, 4) prevents Black General from moving to (0, 4) (flying general).
    // Red Chariot 1 at (1, 0) covers rank 1, preventing Black General from stepping to (1, 3).
    // Red Chariot 2 at (2, 8) can move to (0, 8) -> rank 0 is attacked, directly delivering checkmate!
    const state = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 3),
        createPiece("rc1", "red", "chariot", 1, 0),
        createPiece("rc2", "red", "chariot", 2, 8),
      ],
      "red"
    );

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // Must deliver checkmate by moving Chariot 2 to (0, 8)
    expect(move.from).toEqual({ row: 2, col: 8 });
    expect(move.to).toEqual({ row: 0, col: 8 });
  });

  it("should resolve check or capture checking piece to prevent checkmate", async () => {
    // Red King at (9, 4), Black King at (0, 3).
    // Black Chariot at (0, 4) checks Red King along column 4.
    // Red has a Chariot at (0, 0) which can capture the checking Black Chariot at (0, 4).
    // Red King cannot simply stay in check.
    const state = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 3),
        createPiece("bc", "black", "chariot", 5, 4), // checks Red King along col 4
        createPiece("rc", "red", "chariot", 5, 0),   // can capture Black Chariot at (5, 4)
      ],
      "red"
    );

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // AI should eliminate the checking threat by capturing the Chariot
    expect(move.to).toEqual({ row: 5, col: 4 });
  });

  it("should keep depth-2 search within a fixed position budget", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = getLegalMoves(initialState);

    // Wall-clock is not a stable signal: the same opening search was measured
    // at 347ms and 556ms on one machine, so a 500ms cutoff flakes under load.
    // Counting applyMoveUnchecked calls is deterministic and still catches the
    // regression this test exists for — extra position generation from lost
    // alpha-beta cutoffs, or from recomputing moves inside the sort comparator.
    let positions = 0;
    const originalApply = xiangqiRules.applyMoveUnchecked;
    const spy = vi.spyOn(xiangqiRules, "applyMoveUnchecked").mockImplementation((state, move) => {
      positions += 1;
      return originalApply(state, move);
    });

    try {
      const move = await ai.selectMove(initialState, legalMoves);
      const isLegal = legalMoves.some(
        (m) =>
          m.from.row === move.from.row &&
          m.from.col === move.from.col &&
          m.to.row === move.to.row &&
          m.to.col === move.to.col
      );
      expect(isLegal).toBe(true);
      // The opening search generates 2132 positions on Node 20 and Node 22.
      // That measured cost is the ceiling: a cheaper search still passes,
      // and a spy that fails to see the search stays at 0 and fails.
      expect(positions).toBeGreaterThan(0);
      expect(positions).toBeLessThanOrEqual(2132);
    } finally {
      spy.mockRestore();
    }
  });
});
