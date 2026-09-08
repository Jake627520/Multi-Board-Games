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
    createInitialState: () => createInitialState(ruleMode),
    getCurrentPlayer: (state) => state.currentPlayer,
    getLegalMoves,
    applyMove,
    isGameOver,
    getWinner,
    serialize: (state) => JSON.stringify(state),
    deserialize: (serialized) => JSON.parse(serialized) as GomokuState,
    projectView: (state) => state,
    serializeView: (viewState) => JSON.stringify(viewState),
  };
}
