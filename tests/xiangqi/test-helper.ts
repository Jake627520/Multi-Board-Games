import type { Piece, PieceType, XiangqiPlayer, XiangqiState } from "../../src/games/xiangqi/types";

export function createPiece(
  id: string,
  player: XiangqiPlayer,
  type: PieceType,
  row: number,
  col: number
): Piece {
  return { id, player, type, position: { row, col } };
}

export function buildState(
  pieces: Piece[],
  currentPlayer: XiangqiPlayer = "red",
  winner: XiangqiPlayer | null = null,
  moveNumber = 1
): XiangqiState {
  const board = Array.from({ length: 10 }, () => Array<Piece | null>(9).fill(null));
  for (const p of pieces) {
    board[p.position.row][p.position.col] = p;
  }
  return { board, currentPlayer, winner, moveNumber };
}
