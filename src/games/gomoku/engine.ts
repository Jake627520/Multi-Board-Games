import type { GameEngine } from "../../core/game/types";
import { createInitialState } from "./board";
import { applyMove, getLegalMoves, getWinner, isGameOver } from "./rules";
import type { GomokuMove, GomokuRuleMode, GomokuState } from "./types";

export function createGomokuEngine(
  ruleMode: GomokuRuleMode = "freestyle"
): GameEngine<GomokuState, GomokuMove> {
  return {
    id: "gomoku",
    name: "五子棋",
    description: "黑先白後輪流落子，橫、直、斜任一方向先連成五子者勝。",
    boardSize: "15 × 15",
    latinName: "Gomoku",
    accent: "ink",
    createInitialState: () => createInitialState(ruleMode),
    getCurrentPlayer: (state) => state.currentPlayer,
    getLegalMoves,
    applyMove,
    isGameOver,
    getWinner,
    serialize: (state) => JSON.stringify(state),
    deserialize: (serialized) => JSON.parse(serialized) as GomokuState,
    projectView: (state) => ({ ...state, board: state.board.map((row) => [...row]) }),
    serializeView: (viewState) => JSON.stringify(viewState),
  };
}
