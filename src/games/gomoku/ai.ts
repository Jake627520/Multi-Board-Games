import type { AiPlayer } from "../../core/ai/types";
import { BOARD_SIZE, inBounds } from "./board";
import { getLegalMoves, applyMoveUnchecked } from "./rules";
import type { GomokuMove, GomokuPlayer, GomokuState } from "./types";

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

function wouldWin(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (count >= 5) return true;
  }
  return false;
}

function evaluateMoveScore(
  board: (GomokuPlayer | null)[][],
  row: number,
  col: number,
  player: GomokuPlayer
): number {
  const opponent: GomokuPlayer = player === "black" ? "white" : "black";

  if (wouldWin(board, row, col, player)) return 100_000;
  if (wouldWin(board, row, col, opponent)) return 50_000;

  let totalScore = 0;

  for (const [dr, dc] of DIRECTIONS) {
    let ownCount = 1;
    let ownOpenEnds = 0;

    let r = row + dr, c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) { ownCount++; r += dr; c += dc; }
    if (inBounds(r, c) && board[r][c] === null) ownOpenEnds++;

    r = row - dr; c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) { ownCount++; r -= dr; c -= dc; }
    if (inBounds(r, c) && board[r][c] === null) ownOpenEnds++;

    if (ownCount >= 4 && ownOpenEnds > 0) totalScore += 10_000;
    else if (ownCount === 3 && ownOpenEnds === 2) totalScore += 3_000;
    else if (ownCount === 3 && ownOpenEnds === 1) totalScore += 500;
    else if (ownCount === 2 && ownOpenEnds === 2) totalScore += 200;

    let oppCount = 1;
    let oppOpenEnds = 0;
    r = row + dr; c = col + dc;
    while (inBounds(r, c) && board[r][c] === opponent) { oppCount++; r += dr; c += dc; }
    if (inBounds(r, c) && board[r][c] === null) oppOpenEnds++;
    r = row - dr; c = col - dc;
    while (inBounds(r, c) && board[r][c] === opponent) { oppCount++; r -= dr; c -= dc; }
    if (inBounds(r, c) && board[r][c] === null) oppOpenEnds++;

    if (oppCount >= 4 && oppOpenEnds > 0) totalScore += 8_000;
    else if (oppCount === 3 && oppOpenEnds === 2) totalScore += 2_500;
    else if (oppCount === 3 && oppOpenEnds === 1) totalScore += 400;
  }

  const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
  totalScore += Math.max(0, 20 - centerDistance);
  return totalScore;
}

/** Level 1：純啟發式 */
export class GomokuAiLevel1 implements AiPlayer<GomokuState, GomokuMove> {
  readonly id = "gomoku-ai-l1";
  readonly name = "Gomoku AI (Level 1 - Heuristic)";

  async selectMove(state: GomokuState, legalMoves: GomokuMove[]): Promise<GomokuMove> {
    if (!legalMoves || legalMoves.length === 0) throw new Error("No legal moves available");
    let best = legalMoves[0];
    let bestScore = -Infinity;
    for (const m of legalMoves) {
      const score = evaluateMoveScore(state.board, m.row, m.col, state.currentPlayer);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }
}

/** 鄰近點剪枝：只考慮已有棋子周圍 radius 格內的空位 */
function getNeighborMoves(state: GomokuState, radius = 2): GomokuMove[] {
  const candidates = new Set<string>();
  const hasStone = state.board.some(row => row.some(cell => cell !== null));

  if (!hasStone) {
    // 開局下中心
    return [{ row: 7, col: 7 }];
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c] === null) continue;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && state.board[nr][nc] === null) {
            candidates.add(`${nr},${nc}`);
          }
        }
      }
    }
  }

  const legal = getLegalMoves(state);
  return legal.filter(m => candidates.has(`${m.row},${m.col}`));
}

/** Level 2：Minimax + Alpha-Beta + 鄰近剪枝 + 啟發式排序 */
export class GomokuAiLevel2 implements AiPlayer<GomokuState, GomokuMove> {
  readonly id = "gomoku-ai-l2";
  readonly name = "Gomoku AI (Level 2 - Minimax)";

  private readonly maxDepth = 2;

  async selectMove(state: GomokuState, legalMoves: GomokuMove[]): Promise<GomokuMove> {
    if (!legalMoves || legalMoves.length === 0) throw new Error("No legal moves available");

    const candidates = getNeighborMoves(state);
    const moves = candidates.length > 0 ? candidates : legalMoves;

    // 啟發式排序：讓即刻連線或防守威脅點排在最前
    moves.sort((a, b) => {
      const scoreB = evaluateMoveScore(state.board, b.row, b.col, state.currentPlayer);
      const scoreA = evaluateMoveScore(state.board, a.row, a.col, state.currentPlayer);
      return scoreB - scoreA;
    });

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const next = applyMoveUnchecked(state, move);
      const score = this.minimax(next, this.maxDepth - 1, -Infinity, Infinity, false, state.currentPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  private minimax(
    state: GomokuState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    rootPlayer: GomokuPlayer
  ): number {
    if (depth === 0 || state.winner !== null || state.isDraw) {
      return this.evaluateState(state, rootPlayer);
    }

    const moves = getNeighborMoves(state);
    if (moves.length === 0) return this.evaluateState(state, rootPlayer);

    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const next = applyMoveUnchecked(state, m);
        const evalScore = this.minimax(next, depth - 1, alpha, beta, false, rootPlayer);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const next = applyMoveUnchecked(state, m);
        const evalScore = this.minimax(next, depth - 1, alpha, beta, true, rootPlayer);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateState(state: GomokuState, rootPlayer: GomokuPlayer): number {
    if (state.winner === rootPlayer) return 100_000;
    if (state.winner && state.winner !== rootPlayer) return -100_000;
    if (state.isDraw) return 0;

    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c] === null) continue;
        const player = state.board[r][c]!;
        const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
        const centerVal = Math.max(0, 15 - centerDist);
        score += player === rootPlayer ? centerVal : -centerVal;
      }
    }
    return score;
  }
}

export function createGomokuAiLevel1(): GomokuAiLevel1 {
  return new GomokuAiLevel1();
}

export function createGomokuAiLevel2(): GomokuAiLevel2 {
  return new GomokuAiLevel2();
}
