import type { AiPlayer } from "../../core/ai/types";
import { pickWithinEpsilon, resolveRng, type AiOptions, type Rng } from "../../core/ai/random";
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

/**
 * Level 1 的並列容忍度。單點分數是整數（棋型 200 以上 + 離中心的 0~20 整數加成），
 * 0.5 只吸收「完全並列」（例如以天元為軸對稱的四個鄰點）。不能更大：
 * 差 1 就是「離中心近一格」，那已經是評估函式有意的偏好。
 */
export const GOMOKU_L1_EPSILON = 0.5;

/**
 * Level 2 的並列容忍度。葉節點評分裡最小的「棋型」單位是一個乾淨視窗的 +1，
 * 其餘是 5／18／20／180…；置中偏好只有 0.01 一格。取 ε = 1 的依據：
 * 它吸收置中 tie-break 與浮點累加誤差造成的差距（對稱局面本來就該並列），
 * 也最多容許差「一個乾淨視窗」的走法——遠小於任何真正的棋型
 * （眠二 20、活二 200、活三 5000），不會因此放掉一個活三或漏防對手活三。
 * 是否真的沒變弱，見 tests/gomoku/ai-randomness.test.ts 與配對對打數據。
 */
export const GOMOKU_L2_EPSILON = 1;

/** Level 1：純啟發式 */
export class GomokuAiLevel1 implements AiPlayer<GomokuState, GomokuMove> {
  readonly id = "gomoku-ai-l1";
  readonly name = "Gomoku AI (Level 1 - Heuristic)";
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(state: GomokuState, legalMoves: GomokuMove[]): Promise<GomokuMove> {
    if (!legalMoves || legalMoves.length === 0) throw new Error("No legal moves available");
    const scored = legalMoves.map((m) => ({
      item: m,
      score: evaluateMoveScore(state.board, m.row, m.col, state.currentPlayer),
    }));
    return pickWithinEpsilon(scored, GOMOKU_L1_EPSILON, this.rng);
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

/**
 * 葉節點棋型權重。
 *
 * 舊版的葉節點評估只算「離中心多遠」，完全沒有棋型概念，所以 Level 2 的
 * minimax 等於在最佳化「把子堆在中央」——實測對 Level 1 幾乎全敗（0/12、1/50）。
 * 難度階梯因此是反的：玩家選 Level 2 反而拿到更弱的對手。
 *
 * 這裡改成以「連子長度 + 兩端開放數」為單位計分，我方與對方都算，
 * 讓同一個評估函式同時涵蓋進攻（做活三活四）與防守（對手活三活四要扣分）。
 */
const WIN_SCORE = 10_000_000;
const FIVE = 1_000_000;
const OPEN_FOUR = 100_000;
const CLOSED_FOUR = 10_000;
const OPEN_THREE = 5_000;
const CLOSED_THREE = 500;
const OPEN_TWO = 200;
const CLOSED_TWO = 20;
const OPEN_ONE = 5;

/**
 * 對手棋型的輕微加權：2 ply 搜尋看不到對手的後續補刀，
 * 稍微高估對手威脅可以換到明顯更穩的防守，實測不會讓 AI 變被動。
 */
const OPPONENT_BIAS = 1.1;

/**
 * 置中偏好只保留「極小的 tie-break」：權重 0.01，整盤加總也遠小於一個
 * 眠二（20），永遠不可能壓過任何真正的棋型判斷。
 */
const CENTER_TIE_BREAK = 0.01;

function runScore(length: number, openEnds: number): number {
  if (length >= 5) return FIVE;
  if (openEnds === 0) return 0; // 兩端都被堵死的連子沒有威脅
  switch (length) {
    case 4:
      return openEnds === 2 ? OPEN_FOUR : CLOSED_FOUR; // 活四 / 衝四
    case 3:
      return openEnds === 2 ? OPEN_THREE : CLOSED_THREE; // 活三 / 眠三
    case 2:
      return openEnds === 2 ? OPEN_TWO : CLOSED_TWO;
    default:
      return openEnds === 2 ? OPEN_ONE : 0;
  }
}

/**
 * 「五格視窗」潛力項：連子段評分抓不到有空隙的棋型（例如 X_XX 的跳三），
 * 而跳三跟實三一樣危險。這裡補上經典做法——枚舉每條線上所有連續 5 格，
 * 只要視窗裡沒有對方的子，就依我方子數給分。開放度愈高的棋型會落在
 * 愈多個「乾淨視窗」裡，自然拿到較高分，不必再另外判斷活/眠。
 */
const WINDOW_SCORES = [0, 1, 18, 180, 1_800, 0] as const;

function evaluateWindows(
  board: (GomokuPlayer | null)[][],
  rootPlayer: GomokuPlayer
): number {
  let score = 0;

  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const endR = r + dr * 4;
        const endC = c + dc * 4;
        if (!inBounds(endR, endC)) continue;

        let own = 0;
        let opp = 0;
        for (let k = 0; k < 5; k++) {
          const cell = board[r + dr * k][c + dc * k];
          if (cell === null) continue;
          if (cell === rootPlayer) own++;
          else opp++;
        }
        if (own > 0 && opp > 0) continue; // 混雜視窗對雙方都沒有價值
        if (own > 0) score += WINDOW_SCORES[own];
        else if (opp > 0) score -= WINDOW_SCORES[opp] * OPPONENT_BIAS;
      }
    }
  }

  return score;
}

