import { describe, it, expect } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { toXiangqiNotation } from "../../src/games/xiangqi/notation";
import { emptyBoard } from "../../src/games/xiangqi/board";
import type { Piece, XiangqiState } from "../../src/games/xiangqi/types";

describe("Xiangqi Move Notation", () => {
  const engine = createXiangqiEngine();

  it("formats Red Central Cannon move as 炮二平五 and 炮八平五", () => {
    const initialState = engine.createInitialState();
    // Red Cannon from col 7 (file 二) -> col 4 (file 五)
    const move2 = { from: { row: 7, col: 7 }, to: { row: 7, col: 4 } };
    expect(toXiangqiNotation(move2, initialState)).toBe("炮二平五");

    // Red Cannon from col 1 (file 八) -> col 4 (file 五)
    const move8 = { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } };
    expect(toXiangqiNotation(move8, initialState)).toBe("炮八平五");
  });

  it("formats Red Knight move as 馬八進七", () => {
    const initialState = engine.createInitialState();
    // Red Horse from (9, 1) -> (7, 2)
    const move = { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } };
    const notation = toXiangqiNotation(move, initialState);
    expect(notation).toBe("馬八進七");
  });

  it("formats Black Knight move as 馬2進3", () => {
    const initialState = engine.createInitialState();
    // Black Horse from (0, 1) -> (2, 2)
    const move = { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } };
    const notation = toXiangqiNotation(move, initialState);
    expect(notation).toBe("馬2進3");
  });

  it("formats Black Central Cannon move as 炮8平5", () => {
    const initialState = engine.createInitialState();
    // Black Cannon from (2, 7) -> (2, 4)
    const move = { from: { row: 2, col: 7 }, to: { row: 2, col: 4 } };
    const notation = toXiangqiNotation(move, initialState);
    expect(notation).toBe("炮8平5");
  });

  it("formats straight advance and retreat with step counts", () => {
    const initialState = engine.createInitialState();
    // Red Chariot from (9, 0) -> (8, 0)
    const move = { from: { row: 9, col: 0 }, to: { row: 8, col: 0 } };
    const notation = toXiangqiNotation(move, initialState);
    expect(notation).toBe("車九進一");

    // Retreat test
    const board = emptyBoard();
    const chariot: Piece = { id: "rc", player: "red", type: "chariot", position: { row: 5, col: 0 } };
    board[5][0] = chariot;
    const customState: XiangqiState = {
      board,
      currentPlayer: "red",
      winner: null,
      moveNumber: 5,
    };
    const retreatMove = { from: { row: 5, col: 0 }, to: { row: 8, col: 0 } };
    expect(toXiangqiNotation(retreatMove, customState)).toBe("車九退三");
  });

  it("disambiguates same-file double pieces as 前 and 後", () => {
    const board = emptyBoard();
    const frontChariot: Piece = { id: "rc1", player: "red", type: "chariot", position: { row: 5, col: 8 } }; // closer to enemy
    const rearChariot: Piece = { id: "rc2", player: "red", type: "chariot", position: { row: 9, col: 8 } };  // further from enemy
    board[5][8] = frontChariot;
    board[9][8] = rearChariot;

    const state: XiangqiState = {
      board,
      currentPlayer: "red",
      winner: null,
      moveNumber: 10,
    };

    // Front chariot advances 1 step
    const moveFront = { from: { row: 5, col: 8 }, to: { row: 4, col: 8 } };
    expect(toXiangqiNotation(moveFront, state)).toBe("前車進一");

    // Rear chariot moves horizontally
    const moveRear = { from: { row: 9, col: 8 }, to: { row: 9, col: 5 } };
    expect(toXiangqiNotation(moveRear, state)).toBe("後車平四");
  });
});
