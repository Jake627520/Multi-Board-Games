import type { GameEngine } from "../../core/game/types";
import { createInitialState } from "./board";
import { applyMove, getLegalMoves, getWinner, isGameOver } from "./rules";
import type { GomokuMove, GomokuState } from "./types";

export function createGomokuEngine(): GameEngine<GomokuState, GomokuMove> {
  return {
    id: "gomoku",
    name: "五子棋",
    createInitialState,
    getCurrentPlayer: (state) => state.currentPlayer,
    getLegalMoves,
    applyMove,
    isGameOver,
    getWinner,
    serialize: (state) => JSON.stringify(state),
    deserialize: (serialized) => JSON.parse(serialized) as GomokuState,
  };
}
