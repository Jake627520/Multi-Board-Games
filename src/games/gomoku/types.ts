import type { Position } from "../../core/game/types";

export type GomokuPlayer = "black" | "white";

export interface GomokuMove extends Position {
  readonly row: number;
  readonly col: number;
}

export interface GomokuState {
  readonly board: (GomokuPlayer | null)[][];
  readonly currentPlayer: GomokuPlayer;
  readonly winner: GomokuPlayer | null;
  readonly isDraw?: boolean;
  readonly moveNumber: number;
}
