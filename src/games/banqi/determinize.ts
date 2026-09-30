import { randomIndex, type Rng } from "../../core/ai/random";
import type { PieceType } from "../xiangqi/types";
import { PIECE_RANKS } from "./board";
import type {
  BanqiPiece,
  BanqiPlayer,
  BanqiState,
  BanqiViewState,
} from "./types";

/**
 * AI 看到的暗棋局面：投影後的 view，或（為了相容既有呼叫端與測試）完整狀態。
 * 兩者都只會被「當成 view 讀」——見 {@link determinize}，蓋著的棋子的
 * type / player / rank 一律不讀，就算傳進來的是含真實身分的完整狀態也一樣。
 */
export type BanqiObservation = BanqiState | BanqiViewState;

/** 每方的棋子組成（全套 32 子 = 兩方各一份）。 */
const SIDE_COMPOSITION: readonly (readonly [PieceType, number])[] = [
  ["general", 1],
  ["advisor", 2],
  ["elephant", 2],
  ["chariot", 2],
  ["horse", 2],
  ["cannon", 2],
  ["soldier", 5],
];

export interface UnseenPiece {
  readonly player: BanqiPlayer;
  readonly type: PieceType;
}

function fullMultiset(): UnseenPiece[] {
  const all: UnseenPiece[] = [];
  for (const player of ["red", "black"] as const) {
    for (const [type, count] of SIDE_COMPOSITION) {
      for (let i = 0; i < count; i++) all.push({ player, type });
    }
  }
  return all;
}

/**
 * 「看不見的棋子」多重集合 = 完整 32 子 − 盤面上已翻開的子。
 *
 * ⚠️ 刻意接受的近似：view 沒有「被吃紀錄」，所以已被吃掉的子也留在這個
 * 集合裡——AI 會把它們當成「可能還蓋在盤上」。這會讓機率分布略偏
 * （例如某方的車其實早被吃了，AI 仍以為蓋著的子有機會是那台車）。
 * 我們要的是「AI 拿到的是機率分布、而不是真相」，不是估得多準；
 * 想估準就得帶被吃紀錄，那是另一個決定（需擴充 view 的公開資訊）。
 */
export function unseenPieces(observation: BanqiObservation): UnseenPiece[] {
  const pool = fullMultiset();
  for (const row of observation.board) {
    for (const piece of row) {
      if (!piece || piece.isRevealed !== true) continue;
      // 只有翻開的子才讀身分；蓋著的子（含完整狀態裡的蓋子）完全不看。
      const revealed = piece as BanqiPiece;
      const idx = pool.findIndex(
        (p) => p.player === revealed.player && p.type === revealed.type
      );
      if (idx >= 0) pool.splice(idx, 1);
    }
  }
  return pool;
}

function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Determinization：把 view 補成一個「可能的」完整狀態。
 * 將 {@link unseenPieces} 洗牌後依序填進未翻開的格子（集合比蓋著的格子多
 * 時只取前 H 個，等於從中不放回均勻抽樣）。引擎的 applyMove 需要完整狀態，
 * 所以 minimax 要先有這一步才展得開；隨機源由呼叫端注入以便重現。
 *
 * 產生的蓋子 id 是 `det-<row>-<col>`，不是真實 id（AI 不該、也拿不到）。
 * 和局偵測用的 positionHistory / nonProgressCount 不帶——view 沒有它們，
 * 2 層搜尋也用不到。
 */
export function determinize(observation: BanqiObservation, rng: Rng): BanqiState {
  const hiddenCount = observation.board.reduce(
    (n, row) => n + row.filter((p) => p && p.isRevealed !== true).length,
    0
  );

  const pool = shuffleInPlace(unseenPieces(observation), rng);
  // 防禦：盤面不合標準配置（例如測試手擺的局面）造成集合不夠填時，
  // 用全套棋子補足，避免 undefined。正常對局不會走到這裡。
  while (pool.length < hiddenCount) {
    pool.push(...shuffleInPlace(fullMultiset(), rng));
  }

  let next = 0;
  const board = observation.board.map((row, r) =>
    row.map((piece, c): BanqiPiece | null => {
      if (!piece) return null;
      if (piece.isRevealed === true) {
        const p = piece as BanqiPiece;
        return { id: p.id, player: p.player, type: p.type, rank: p.rank, isRevealed: true };
      }
      const guess = pool[next++];
      return {
        id: `det-${r}-${c}`,
        player: guess.player,
        type: guess.type,
        rank: PIECE_RANKS[guess.type],
        isRevealed: false,
      };
    })
  );

  return {
    board,
    currentPlayer: observation.currentPlayer,
    player1Color: observation.player1Color,
    winner: observation.winner,
    isDraw: observation.isDraw,
    moveNumber: observation.moveNumber,
  };
}
