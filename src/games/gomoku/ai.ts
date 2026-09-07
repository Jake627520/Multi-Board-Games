import type { AiPlayer } from "../../core/ai/types";
import { BOARD_SIZE, inBounds } from "./board";
import { checkWin } from "./rules";
import type { GomokuMove, GomokuPlayer, GomokuState } from "./types";

const DIRECTIONS = [
  [0, 1],  // Horizontal
  [1, 0],  // Vertical
  [1, 1],  // Major diagonal (\)
  [1, -1], // Minor diagonal (/)
] as const;

function evaluateMoveScore(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): number {
  const opponent: GomokuPlayer = player === "black" ? "white" : "black";

  // 1. Can we win immediately?
  if (checkWin(board, row, col, player)) {
    return 100_000;
  }

  // 2. Can the opponent win immediately here? Must block!
  if (checkWin(board, row, col, opponent)) {
    return 50_000;
  }

  let totalScore = 0;

  // 3. Count consecutive alignments and open ends
  for (const [dr, dc] of DIRECTIONS) {
    // Check own potential line
    let ownCount = 1;
    let ownOpenEnds = 0;

    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      ownCount++;
      r += dr;
      c += dc;
    }
    if (inBounds(r, c) && board[r][c] === null) {
      ownOpenEnds++;
    }

    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      ownCount++;
      r -= dr;
      c -= dc;
    }
    if (inBounds(r, c) && board[r][c] === null) {
      ownOpenEnds++;
    }

    if (ownCount >= 4 && ownOpenEnds > 0) totalScore += 10_000;
    else if (ownCount === 3 && ownOpenEnds === 2) totalScore += 3_000;
    else if (ownCount === 3 && ownOpenEnds === 1) totalScore += 500;
    else if (ownCount === 2 && ownOpenEnds === 2) totalScore += 200;

    // Check opponent potential line to block
    let oppCount = 1;
    let oppOpenEnds = 0;

    r = row + dr;
    c = col + dc;
    while (inBounds(r, c) && board[r][c] === opponent) {
      oppCount++;
      r += dr;
      c += dc;
    }
    if (inBounds(r, c) && board[r][c] === null) {
      oppOpenEnds++;
    }

    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === opponent) {
      oppCount++;
      r -= dr;
      c -= dc;
    }
    if (inBounds(r, c) && board[r][c] === null) {
      oppOpenEnds++;
    }

    if (oppCount >= 4 && oppOpenEnds > 0) totalScore += 8_000;
    else if (oppCount === 3 && oppOpenEnds === 2) totalScore += 2_500;
    else if (oppCount === 3 && oppOpenEnds === 1) totalScore += 400;
  }

  // 4. Center proximity bonus (center is 7, 7)
  const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
  totalScore += Math.max(0, 20 - centerDistance);

  return totalScore;
}

export class GomokuAiLevel1 implements AiPlayer<GomokuState, GomokuMove> {
  readonly id = "gomoku-ai-l1";
  readonly name = "Gomoku AI (Level 1 - Heuristic)";

  async selectMove(
    state: GomokuState,
    legalMoves: GomokuMove[]
  ): Promise<GomokuMove> {
    if (!legalMoves || legalMoves.length === 0) {
      throw new Error("No legal moves available");
    }

    const player = state.currentPlayer;
    let bestMove = legalMoves[0];
    let highestScore = -Infinity;

    for (const move of legalMoves) {
      const score = evaluateMoveScore(state.board, move.row, move.col, player);
      if (score > highestScore) {
        highestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}

export function createGomokuAiLevel1(): GomokuAiLevel1 {
  return new GomokuAiLevel1();
}
