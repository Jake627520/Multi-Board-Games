import type { AiPlayer } from "../../core/ai/types";
import {
  applyMoveUnchecked,
  getLegalMoves,
  isGameOver,
} from "./rules";
import type {
  BanqiMove,
  BanqiPiece,
  BanqiPlayer,
  BanqiState,
} from "./types";

/** 階級分數（對齊 rank 1~7） */
const RANK_VALUE: Record<number, number> = {
  7: 900, // general (將/帥)
  6: 400, // advisor (士/仕)
  5: 350, // elephant (象/相)
  4: 500, // chariot (車/俥)
  3: 350, // horse (馬/傌)
  2: 450, // cannon (包/炮)
  1: 120, // soldier (卒/兵)
};

function pieceValue(piece: BanqiPiece): number {
  return RANK_VALUE[piece.rank] ?? 100;
}

function evaluateState(state: BanqiState, root: BanqiPlayer): number {
  if (state.winner === root) return 100_000;
  if (state.winner && state.winner !== root) return -100_000;
  if (state.isDraw) return 0;

  let score = 0;
  for (const row of state.board) {
    for (const p of row) {
      if (!p || !p.isRevealed) continue;
      const v = pieceValue(p);
      score += p.player === root ? v : -v;
    }
  }
  return score;
}

function captureGain(state: BanqiState, move: BanqiMove): number {
  if (move.type !== "move") return 0;
  const target = state.board[move.to.row][move.to.col];
  if (!target || !target.isRevealed) return 0;
  return pieceValue(target);
}

function orderMoves(state: BanqiState, moves: BanqiMove[]): BanqiMove[] {
  return [...moves].sort((a, b) => {
    const ca = captureGain(state, a);
    const cb = captureGain(state, b);
    if (ca !== cb) return cb - ca;
    // 移動優於盲目翻子
    const ta = a.type === "move" ? 1 : 0;
    const tb = b.type === "move" ? 1 : 0;
    return tb - ta;
  });
}

/** Level 1：單層啟發式 */
export class BanqiAiLevel1 implements AiPlayer<BanqiState, BanqiMove> {
  readonly id = "banqi-ai-l1";
  readonly name = "Banqi AI (Level 1 - Heuristic)";

  async selectMove(state: BanqiState, legalMoves: BanqiMove[]): Promise<BanqiMove> {
    if (!legalMoves.length) throw new Error("No legal moves available");

    const root = state.currentPlayer;
    let best = legalMoves[0];
    let bestScore = -Infinity;

    for (const m of legalMoves) {
      let score = 0;
      if (m.type === "flip") {
        score = 15; // 探索價值
      } else {
        score += captureGain(state, m) * 10;
        const next = applyMoveUnchecked(state, m);
        score += evaluateState(next, root);
      }
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }
}

/** Level 2：2-ply Minimax + Alpha-Beta */
export class BanqiAiLevel2 implements AiPlayer<BanqiState, BanqiMove> {
  readonly id = "banqi-ai-l2";
  readonly name = "Banqi AI (Level 2 - Minimax)";
  private readonly maxDepth = 2;

  async selectMove(state: BanqiState, legalMoves: BanqiMove[]): Promise<BanqiMove> {
    if (!legalMoves.length) throw new Error("No legal moves available");

    const root = state.currentPlayer;
    const ordered = orderMoves(state, legalMoves);
    let best = ordered[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const m of ordered) {
      const next = applyMoveUnchecked(state, m);
      const score = this.minimax(next, this.maxDepth - 1, alpha, beta, false, root);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
      alpha = Math.max(alpha, bestScore);
    }
    return best;
  }

  private minimax(
    state: BanqiState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    root: BanqiPlayer
  ): number {
    if (depth === 0 || isGameOver(state) || state.winner != null || state.isDraw) {
      return evaluateState(state, root);
    }

    const moves = orderMoves(state, getLegalMoves(state));
    if (!moves.length) return evaluateState(state, root);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const val = this.minimax(
          applyMoveUnchecked(state, m),
          depth - 1,
          alpha,
          beta,
          false,
          root
        );
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    }

    let minEval = Infinity;
    for (const m of moves) {
      const val = this.minimax(
        applyMoveUnchecked(state, m),
        depth - 1,
        alpha,
        beta,
        true,
        root
      );
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function createBanqiAiLevel1(): BanqiAiLevel1 {
  return new BanqiAiLevel1();
}

export function createBanqiAiLevel2(): BanqiAiLevel2 {
  return new BanqiAiLevel2();
}
