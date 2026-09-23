import type { Player, Position } from "../../core/game/types";

export type XiangqiPlayer = "red" | "black";
export type PieceType = "general" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";

export interface Piece {
  readonly id: string;
  readonly player: XiangqiPlayer;
  readonly type: PieceType;
  readonly position: Position;
}

export interface XiangqiState {
  readonly board: (Piece | null)[][];
  readonly currentPlayer: XiangqiPlayer;
  readonly winner: XiangqiPlayer | null;
  readonly moveNumber: number;
  readonly isDraw?: boolean;
  readonly terminationReason?:
    | "checkmate"
    | "stalemate"
    | "perpetual_check"
    // 保留值：長捉判負尚未實作，目前不會有任何程式路徑產出它（見 openspec/specs/xiangqi/game-end/spec.md §5.2）
    | "perpetual_chase"
    | "threefold_repetition"
    | "sixty_move_draw";
  readonly positionHistory?: readonly string[];
  readonly checkHistory?: readonly boolean[];
  readonly nonCaptureCount?: number;
}

export interface XiangqiMove {
  readonly from: Position;
  readonly to: Position;
}