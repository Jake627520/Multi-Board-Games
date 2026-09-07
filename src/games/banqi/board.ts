import type { PieceType } from "../xiangqi/types";
import type { BanqiPiece, BanqiPlayer } from "./types";

export const ROWS = 4;
export const COLS = 8;

export const PIECE_RANKS: Record<PieceType, number> = {
  general: 7,
  advisor: 6,
  elephant: 5,
  chariot: 4,
  horse: 3,
  cannon: 2,
  soldier: 1,
};

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function emptyBoard(): (BanqiPiece | null)[][] {
  return Array.from({ length: ROWS }, () => Array<BanqiPiece | null>(COLS).fill(null));
}

export function cloneBoard(board: (BanqiPiece | null)[][]): (BanqiPiece | null)[][] {
  return board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
}

export function generateAllPieces(): BanqiPiece[] {
  const pieces: BanqiPiece[] = [];
  const sides: BanqiPlayer[] = ["red", "black"];
  let idCount = 1;

  const typeCounts: [PieceType, number][] = [
    ["general", 1],
    ["advisor", 2],
    ["elephant", 2],
    ["chariot", 2],
    ["horse", 2],
    ["cannon", 2],
    ["soldier", 5],
  ];

  for (const player of sides) {
    for (const [type, count] of typeCounts) {
      for (let i = 0; i < count; i++) {
        pieces.push({
          id: `${player}-${type}-${idCount++}`,
          player,
          type,
          rank: PIECE_RANKS[type],
          isRevealed: false,
        });
      }
    }
  }

  return pieces;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialBoard(): (BanqiPiece | null)[][] {
  const pieces = shuffle(generateAllPieces());
  const board = emptyBoard();

  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r][c] = pieces[idx++];
    }
  }

  return board;
}
