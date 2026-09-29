import type { Position } from "../../core/game/types";
import type { PieceType } from "../xiangqi/types";

export type BanqiPlayer = "red" | "black";

export interface BanqiPiece {
  readonly id: string;
  readonly player: BanqiPlayer;
  readonly type: PieceType;
  readonly rank: number; // 7 (general) down to 1 (soldier)
  readonly isRevealed: boolean;
}

export type BanqiMove =
  | { readonly type: "flip"; readonly pos: Position }
  | { readonly type: "move"; readonly from: Position; readonly to: Position };

export interface BanqiFullState {
  readonly board: (BanqiPiece | null)[][]; // 4 rows x 8 columns
  readonly currentPlayer: BanqiPlayer;
  readonly player1Color: BanqiPlayer | null; // Color chosen by first flip
  readonly winner: BanqiPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
  /**
   * 三次重複局面偵測用的局面簽章「雜湊」（32 個十六進位字元，見 shared/hash.ts）。
   * 只涵蓋「上一次有進展（翻子或吃子）之後」的這一段局面——翻子與吃子都是
   * 不可逆的，之前的局面永遠不可能再出現，所以每次有進展就清空這個陣列。
   * 簽章本身不含未翻開棋子的真實身分（見 rules.ts 的 positionSignature）。
   */
  readonly positionHistory?: readonly string[];
  /** 連續「未翻子且未吃子」的手數；翻子或吃子時歸零。 */
  readonly nonProgressCount?: number;
}

// Backward-compatible alias for engine/rules internal state
export type BanqiState = BanqiFullState;

export interface BanqiRevealedViewPiece {
  readonly id: string;
  readonly player: BanqiPlayer;
  readonly type: PieceType;
  readonly rank: number;
  readonly isRevealed: true;
}

export interface BanqiHiddenViewPiece {
  readonly id: string;
  readonly isRevealed: false;
}

export type BanqiViewPiece = BanqiRevealedViewPiece | BanqiHiddenViewPiece;

export interface BanqiViewState {
  readonly board: (BanqiViewPiece | null)[][];
  readonly currentPlayer: BanqiPlayer;
  readonly player1Color: BanqiPlayer | null;
  readonly winner: BanqiPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
}
