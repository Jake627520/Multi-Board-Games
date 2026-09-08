import type { GameEngine, GameViewContext, Player } from "../../core/game/types";
import { createInitialBoard } from "./board";
import { applyMoveUnchecked, getLegalMoves, getWinner, isGameOver, projectBanqiView } from "./rules";
import type { BanqiFullState, BanqiMove, BanqiPlayer, BanqiState, BanqiViewState } from "./types";

export class BanqiEngine implements GameEngine<BanqiFullState, BanqiMove, BanqiViewState> {
  readonly id = "banqi";
  readonly name = "暗棋 (Banqi)";

  createInitialState(): BanqiFullState {
    return {
      board: createInitialBoard(),
      currentPlayer: "red", // placeholder until first flip
      player1Color: null,
      winner: null,
      moveNumber: 0,
    };
  }

  getCurrentPlayer(state: BanqiFullState): Player {
    return state.currentPlayer;
  }

  getLegalMoves(state: BanqiFullState): BanqiMove[] {
    return getLegalMoves(state);
  }

  applyMove(state: BanqiFullState, move: BanqiMove): BanqiFullState {
    const legal = this.getLegalMoves(state);
    const isValid = legal.some(
      (m) =>
        m.type === move.type &&
        (m.type === "flip"
          ? m.pos.row === (move as { type: "flip"; pos: { row: number; col: number } }).pos.row &&
            m.pos.col === (move as { type: "flip"; pos: { row: number; col: number } }).pos.col
          : (m as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).from.row ===
              (move as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).from.row &&
            (m as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).from.col ===
              (move as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).from.col &&
            (m as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).to.row ===
              (move as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).to.row &&
            (m as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).to.col ===
              (move as { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } }).to.col)
    );

    if (!isValid) {
      throw new Error("Illegal Banqi move");
    }

    return applyMoveUnchecked(state, move);
  }

  isGameOver(state: BanqiFullState): boolean {
    return isGameOver(state);
  }

  getWinner(state: BanqiFullState): Player | null {
    return getWinner(state);
  }

  serialize(state: BanqiFullState): string {
    return JSON.stringify(state);
  }

  serializeView(viewState: BanqiViewState): string {
    return JSON.stringify(viewState);
  }

  projectView(state: BanqiFullState, context: GameViewContext): BanqiViewState {
    return projectBanqiView(state, context);
  }

  deserialize(serialized: string): BanqiFullState {
    return JSON.parse(serialized) as BanqiFullState;
  }
}

export function createBanqiEngine(): BanqiEngine {
  return new BanqiEngine();
}
