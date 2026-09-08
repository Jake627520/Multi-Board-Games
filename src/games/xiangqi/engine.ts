import type { GameEngine } from "../../core/game/types";
import { createInitialState } from "./setup";
import { applyMove, getLegalMoves, getWinner, isGameOver } from "./rules";
import type { XiangqiMove, XiangqiState } from "./types";

export function createXiangqiEngine(): GameEngine<XiangqiState, XiangqiMove> {
  return {
    id: "xiangqi",
    name: "中國象棋",
    createInitialState,
    getCurrentPlayer: (state) => state.currentPlayer,
    getLegalMoves: (state) => getLegalMoves(state),
    applyMove,
    isGameOver,
    getWinner,
    serialize: (state) => JSON.stringify(state),
    deserialize: (serialized) => JSON.parse(serialized) as XiangqiState,
    projectView: (state) => ({ ...state, board: state.board.map((row) => [...row]) }),
    serializeView: (viewState) => JSON.stringify(viewState),
  };
}