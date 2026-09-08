import { describe, it, expect } from "vitest";
import { createInitialState } from "../../src/games/gomoku/board";
import {
  applyMove,
  checkWin,
  getLegalMoves,
  isForbiddenMove,
} from "../../src/games/gomoku/rules";
import type { GomokuState } from "../../src/games/gomoku/types";

describe("Gomoku Forbidden Moves (Round 13)", () => {
  it("allows all moves under freestyle mode without forbidden constraints", () => {
    const state = createInitialState("freestyle");
    // Place stones such that Black creates an overline (6 stones)
    state.board[7][1] = "black";
    state.board[7][2] = "black";
    state.board[7][3] = "black";
    state.board[7][4] = "black";
    state.board[7][5] = "black";

    // Row 7, Col 6 would make 6 stones in a row
    expect(isForbiddenMove(state.board, 7, 6, "freestyle")).toBe(false);

    // Apply move in freestyle should succeed
    const next = applyMove(state, { row: 7, col: 6 });
    expect(next.winner).toBe("black");
  });

  it("detects overline (>= 6 stones) as forbidden for Black under forbidden_moves mode", () => {
    const state = createInitialState("forbidden_moves");
    // Place 5 stones in a row: (7, 1) to (7, 5)
    state.board[7][1] = "black";
    state.board[7][2] = "black";
    state.board[7][3] = "black";
    state.board[7][4] = "black";
    state.board[7][5] = "black";

    // (7, 6) makes 6 in a row (overline)
    expect(isForbiddenMove(state.board, 7, 6, "forbidden_moves")).toBe(true);

    // Should throw if Black attempts to apply this move
    expect(() => applyMove(state, { row: 7, col: 6 })).toThrow(
      "forbidden move for black"
    );

    // Should not be in legal moves
    const legalMoves = getLegalMoves(state);
    expect(legalMoves.some((m) => m.row === 7 && m.col === 6)).toBe(false);
  });

  it("detects double open three (三三) as forbidden for Black", () => {
    const state = createInitialState("forbidden_moves");
    // Setup intersection at (7, 7) forming two open threes:
    // Horizontal open three: (7, 6), (7, 7)*, (7, 8) with (7, 5) and (7, 9) empty
    // Vertical open three: (6, 7), (7, 7)*, (8, 7) with (5, 7) and (9, 7) empty
    state.board[7][6] = "black";
    state.board[7][8] = "black";
    state.board[6][7] = "black";
    state.board[8][7] = "black";

    expect(isForbiddenMove(state.board, 7, 7, "forbidden_moves")).toBe(true);
    expect(() => applyMove(state, { row: 7, col: 7 })).toThrow(
      "forbidden move for black"
    );
  });

  it("detects double four (四四) as forbidden for Black", () => {
    const state = createInitialState("forbidden_moves");
    // Setup intersection at (7, 7) forming two fours:
    // Horizontal four: (7, 4), (7, 5), (7, 6), (7, 7)*
    // Vertical four: (4, 7), (5, 7), (6, 7), (7, 7)*
    state.board[7][4] = "black";
    state.board[7][5] = "black";
    state.board[7][6] = "black";
    state.board[4][7] = "black";
    state.board[5][7] = "black";
    state.board[6][7] = "black";

    expect(isForbiddenMove(state.board, 7, 7, "forbidden_moves")).toBe(true);
    expect(() => applyMove(state, { row: 7, col: 7 })).toThrow(
      "forbidden move for black"
    );
  });

  it("gives five-in-a-row precedence over forbidden moves (成五不算禁手，直接獲勝)", () => {
    const state = createInitialState("forbidden_moves");
    // (7, 3), (7, 4), (7, 5), (7, 6) + (7, 7) makes exactly 5 (win)
    // At the same time, (5, 7), (6, 7), (8, 7) + (7, 7) makes an open three or four
    state.board[7][3] = "black";
    state.board[7][4] = "black";
    state.board[7][5] = "black";
    state.board[7][6] = "black";

    state.board[5][7] = "black";
    state.board[6][7] = "black";

    // Placing at (7, 7) completes 5 in a row horizontally
    expect(checkWin(state.board, 7, 7, "black")).toBe(false); // Before placing
    // With five-in-a-row precedence:
    expect(isForbiddenMove(state.board, 7, 7, "forbidden_moves")).toBe(false);

    const next = applyMove(state, { row: 7, col: 7 });
    expect(next.winner).toBe("black");
  });

  it("does not apply forbidden move rules to White", () => {
    let state: GomokuState = createInitialState("forbidden_moves");
    // Advance one move so currentPlayer is White
    state = applyMove(state, { row: 0, col: 0 }); // Black move
    expect(state.currentPlayer).toBe("white");

    // White creates overline (6 stones)
    state.board[7][1] = "white";
    state.board[7][2] = "white";
    state.board[7][3] = "white";
    state.board[7][4] = "white";
    state.board[7][5] = "white";

    // White placing at (7, 6) should be completely valid and win
    const next = applyMove(state, { row: 7, col: 6 });
    expect(next.winner).toBe("white");
  });
});
