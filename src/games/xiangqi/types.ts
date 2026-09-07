import type { Player, Position } from "../../core/game/types";

export type PieceType = "general" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";

export interface Piece {
  readonly id: string;
  readonly player: Player;
  readonly type: PieceType;
  readonly position: Position;
}

export interface XiangqiState {
  readonly board: (Piece | null)[][];
  readonly currentPlayer: Player;
  readonly winner: Player | null;
  readonly moveNumber: number;
}

export interface XiangqiMove {
  readonly from: Position;
  readonly to: Position;
}