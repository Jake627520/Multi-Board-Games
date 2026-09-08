import type { Position } from "../../core/game/types";

export type GomokuPlayer = "black" | "white";

/** freestyle = 自由規則（預設）; forbidden_moves = 黑方禁手規則 */
export type GomokuRuleMode = "freestyle" | "forbidden_moves";

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
  /** 規則模式（開局時決定，整盤不變） */
  readonly ruleMode: GomokuRuleMode;
  /** 獲勝時的精確五連座標（用於 UI 高亮） */
  readonly winningLine?: ReadonlyArray<Position>;
}
