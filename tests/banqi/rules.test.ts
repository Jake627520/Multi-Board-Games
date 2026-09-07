import { describe, it, expect } from "vitest";
import { emptyBoard } from "../../src/games/banqi/board";
import { canCapture, getLegalMoves, applyMoveUnchecked, isGameOver } from "../../src/games/banqi/rules";
import type { BanqiPiece, BanqiState } from "../../src/games/banqi/types";

describe("Banqi Rules & Capture Hierarchy", () => {
  const redGeneral: BanqiPiece = { id: "r-g", player: "red", type: "general", rank: 7, isRevealed: true };
  const redAdvisor: BanqiPiece = { id: "r-a", player: "red", type: "advisor", rank: 6, isRevealed: true };
  const redSoldier: BanqiPiece = { id: "r-s", player: "red", type: "soldier", rank: 1, isRevealed: true };
  const redCannon: BanqiPiece = { id: "r-c", player: "red", type: "cannon", rank: 2, isRevealed: true };

  const blackGeneral: BanqiPiece = { id: "b-g", player: "black", type: "general", rank: 7, isRevealed: true };
  const blackChariot: BanqiPiece = { id: "b-r", player: "black", type: "chariot", rank: 4, isRevealed: true };
  const blackSoldier: BanqiPiece = { id: "b-s", player: "black", type: "soldier", rank: 1, isRevealed: true };
  const hiddenPiece: BanqiPiece = { id: "b-h", player: "black", type: "horse", rank: 3, isRevealed: false };

  it("handles standard rank hierarchy captures correctly", () => {
    // General (7) eats Chariot (4)
    expect(canCapture(redGeneral, blackChariot)).toBe(true);
    // Chariot (4) cannot eat General (7)
    expect(canCapture(blackChariot, redGeneral)).toBe(false);
    // Equal rank: General (7) eats General (7)
    expect(canCapture(redGeneral, blackGeneral)).toBe(true);
  });

  it("enforces Soldier vs General exception", () => {
    // Soldier (1) CAN eat General (7)
    expect(canCapture(redSoldier, blackGeneral)).toBe(true);
    expect(canCapture(blackSoldier, redGeneral)).toBe(true);

    // General (7) CANNOT eat Soldier (1)
    expect(canCapture(redGeneral, blackSoldier)).toBe(false);
    expect(canCapture(blackGeneral, redSoldier)).toBe(false);
  });

  it("forbids capturing face-down pieces", () => {
    expect(canCapture(redGeneral, hiddenPiece)).toBe(false);
    expect(canCapture(redSoldier, hiddenPiece)).toBe(false);
  });

  it("generates Cannon jump capture when exactly 1 piece intervenes", () => {
    // Setup: Red Cannon at (0, 0), Screen at (0, 2), Target Black General at (0, 5)
    const board = emptyBoard();
    board[0][0] = { ...redCannon };
    board[0][2] = { ...hiddenPiece }; // Screen can be face down
    board[0][5] = { ...blackGeneral }; // Target face up enemy

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 5,
    };

    const legal = getLegalMoves(state);
    const jumpMove = legal.find(
      (m) => m.type === "move" && m.from.row === 0 && m.from.col === 0 && m.to.row === 0 && m.to.col === 5
    );
    expect(jumpMove).toBeDefined();

    // But Cannon CANNOT jump if 2 pieces intervene
    board[0][3] = { ...redAdvisor };
    const legal2 = getLegalMoves(state);
    const invalidJump = legal2.find(
      (m) => m.type === "move" && m.from.row === 0 && m.from.col === 0 && m.to.row === 0 && m.to.col === 5
    );
    expect(invalidJump).toBeUndefined();
  });

  it("handles first flip color assignment", () => {
    const board = emptyBoard();
    board[0][0] = { ...hiddenPiece }; // belongs to black, face down

    const state: BanqiState = {
      board,
      currentPlayer: "red", // initial turn
      player1Color: null,   // unassigned
      winner: null,
      moveNumber: 0,
    };

    const nextState = applyMoveUnchecked(state, { type: "flip", pos: { row: 0, col: 0 } });
    expect(nextState.board[0][0]?.isRevealed).toBe(true);
    // Player 1 flipped a black piece -> Player 1 is assigned black!
    expect(nextState.player1Color).toBe("black");
    // Next player is red (opponent)
    expect(nextState.currentPlayer).toBe("red");
  });

  it("detects game over when all pieces of one side are captured", () => {
    const board = emptyBoard();
    // Only Red pieces remain
    board[0][0] = { ...redGeneral };

    const state: BanqiState = {
      board,
      currentPlayer: "black",
      player1Color: "red",
      winner: null,
      moveNumber: 20,
    };

    expect(isGameOver(state)).toBe(true);
  });
});