/**
 * 掃描四個方向的所有「連子段」並計分。
 * 每段只從該方向的第一顆棋子開始算一次，因此整體成本約 4 × 225 次格子存取，
 * 與舊版的全盤掃描同一個數量級。
 */
function evaluateBoardPatterns(
  board: (GomokuPlayer | null)[][],
  rootPlayer: GomokuPlayer
): number {
  let score = 0;

  score += evaluateWindows(board, rootPlayer);

  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const player = board[r][c];
        if (player === null) continue;

        const pr = r - dr;
        const pc = c - dc;
        // 不是這一段的起點就跳過，避免同一段重複計分
        if (inBounds(pr, pc) && board[pr][pc] === player) continue;

        let length = 1;
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc) && board[nr][nc] === player) {
          length++;
          nr += dr;
          nc += dc;
        }

        let openEnds = 0;
        if (inBounds(pr, pc) && board[pr][pc] === null) openEnds++;
        if (inBounds(nr, nc) && board[nr][nc] === null) openEnds++;

        const value = runScore(length, openEnds);
        if (value === 0) continue;
        score += player === rootPlayer ? value : -value * OPPONENT_BIAS;
      }
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const player = board[r][c];
      if (player === null) continue;
      const centerVal = Math.max(0, 15 - (Math.abs(r - 7) + Math.abs(c - 7))) * CENTER_TIE_BREAK;
      score += player === rootPlayer ? centerVal : -centerVal;
    }
  }

  return score;
}

/**
 * 候選點上限。棋型評估比「離中心多遠」貴，但把分枝從 60~100 收斂到十幾個
 * 高分點之後，整體節點數反而大幅下降——實測思考時間與舊版同一個量級，
 * 而棋力來自評估函式而不是深度（depth 4 實測只是變慢，勝率沒提升）。
 */
const ROOT_CANDIDATE_LIMIT = 12;
const INNER_CANDIDATE_LIMIT = 8;

function orderedCandidates(
  state: GomokuState,
  limit: number,
  fallback?: GomokuMove[]
): GomokuMove[] {
  const neighbors = getNeighborMoves(state);
  const source = neighbors.length > 0 ? neighbors : (fallback ?? getLegalMoves(state));
  if (source.length <= 1) return source;

  const scored = source.map((m) => ({
    move: m,
    score: evaluateMoveScore(state.board, m.row, m.col, state.currentPlayer),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.move);
}

/** Level 2：Minimax + Alpha-Beta + 鄰近剪枝 + 棋型評估 */
export class GomokuAiLevel2 implements AiPlayer<GomokuState, GomokuMove> {
  readonly id = "gomoku-ai-l2";
  readonly name = "Gomoku AI (Level 2 - Minimax)";

  private readonly maxDepth = 2;
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(state: GomokuState, legalMoves: GomokuMove[]): Promise<GomokuMove> {
    if (!legalMoves || legalMoves.length === 0) throw new Error("No legal moves available");

    const candidates = orderedCandidates(state, ROOT_CANDIDATE_LIMIT, legalMoves);
    const moves = candidates.length > 0 ? candidates : legalMoves;

    // 根節點每一手都用完整視窗搜尋，分數是精確值，才能公平地比較「是否在 ε 內」。
    const scored = moves.map((move) => {
      const next = applyMoveUnchecked(state, move);
      const score = this.minimax(next, this.maxDepth - 1, -Infinity, Infinity, false, state.currentPlayer);
      return { item: move, score };
    });
    return pickWithinEpsilon(scored, GOMOKU_L2_EPSILON, this.rng, WIN_SCORE);
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

    const moves = orderedCandidates(state, INNER_CANDIDATE_LIMIT);
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
    if (state.winner === rootPlayer) return WIN_SCORE;
    if (state.winner && state.winner !== rootPlayer) return -WIN_SCORE;
    if (state.isDraw) return 0;

    return evaluateBoardPatterns(state.board, rootPlayer);
  }
}

export function createGomokuAiLevel1(options?: AiOptions): GomokuAiLevel1 {
  return new GomokuAiLevel1(options);
}

export function createGomokuAiLevel2(options?: AiOptions): GomokuAiLevel2 {
  return new GomokuAiLevel2(options);
}
