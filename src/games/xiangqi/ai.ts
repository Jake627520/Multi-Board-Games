import type { AiPlayer } from "../../core/ai/types";
import { crossedRiver } from "./board";
import { applyMoveUnchecked, isInCheck } from "./rules";
import type { Piece, PieceType, XiangqiMove, XiangqiPlayer, XiangqiState } from "./types";

const PIECE_VALUES: Record<PieceType, number> = {
  general: 10_000,
  chariot: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 100,
};

function getPieceValue(piece: Piece): number {
  let val = PIECE_VALUES[piece.type];
  if (piece.type === "soldier" && crossedRiver(piece.player, piece.position.row)) {
    val += 100; // Passed pawn bonus
  }
  return val;
}

function evaluateBoardMaterial(state: XiangqiState, aiPlayer: XiangqiPlayer): number {
  let score = 0;
  for (const row of state.board) {
    for (const piece of row) {
      if (!piece) continue;
      const val = getPieceValue(piece);
      if (piece.player === aiPlayer) {
        score += val;
      } else {
        score -= val;
      }
    }
  }
  return score;
}

function evaluateMoveScore(
  state: XiangqiState,
  move: XiangqiMove,
  aiPlayer: XiangqiPlayer
): number {
  const targetPiece = state.board[move.to.row][move.to.col];
  const movingPiece = state.board[move.from.row][move.from.col];
  let score = 0;

  // 1. Capture reward
  if (targetPiece) {
    score += getPieceValue(targetPiece) * 10;
  }

  // 2. Next state evaluation
  const nextState = applyMoveUnchecked(state, move);
  const opponent: XiangqiPlayer = aiPlayer === "red" ? "black" : "red";

  // Checking opponent is rewarded
  if (isInCheck(nextState, opponent)) {
    score += 50;
  }

  // Material differential
  score += evaluateBoardMaterial(nextState, aiPlayer);

  // Slight bonus for advancing pieces
  if (movingPiece) {
    if (movingPiece.type === "soldier") {
      const advanced = aiPlayer === "red" ? move.from.row - move.to.row : move.to.row - move.from.row;
      if (advanced > 0) score += 10;
    }
  }

  return score;
}

export class XiangqiAiLevel1 implements AiPlayer<XiangqiState, XiangqiMove> {
  readonly id = "xiangqi-ai-l1";
  readonly name = "Xiangqi AI (Level 1 - Heuristic)";

  async selectMove(
    state: XiangqiState,
    legalMoves: XiangqiMove[]
  ): Promise<XiangqiMove> {
    if (!legalMoves || legalMoves.length === 0) {
      throw new Error("No legal moves available");
    }

    const aiPlayer = state.currentPlayer;
    let bestMove = legalMoves[0];
    let highestScore = -Infinity;

    for (const move of legalMoves) {
      const score = evaluateMoveScore(state, move, aiPlayer);
      if (score > highestScore) {
        highestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }
}

export function createXiangqiAiLevel1(): XiangqiAiLevel1 {
  return new XiangqiAiLevel1();
}
