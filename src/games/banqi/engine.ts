import type { GameEngine, Player } from "../../core/game/types";
import { createInitialBoard } from "./board";
import { applyMoveUnchecked, getLegalMoves, getWinner, isGameOver, maskHiddenState } from "./rules";
import type { BanqiMove, BanqiPlayer, BanqiState } from "./types";

export class BanqiEngine implements GameEngine<BanqiState, BanqiMove> {
  readonly id = "banqi";
  readonly name = "暗棋 (Banqi)";

  createInitialState(): BanqiState {
    return {
      board: createInitialBoard(),
      currentPlayer: "red", // placeholder until first flip
      player1Color: null,
      winner: null,
      moveNumber: 0,
    };
  }

  getCurrentPlayer(state: BanqiState): Player {
    return state.currentPlayer;
  }

  getLegalMoves(state: BanqiState): BanqiMove[] {
    return getLegalMoves(state);
  }

  applyMove(state: BanqiState, move: BanqiMove): BanqiState {
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

  isGameOver(state: BanqiState): boolean {
    return isGameOver(state);
  }

  getWinner(state: BanqiState): Player | null {
    return getWinner(state);
  }

  serialize(state: BanqiState): string {
    return JSON.stringify(state);
  }

  serializeMasked(state: BanqiState): string {
    return JSON.stringify(maskHiddenState(state));
  }

  deserialize(serialized: string): BanqiState {
    return JSON.parse(serialized) as BanqiState;
  }
}

export function createBanqiEngine(): BanqiEngine {
  return new BanqiEngine();
}
