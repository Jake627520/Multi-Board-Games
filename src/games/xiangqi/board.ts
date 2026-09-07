import type { Piece, XiangqiState } from "./types";

export const ROWS = 10;
export const COLS = 9;

export function emptyBoard(): (Piece | null)[][] {
  return Array.from({ length: ROWS }, () => Array<Piece | null>(COLS).fill(null));
}

export function cloneBoard(board: (Piece | null)[][]) {
  return board.map((row) => [...row]);
}

export function inBounds(row: number, col: number) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function pieceAt(state: XiangqiState, row: number, col: number) {
  return inBounds(row, col) ? state.board[row][col] : null;
}

export function isPalace(player: "red" | "black", row: number, col: number) {
  if (col < 3 || col > 5) return false;
  return player === "red" ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
}

export function crossedRiver(player: "red" | "black", row: number) {
  return player === "red" ? row <= 4 : row >= 5;
}