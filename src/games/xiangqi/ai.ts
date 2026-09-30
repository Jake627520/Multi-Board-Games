import type { AiPlayer } from "../../core/ai/types";
import { pickWithinEpsilon, resolveRng, type AiOptions, type Rng } from "../../core/ai/random";
import { crossedRiver } from "./board";
import {
  applyMoveUnchecked,
  getLegalMoves,
  getWinner,
  isGameOver,
  isInCheck,
} from "./rules";
import type {
  Piece,
  PieceType,
  XiangqiMove,
  XiangqiPlayer,
  XiangqiState,
} from "./types";

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
    val += 100;
  }
  return val;
}

function evaluateBoardMaterial(state: XiangqiState, rootPlayer: XiangqiPlayer): number {
  let score = 0;
  for (const row of state.board) {
    for (const piece of row) {
      if (!piece) continue;
      const val = getPieceValue(piece);
      score += piece.player === rootPlayer ? val : -val;
    }
  }
  return score;
}

/** 靜態局面評估（給 Minimax 葉節點用） */
function evaluateState(state: XiangqiState, rootPlayer: XiangqiPlayer): number {
  const winner = getWinner(state);
  if (winner === rootPlayer) return 100_000;
  if (winner && winner !== rootPlayer) return -100_000;
  if (state.isDraw) return 0;

  let score = evaluateBoardMaterial(state, rootPlayer);

  const opponent: XiangqiPlayer = rootPlayer === "red" ? "black" : "red";
  if (isInCheck(state, opponent)) score += 80;
  if (isInCheck(state, rootPlayer)) score -= 90;

  return score;
}

/** Level 1 用的單步啟發式（維持既有行為） */
function evaluateMoveScore(
  state: XiangqiState,
  move: XiangqiMove,
  aiPlayer: XiangqiPlayer
): number {
  const targetPiece = state.board[move.to.row][move.to.col];
  const movingPiece = state.board[move.from.row][move.from.col];
  let score = 0;

  if (targetPiece) score += getPieceValue(targetPiece) * 10;

  const nextState = applyMoveUnchecked(state, move);
  const opponent: XiangqiPlayer = aiPlayer === "red" ? "black" : "red";
  if (isInCheck(nextState, opponent)) score += 50;
  score += evaluateBoardMaterial(nextState, aiPlayer);

  if (movingPiece?.type === "soldier") {
    const advanced =
      aiPlayer === "red" ? move.from.row - move.to.row : move.to.row - move.from.row;
    if (advanced > 0) score += 10;
  }

  return score;
}

/**
 * 走法排序：吃子 > 將軍 > 其餘（提升 Alpha-Beta 剪枝效率）。
 *
 * 效能注意：每個走法「吃子價值」與「是否將軍」只算一次並快取起來，
 * 不要放進 sort 的 comparator 裡——comparator 在 n 個元素上會被呼叫
 * O(n log n) 次，若每次都呼叫 applyMoveUnchecked（内含完整 positionHistory
 * 簽章／雜湊計算）重算一次，會被重複呼叫掉好幾倍，在 Minimax 遞迴中呈
 * 指數放大，是效能熱點。
 */
function orderMoves(state: XiangqiState, moves: XiangqiMove[]): XiangqiMove[] {
  const opponent: XiangqiPlayer =
    state.currentPlayer === "red" ? "black" : "red";

  const scored = moves.map((move) => {
    const target = state.board[move.to.row][move.to.col];
    const captureValue = target ? getPieceValue(target) : 0;
    const next = applyMoveUnchecked(state, move);
    const givesCheck = isInCheck(next, opponent) ? 1 : 0;
    return { move, captureValue, givesCheck };
  });

  scored.sort((a, b) => {
    if (a.captureValue !== b.captureValue) return b.captureValue - a.captureValue;
    return b.givesCheck - a.givesCheck;
  });

  return scored.map((s) => s.move);
}

