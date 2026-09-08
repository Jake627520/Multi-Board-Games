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
