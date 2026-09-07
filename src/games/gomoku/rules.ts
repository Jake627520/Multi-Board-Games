import { BOARD_SIZE, cloneBoard, inBounds } from "./board";
import type { GomokuMove, GomokuPlayer, GomokuState } from "./types";

const DIRECTIONS = [
  [0, 1],  // Horizontal
  [1, 0],  // Vertical
  [1, 1],  // Major diagonal (\)
  [1, -1], // Minor diagonal (/)
] as const;

export function checkWin(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1; // Count the stone placed at (row, col)

    // Forward direction
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    // Backward direction
    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

export function isGameOver(state: GomokuState): boolean {
  if (state.winner !== null || state.isDraw === true) {
    return true;
  }
  return getLegalMoves(state).length === 0;
}

export function getWinner(state: GomokuState): GomokuPlayer | null {
  return state.winner;
}

export function getLegalMoves(state: GomokuState): GomokuMove[] {
  if (state.winner !== null || state.isDraw === true) {
    return [];
  }

  const moves: GomokuMove[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c] === null) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

export function applyMoveUnchecked(
  state: GomokuState,
  move: GomokuMove
): GomokuState {
  const board = cloneBoard(state.board);
  const player = state.currentPlayer;
  board[move.row][move.col] = player;

  const hasWon = checkWin(board, move.row, move.col, player);
  const winner = hasWon ? player : null;

  // Check if board is full
  let hasEmpty = false;
  if (!hasWon) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          hasEmpty = true;
          break;
        }
      }
      if (hasEmpty) break;
    }
  }

  const isDraw = !hasWon && !hasEmpty;
  const nextPlayer: GomokuPlayer = player === "black" ? "white" : "black";

  return {
    board,
    currentPlayer: nextPlayer,
    winner,
    isDraw,
    moveNumber: state.moveNumber + 1,
  };
}

export function applyMove(
  state: GomokuState,
  move: GomokuMove
): GomokuState {
  if (isGameOver(state)) {
    throw new Error("Illegal move: game already finished");
  }

  if (!inBounds(move.row, move.col)) {
    throw new Error("Illegal move: out of bounds");
  }

  if (state.board[move.row][move.col] !== null) {
    throw new Error("Illegal move: intersection already occupied");
  }

  return applyMoveUnchecked(state, move);
}
