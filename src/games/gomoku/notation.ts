import type { GomokuMove } from "./types";

const COL_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"
] as const;

export function toGomokuNotation(move: GomokuMove): string {
  const colLetter = COL_LETTERS[move.col] ?? "?";
  const rowNumber = 15 - move.row;
  return `${colLetter}${rowNumber}`;
}
