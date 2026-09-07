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

export interface BanqiState {
  readonly board: (BanqiPiece | null)[][]; // 4 rows x 8 columns
  readonly currentPlayer: BanqiPlayer;
  readonly player1Color: BanqiPlayer | null; // Color chosen by first flip
  readonly winner: BanqiPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
}
