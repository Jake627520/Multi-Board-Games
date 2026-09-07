import { emptyBoard } from "./board";
import type { Piece, PieceType, XiangqiState } from "./types";

let nextId = 1;

function add(
  board: (Piece | null)[][],
  player: "red" | "black",
  type: PieceType,
  row: number,
  col: number
) {
  const piece: Piece = {
    id: `${player}-${type}-${nextId++}`,
    player,
    type,
    position: { row, col },
  };
  board[row][col] = piece;
}

export function createInitialState(): XiangqiState {
  nextId = 1;
  const board = emptyBoard();
  const back: PieceType[] = [
    "chariot", "horse", "elephant", "advisor", "general",
    "advisor", "elephant", "horse", "chariot",
  ];

  for (let col = 0; col < 9; col++) {
    add(board, "black", back[col], 0, col);
    add(board, "red", back[col], 9, col);
  }

  for (const col of [1, 7]) {
    add(board, "black", "cannon", 2, col);
    add(board, "red", "cannon", 7, col);
  }

  for (const col of [0, 2, 4, 6, 8]) {
    add(board, "black", "soldier", 3, col);
    add(board, "red", "soldier", 6, col);
  }

  return { board, currentPlayer: "red", winner: null, moveNumber: 1 };
}