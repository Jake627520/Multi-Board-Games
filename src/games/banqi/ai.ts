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
  canCapture,
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
  readonly name = "Banqi AI (Level 1 - Aggressive)";
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
 * Level 2：穩健型貪婪（與 Level 1 的「見子就吃」形成風格對比）。
 *
 * 為什麼不是更深的搜尋：原本的 2-ply minimax + determinization 實測打不過
 * Level 1（40 局配對 11:14）。試過四個方向都沒改善——取樣 5→25（13:19）、
 * 深度 2→3（10:20）、加入受威脅評估（11:11，差距在雜訊內）、ε→0（10:12）。
 * 給它越多算力反而越弱，表示錯的是評估不是搜尋。根因是 determinization 下
 * 翻子的期望值約為 0，而深度 2 的吃子因對手必然反吃常常是負的，於是
 * 「0 分的翻子」打敗「負分的吃子」——推理本身沒錯，是視界太淺。
 *
 * 所以改成一個誠實的設計：Level 2 是**不同風格**的貪婪，而不是假裝更深。
 *   1. 只吃划算的子——吃完若會被更大的子反吃就不吃（Level 1 會照吃）
 *   2. 不把子走到會被吃的位置，並優先把已被威脅的子救走
 *   3. 翻子挑安全的格——相鄰強敵越多越不想翻
 *
 * 附帶的結構性好處：它只讀已翻開的子，完全不需要 determinization，
 * 「看不到蓋著的身分」因此是架構保證，而不是統計上看不出偏差。
 */

const OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * 翻子的基礎價值。暗棋只能靠翻子取得子力，所以它必須與子力同量級——
 * 設成 60（低於一顆卒）時實測翻子率從 88% 崩到 28%、空走 46%，AI 光顧著
 * 搬救被威脅的子而不發展，40 局 13:20。取 200，介於卒(120)與士(400)之間：
 * 划算的吃子仍然優先，但不會為了閃避而放棄翻子。最終取 110——必須低於
 * 最小的子（卒 120），否則 AI 會為了翻子放棄白吃一顆卒，把確定的收益
 * 排在投機之後。次序是：確定的子力 > 投機的發展 > 位置調整。
 */
const FLIP_BASE = 200;

/** 翻開的子立刻被相鄰強敵吃掉的風險權重。 */
const FLIP_RISK = 0.35;

/** 把自己的子送到會被吃的位置，以及把被威脅的子救走，各自的權重。 */
const HANGING_WEIGHT = 0.5;

type ViewBoard = BanqiViewState["board"];

function revealedAt(board: ViewBoard, r: number, c: number) {
  if (r < 0 || r >= board.length) return null;
  const row = board[r];
  if (!row || c < 0 || c >= row.length) return null;
  const piece = row[c];
  return piece && piece.isRevealed ? piece : null;
}

/** 這一格上的子，是否有相鄰敵子吃得掉它。只看正交相鄰，不算炮的隔子吃。 */
export function attackedAt(board: ViewBoard, r: number, c: number): boolean {
  const target = revealedAt(board, r, c);
  if (!target) return false;
  for (const [dr, dc] of OFFSETS) {
    const attacker = revealedAt(board, r + dr, c + dc);
    if (!attacker || attacker.player === target.player) continue;
    // 炮只能隔子跳吃，相鄰的炮吃不到任何子。canCapture 只比階級（炮 2 ≥ 卒 1），
    // 不知道炮的走法，先前直接沿用它會把相鄰的敵炮誤判成威脅，讓穩健型 AI
    // 系統性高估危險。
    if (attacker.type === "cannon") continue;
    if (canCapture(attacker, target)) return true;
  }
  return false;
}

/** 相鄰敵子裡最大的價值——翻開一顆子時，這代表它可能立刻損失多少。 */
export function adjacentThreatValue(board: ViewBoard, r: number, c: number, me: BanqiPlayer): number {
  let worst = 0;
  for (const [dr, dc] of OFFSETS) {
    const neighbour = revealedAt(board, r + dr, c + dc);
    if (!neighbour || neighbour.player === me) continue;
    if (neighbour.type === "cannon") continue; // 相鄰的炮吃不到翻開的子
    worst = Math.max(worst, RANK_VALUE[neighbour.rank] ?? 100);
  }
  return worst;
}

export class BanqiAiLevel2 implements AiPlayer<BanqiViewState, BanqiMove> {
  readonly id = "banqi-ai-l2";
  readonly name = "Banqi AI (Level 2 - Cautious)";
  private readonly rng: Rng;

  constructor(options?: AiOptions) {
    this.rng = resolveRng(options);
  }

  async selectMove(observation: BanqiObservation, legalMoves: BanqiMove[]): Promise<BanqiMove> {
    if (!legalMoves.length) throw new Error("No legal moves available");

    const view = observation as BanqiViewState;
    const board = view.board;
    const me = view.currentPlayer;

    const scored = legalMoves.map((move) => ({
      item: move,
      score: this.scoreMove(board, me, move),
    }));
    return pickWithinEpsilon(scored, BANQI_L2_EPSILON, this.rng);
  }

  private scoreMove(board: ViewBoard, me: BanqiPlayer, move: BanqiMove): number {
    if (move.type === "flip") {
      // 翻在強敵旁邊，翻出來的子可能立刻被吃；翻在空曠處最安全。
      return FLIP_BASE - adjacentThreatValue(board, move.pos.row, move.pos.col, me) * FLIP_RISK;
    }

    const mover = revealedAt(board, move.from.row, move.from.col);
    if (!mover) return 0;
    const moverValue = RANK_VALUE[mover.rank] ?? 100;
    const target = revealedAt(board, move.to.row, move.to.col);

    let score = 0;
    if (target) score += RANK_VALUE[target.rank] ?? 100;

    // 走完之後自己會不會被吃。這是與 Level 1 最大的差別：
    // Level 1 只看吃到什麼，不看吃完會不會被反吃。
    const after = board.map((row) => row.slice());
    after[move.to.row][move.to.col] = mover;
    after[move.from.row][move.from.col] = null;
    if (attackedAt(after, move.to.row, move.to.col)) {
      score -= moverValue * HANGING_WEIGHT;
    }

    // 把原本就被威脅的子救走，本身就有價值。
    if (attackedAt(board, move.from.row, move.from.col)) {
      score += moverValue * HANGING_WEIGHT;
    }
    return score;
  }
}

export function createBanqiAiLevel1(options?: AiOptions): BanqiAiLevel1 {
  return new BanqiAiLevel1(options);
}

export function createBanqiAiLevel2(options?: AiOptions): BanqiAiLevel2 {
  return new BanqiAiLevel2(options);
}
