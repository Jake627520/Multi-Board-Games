import { describe, it, expect } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { emptyBoard } from "../../src/games/banqi/board";
import {
  canCapture,
  getLegalMoves,
  applyMoveUnchecked,
  projectBanqiView,
  isGameOver,
  getWinner,
} from "../../src/games/banqi/rules";
import { GameSession } from "../../src/core/game/session";
import type { BanqiPiece, BanqiState } from "../../src/games/banqi/types";
import type { GameViewContext } from "../../src/core/game/types";

describe("010 Banqi Rules & Hidden Information Audit", () => {
  const engine = createBanqiEngine();

  // P0 - 1: Hidden Information Masking & View Projection
  it("Audit #1: projectBanqiView strips private piece identity from face-down pieces", () => {
    const board = emptyBoard();
    board[0][0] = {
      id: "red-general-1",
      player: "red",
      type: "general",
      rank: 7,
      isRevealed: false,
    };
    board[0][1] = {
      id: "black-soldier-1",
      player: "black",
      type: "soldier",
      rank: 1,
      isRevealed: true,
    };

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 1,
    };

    const context: GameViewContext = { role: "spectator", player: null };
    const view = projectBanqiView(state, context);
    const hiddenPiece = view.board[0][0];
    const revealedPiece = view.board[0][1];

    // Face-down piece must have sensitive data omitted
    expect(hiddenPiece?.isRevealed).toBe(false);
    expect("player" in (hiddenPiece || {})).toBe(false);
    expect("type" in (hiddenPiece || {})).toBe(false);
    expect("rank" in (hiddenPiece || {})).toBe(false);

    // Face-up piece retains authentic identity
    expect(revealedPiece?.isRevealed).toBe(true);
    expect(revealedPiece && "player" in revealedPiece ? revealedPiece.player : null).toBe("black");
    expect(revealedPiece && "type" in revealedPiece ? revealedPiece.type : null).toBe("soldier");
    expect(revealedPiece && "rank" in revealedPiece ? revealedPiece.rank : null).toBe(1);

    // JSON serialization of view state must not contain "general" or "red-general"
    const json = engine.serializeView(view);
    expect(json).not.toContain("general");
    expect(json).toContain("soldier");
  });

  // P0 - 2: Face-down piece immunity
  it("Audit #2: Face-down pieces are 100% immune from adjacent captures and cannon jumps", () => {
    const board = emptyBoard();
    const redGeneral: BanqiPiece = { id: "r-g", player: "red", type: "general", rank: 7, isRevealed: true };
    const hiddenDefender: BanqiPiece = { id: "b-d", player: "black", type: "soldier", rank: 1, isRevealed: false };
    const redCannon: BanqiPiece = { id: "r-c", player: "red", type: "cannon", rank: 2, isRevealed: true };
    const screen: BanqiPiece = { id: "s-1", player: "black", type: "horse", rank: 3, isRevealed: true };

    board[0][0] = redGeneral;
    board[0][1] = hiddenDefender;
    board[1][0] = redCannon;
    board[1][2] = screen;
    board[1][4] = { ...hiddenDefender }; // face-down target behind screen

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 2,
    };

    // Neither general adjacent capture nor cannon jump capture can target face-down piece
    expect(canCapture(redGeneral, hiddenDefender)).toBe(false);

    const legal = getLegalMoves(state);
    const illegalGeneralCapture = legal.find(
      (m) => m.type === "move" && m.from.row === 0 && m.from.col === 0 && m.to.row === 0 && m.to.col === 1
    );
    expect(illegalGeneralCapture).toBeUndefined();

    const illegalCannonJump = legal.find(
      (m) => m.type === "move" && m.from.row === 1 && m.from.col === 0 && m.to.row === 1 && m.to.col === 4
    );
    expect(illegalCannonJump).toBeUndefined();
  });

  // P0 - 3: First flip side assignment and turn alternation
  it("Audit #3: First flip establishes Player 1 color and passes turn to opponent", () => {
    const board = emptyBoard();
    board[0][0] = { id: "r-1", player: "red", type: "horse", rank: 3, isRevealed: false };

    const initial: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: null,
      winner: null,
      moveNumber: 0,
    };

    const next = applyMoveUnchecked(initial, { type: "flip", pos: { row: 0, col: 0 } });
    expect(next.player1Color).toBe("red");
    expect(next.currentPlayer).toBe("black");
  });

  // P0 - 4: Rank hierarchy and Soldier/General exception
  it("Audit #4: Complete hierarchy and Soldier/General exception", () => {
    const general: BanqiPiece = { id: "g", player: "red", type: "general", rank: 7, isRevealed: true };
    const advisor: BanqiPiece = { id: "a", player: "black", type: "advisor", rank: 6, isRevealed: true };
    const elephant: BanqiPiece = { id: "e", player: "black", type: "elephant", rank: 5, isRevealed: true };
    const chariot: BanqiPiece = { id: "ch", player: "black", type: "chariot", rank: 4, isRevealed: true };
    const horse: BanqiPiece = { id: "h", player: "black", type: "horse", rank: 3, isRevealed: true };
    const cannon: BanqiPiece = { id: "c", player: "black", type: "cannon", rank: 2, isRevealed: true };
    const soldier: BanqiPiece = { id: "s", player: "black", type: "soldier", rank: 1, isRevealed: true };

    // General eats 6..2
    expect(canCapture(general, advisor)).toBe(true);
    expect(canCapture(general, elephant)).toBe(true);
    expect(canCapture(general, chariot)).toBe(true);
    expect(canCapture(general, horse)).toBe(true);
    expect(canCapture(general, cannon)).toBe(true);

    // General CANNOT eat Soldier (1)
    expect(canCapture(general, soldier)).toBe(false);

    // Soldier (1) CAN eat General (7)
    expect(canCapture(soldier, general)).toBe(true);
  });

  // P0 - 5: Cannon jumps over exactly 1 piece
  it("Audit #5: Cannon requires exactly 1 screen piece to capture", () => {
    const board = emptyBoard();
    const cannon: BanqiPiece = { id: "rc", player: "red", type: "cannon", rank: 2, isRevealed: true };
    const screen1: BanqiPiece = { id: "s1", player: "red", type: "horse", rank: 3, isRevealed: true };
    const screen2: BanqiPiece = { id: "s2", player: "black", type: "advisor", rank: 6, isRevealed: true };
    const target: BanqiPiece = { id: "bt", player: "black", type: "general", rank: 7, isRevealed: true };

    board[0][0] = cannon;
    board[0][2] = screen1;
    board[0][4] = target;

    const state1: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 5,
    };

    // Exactly 1 screen -> legal
    expect(getLegalMoves(state1)).toContainEqual({
      type: "move",
      from: { row: 0, col: 0 },
      to: { row: 0, col: 4 },
    });

    // 2 screens -> illegal
    board[0][3] = screen2;
    expect(getLegalMoves(state1)).not.toContainEqual({
      type: "move",
      from: { row: 0, col: 0 },
      to: { row: 0, col: 4 },
    });
  });

  // P0 - 6: 32 Piece count verification
  it("Audit #6: Initial state has 32 pieces, 16 per side", () => {
    const state = engine.createInitialState();
    let red = 0;
    let black = 0;
    for (const row of state.board) {
      for (const p of row) {
        if (p?.player === "red") red++;
        if (p?.player === "black") black++;
      }
    }
    expect(red).toBe(16);
    expect(black).toBe(16);
  });

  // P0 - 7: Undo preserves hidden state authenticity
  it("Audit #7: Undo restores face-down piece without altering real identity", () => {
    const session = new GameSession(engine);
    const initialPiece = session.getState().board[0][0];
    expect(initialPiece?.isRevealed).toBe(false);

    // Flip it
    session.move({ type: "flip", pos: { row: 0, col: 0 } });
    expect(session.getState().board[0][0]?.isRevealed).toBe(true);

    // Undo
    session.undo();
    const restoredPiece = session.getState().board[0][0];
    expect(restoredPiece?.isRevealed).toBe(false);
    expect(restoredPiece?.id).toBe(initialPiece?.id);
    expect(restoredPiece?.type).toBe(initialPiece?.type);
    expect(restoredPiece?.player).toBe(initialPiece?.player);
  });

  // P1 - 8: Stalemate detection
  it("Audit #8: Player with zero legal moves loses to stalemate", () => {
    const board = emptyBoard();
    // Red general at (0, 0) surrounded by revealed Red pieces (no moves possible)
    board[0][0] = { id: "r1", player: "red", type: "soldier", rank: 1, isRevealed: true };
    board[0][1] = { id: "r2", player: "red", type: "horse", rank: 3, isRevealed: true };
    board[1][0] = { id: "r3", player: "red", type: "horse", rank: 3, isRevealed: true };

    const state: BanqiState = {
      board,
      currentPlayer: "black",
      player1Color: "red",
      winner: null,
      moveNumber: 10,
    };

    // Black has 0 pieces and 0 moves -> Black loses, Red wins
    expect(isGameOver(state)).toBe(true);
    expect(getWinner(state)).toBe("red");
  });

  // P1 - 9: Wipeout detection
  it("Audit #9: Eliminating all 16 enemy pieces triggers victory", () => {
    const board = emptyBoard();
    board[0][0] = { id: "r-g", player: "red", type: "general", rank: 7, isRevealed: true };

    const state: BanqiState = {
      board,
      currentPlayer: "black",
      player1Color: "red",
      winner: null,
      moveNumber: 30,
    };

    expect(isGameOver(state)).toBe(true);
    expect(getWinner(state)).toBe("red");
  });

  // P1 - 10: Choice between flip and move
  it("Audit #10: Player with both revealed pieces and unrevealed pieces can choose to flip or move", () => {
    const board = emptyBoard();
    board[0][0] = { id: "r-g", player: "red", type: "general", rank: 7, isRevealed: true };
    board[3][7] = { id: "hidden", player: "black", type: "soldier", rank: 1, isRevealed: false };

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 6,
    };

    const legal = getLegalMoves(state);
    const hasFlip = legal.some((m) => m.type === "flip");
    const hasMove = legal.some((m) => m.type === "move");

    expect(hasFlip).toBe(true);
    expect(hasMove).toBe(true);
  });
});