/**
 * 「並列容忍度」：在最佳分數 ε 以內的走法視為同樣好，隨機挑一個，
 * 讓同一局面不會永遠走出同一步。
 *
 * ε = 10 的依據：兩個 Level 的評分都是整數，而評分項目的最小「實質」單位是
 * 將軍加成 80／90、過河兵 +100、最小子力 100；唯一比 10 更小的項目只有
 * Level 1 的「兵前進 +10」這個純 tie-break 微調。ε 因此嚴格小於任何
 * 子力或將軍的差距，不可能為了隨機性讓出一顆子或錯過將軍，只會在
 * 評估函式自己認為「幾乎一樣」的走法之間洗牌。
 */
export const XIANGQI_AI_EPSILON = 10;

/** evaluateState 的勝負分數；Level 2 看到必勝／必敗時不隨機（見 pickWithinEpsilon）。 */
const XIANGQI_DECISIVE_SCORE = 100_000;

// ---------- Level 1 ----------

export class XiangqiAiLevel1 implements AiPlayer<XiangqiState, XiangqiMove> {
  readonly id = "xiangqi-ai-l1";
  readonly name = "Xiangqi AI (Level 1 - Heuristic)";
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(
    state: XiangqiState,
    legalMoves: XiangqiMove[]
  ): Promise<XiangqiMove> {
    if (!legalMoves?.length) throw new Error("No legal moves available");

    const aiPlayer = state.currentPlayer;
    const scored = legalMoves.map((m) => ({
      item: m,
      score: evaluateMoveScore(state, m, aiPlayer),
    }));
    return pickWithinEpsilon(scored, XIANGQI_AI_EPSILON, this.rng);
  }
}

// ---------- Level 2：Minimax + Alpha-Beta ----------

export class XiangqiAiLevel2 implements AiPlayer<XiangqiState, XiangqiMove> {
  readonly id = "xiangqi-ai-l2";
  readonly name = "Xiangqi AI (Level 2 - Minimax)";

  private readonly maxDepth = 2;
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(
    state: XiangqiState,
    legalMoves: XiangqiMove[]
  ): Promise<XiangqiMove> {
    if (!legalMoves?.length) throw new Error("No legal moves available");

    const rootPlayer = state.currentPlayer;
    const ordered = orderMoves(state, legalMoves);

    const scored: { item: XiangqiMove; score: number }[] = [];
    let bestScore = -Infinity;

    for (const move of ordered) {
      const next = applyMoveUnchecked(state, move);
      // 根節點的 alpha 只剪到「最佳分數 - ε」為止：這樣所有落在 ε 範圍內的
      // 走法都拿到精確分數（低於門檻的才會被剪成上界，本來就不會入選）。
      // 舊版直接以 bestScore 當 alpha，並列的走法只會得到上界、無法區分。
      const alpha = bestScore === -Infinity ? -Infinity : bestScore - XIANGQI_AI_EPSILON;
      const score = this.minimax(next, this.maxDepth - 1, alpha, Infinity, false, rootPlayer);
      scored.push({ item: move, score });
      if (score > bestScore) bestScore = score;
    }

    return pickWithinEpsilon(scored, XIANGQI_AI_EPSILON, this.rng, XIANGQI_DECISIVE_SCORE);
  }

  private minimax(
    state: XiangqiState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    rootPlayer: XiangqiPlayer
  ): number {
    if (depth === 0 || isGameOver(state) || state.winner != null || state.isDraw) {
      return evaluateState(state, rootPlayer);
    }

    const moves = orderMoves(state, getLegalMoves(state));
    if (moves.length === 0) {
      return evaluateState(state, rootPlayer);
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const next = applyMoveUnchecked(state, m);
        const val = this.minimax(next, depth - 1, alpha, beta, false, rootPlayer);
        maxEval = Math.max(maxEval, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return maxEval;
    }

    let minEval = Infinity;
    for (const m of moves) {
      const next = applyMoveUnchecked(state, m);
      const val = this.minimax(next, depth - 1, alpha, beta, true, rootPlayer);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function createXiangqiAiLevel1(options?: AiOptions): XiangqiAiLevel1 {
  return new XiangqiAiLevel1(options);
}

export function createXiangqiAiLevel2(options?: AiOptions): XiangqiAiLevel2 {
  return new XiangqiAiLevel2(options);
}
