import type { AiPlayer } from "../../core/ai/types";
import {
  pickWithinEpsilon,
  randomIndex,
  resolveRng,
  type AiOptions,
  type Rng,
} from "../../core/ai/random";
import { determinize, type BanqiObservation } from "./determinize";
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
  BanqiViewState,
} from "./types";

/**
 * 並列容忍度（見 core/ai/random.ts 的 pickWithinEpsilon）。
 *
 * Level 1：分數是「10 的倍數的子力差」與翻子常數 15，最小的實質間距是 5，
 * ε = 4 因此只在「真正並列」之間洗牌（所有翻子恆為 15，等於在蓋子間均勻選）。
 *
 * Level 2：分數是 K 次取樣的平均。子力值彼此最小的差距是 50（350 vs 400 等），
 * ε = 25 為其一半，不會為了隨機性放掉任何一個有價差的選擇。
 */
export const BANQI_L1_EPSILON = 4;
export const BANQI_L2_EPSILON = 25;

/** 平均後仍達此絕對值＝各取樣都看到必勝／必敗，此時不隨機（見 pickWithinEpsilon）。 */
const BANQI_DECISIVE_SCORE = 100_000;

/** Level 2 的 determinization 取樣次數（設計範圍 3~5，取上限求穩定）。 */
export const BANQI_L2_SAMPLES = 5;

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

/**
 * Level 1：單層啟發式。
 *
 * 只吃 view：蓋著的棋子身分用 determinize 補一份「可能的」完整狀態
 * （單次取樣）。翻子的分數本來就是常數，所以身分只會影響「走完之後
 * 是否有一方被吃光」這類勝負判定，不會洩漏真實身分。
 */
export class BanqiAiLevel1 implements AiPlayer<BanqiViewState, BanqiMove> {
  readonly id = "banqi-ai-l1";
  readonly name = "Banqi AI (Level 1 - Heuristic)";
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(observation: BanqiObservation, legalMoves: BanqiMove[]): Promise<BanqiMove> {
    if (!legalMoves.length) throw new Error("No legal moves available");

    const state = determinize(observation, this.rng);
    const root = state.currentPlayer;

    const scored = legalMoves.map((m) => {
      let score = 0;
      if (m.type === "flip") {
        score = 15; // 探索價值
      } else {
        score += captureGain(state, m) * 10;
        const next = applyMoveUnchecked(state, m);
        score += evaluateState(next, root);
      }
      return { item: m, score };
    });
    return pickWithinEpsilon(scored, BANQI_L1_EPSILON, this.rng);
  }
}

/**
 * Level 2：2-ply Minimax + Alpha-Beta，搭配 determinization（少量取樣）。
 *
 * 舊版直接吃權威完整狀態，等於偷看每一顆蓋著的棋子：開局首手翻子實測
 * 200 局有 100% 翻到將、平均階級 7.00。現在只看 view，蓋著的子由
 * 「32 子 − 已翻開的子」洗牌填入，取 K 次取樣的平均分數，所以翻哪一格
 * 的期望值與真實身分無關（近似取捨見 determinize.ts 的 unseenPieces）。
 * 這會讓 Level 2 變弱——它本來就是靠作弊贏的。
 */
export class BanqiAiLevel2 implements AiPlayer<BanqiViewState, BanqiMove> {
  readonly id = "banqi-ai-l2";
  readonly name = "Banqi AI (Level 2 - Minimax)";
  private readonly maxDepth = 2;
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(observation: BanqiObservation, legalMoves: BanqiMove[]): Promise<BanqiMove> {
    if (!legalMoves.length) throw new Error("No legal moves available");

    // 首手（顏色尚未決定）：翻哪一格都對稱——翻到什麼顏色就成為那一方，
    // 而 evaluateState 以「輪到的人」當 root，此時 root 只是佔位值，
    // 分數沒有意義。與其讓取樣雜訊決定，直接均勻隨機。
    if (observation.player1Color === null) {
      return legalMoves[randomIndex(this.rng, legalMoves.length)];
    }

    const samples: BanqiState[] = [];
    for (let k = 0; k < BANQI_L2_SAMPLES; k++) samples.push(determinize(observation, this.rng));

    const root = observation.currentPlayer;
    // 走法排序只看「翻開的棋子」（吃子價值），各取樣結果相同，用第一份即可。
    const ordered = orderMoves(samples[0], legalMoves);

    // 根節點用完整視窗搜尋，每一手都拿到精確分數才能取平均。
    const scored = ordered.map((m) => {
      let total = 0;
      for (const sample of samples) {
        const next = applyMoveUnchecked(sample, m);
        total += this.minimax(next, this.maxDepth - 1, -Infinity, Infinity, false, root);
      }
      return { item: m, score: total / samples.length };
    });
    return pickWithinEpsilon(scored, BANQI_L2_EPSILON, this.rng, BANQI_DECISIVE_SCORE);
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

export function createBanqiAiLevel1(options?: AiOptions): BanqiAiLevel1 {
  return new BanqiAiLevel1(options);
}

export function createBanqiAiLevel2(options?: AiOptions): BanqiAiLevel2 {
  return new BanqiAiLevel2(options);
}
