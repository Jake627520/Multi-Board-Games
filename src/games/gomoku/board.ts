import type { GomokuPlayer, GomokuRuleMode, GomokuState } from "./types";

export const BOARD_SIZE = 15;

export function createEmptyBoard(): (GomokuPlayer | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<GomokuPlayer | null>(BOARD_SIZE).fill(null)
  );
}

export function cloneBoard(
  board: (GomokuPlayer | null)[][]
): (GomokuPlayer | null)[][] {
  return board.map((row) => [...row]);
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function createInitialState(
  ruleMode: GomokuRuleMode = "freestyle"
): GomokuState {
  return {
    board: createEmptyBoard(),
    currentPlayer: "black",
    winner: null,
    isDraw: false,
    moveNumber: 1,
    ruleMode,
    winningLine: undefined,
  };
}
