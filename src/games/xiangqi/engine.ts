import type { GameEngine } from "../../core/game/types";
import { createInitialState } from "./setup";
import { applyMove, getLegalMoves, getWinner, isGameOver } from "./rules";
import type { XiangqiMove, XiangqiState } from "./types";

export function createXiangqiEngine(): GameEngine<XiangqiState, XiangqiMove> {
  return {
    id: "xiangqi",
    name: "中國象棋",
    description: "河界分兩岸，將帥不出九宮；車馬炮各展其能，擒王者勝。",
    boardSize: "9 × 10",
    latinName: "Xiangqi",
    accent: "accent",
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