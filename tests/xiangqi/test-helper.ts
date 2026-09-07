import type { Piece, PieceType, XiangqiState } from "../../src/games/xiangqi/types";
import type { Player } from "../../src/core/game/types";

export function createPiece(
  id: string,
  player: Player,
  type: PieceType,
  row: number,
  col: number
): Piece {
  return { id, player, type, position: { row, col } };
}

export function buildState(
  pieces: Piece[],
  currentPlayer: Player = "red",
  winner: Player | null = null,
  moveNumber = 1
): XiangqiState {
  const board = Array.from({ length: 10 }, () => Array<Piece | null>(9).fill(null));
  for (const p of pieces) {
    board[p.position.row][p.position.col] = p;
  }
  return { board, currentPlayer, winner, moveNumber };
}
