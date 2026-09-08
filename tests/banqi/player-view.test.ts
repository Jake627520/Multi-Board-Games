import { describe, it, expect } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { emptyBoard } from "../../src/games/banqi/board";
import type { BanqiFullState, BanqiPiece } from "../../src/games/banqi/types";
import type { GameViewContext } from "../../src/core/game/types";

describe("011 Banqi Generic Player & Spectator View Security Tests", () => {
  const engine = createBanqiEngine();

  function createTestState(): BanqiFullState {
    const board = emptyBoard();
    const hiddenGeneral: BanqiPiece = {
      id: "red-general-1",
      player: "red",
      type: "general",
      rank: 7,
      isRevealed: false,
    };
    const revealedSoldier: BanqiPiece = {
      id: "black-soldier-1",
      player: "black",
      type: "soldier",
      rank: 1,
      isRevealed: true,
    };
    const hiddenChariot: BanqiPiece = {
      id: "black-chariot-1",
      player: "black",
      type: "chariot",
      rank: 4,
      isRevealed: false,
    };

    board[0][0] = hiddenGeneral;
    board[0][1] = revealedSoldier;
    board[0][2] = hiddenChariot;

    return {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 5,
    };
  }

  // Test 1: RED player cannot see hidden identity
  it("Test 1: RED player cannot see hidden identity", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "player", player: "red" };

    const view = engine.projectView(state, context);
    const hidden00 = view.board[0][0];
    const hidden02 = view.board[0][2];

    expect(hidden00?.isRevealed).toBe(false);
    expect("type" in (hidden00 || {})).toBe(false);
    expect("rank" in (hidden00 || {})).toBe(false);
    expect("player" in (hidden00 || {})).toBe(false);

    expect(hidden02?.isRevealed).toBe(false);
    expect("type" in (hidden02 || {})).toBe(false);
  });

  // Test 2: BLACK player cannot see hidden identity
  it("Test 2: BLACK player cannot see hidden identity", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "player", player: "black" };

    const view = engine.projectView(state, context);
    const hidden00 = view.board[0][0];
    const hidden02 = view.board[0][2];

    expect(hidden00?.isRevealed).toBe(false);
    expect("type" in (hidden00 || {})).toBe(false);
    expect(hidden02?.isRevealed).toBe(false);
    expect("type" in (hidden02 || {})).toBe(false);
  });

  // Test 3: Spectator cannot see hidden identity
  it("Test 3: Spectator cannot see hidden identity", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "spectator", player: null };

    const view = engine.projectView(state, context);
    const hidden00 = view.board[0][0];

    expect(hidden00?.isRevealed).toBe(false);
    expect("type" in (hidden00 || {})).toBe(false);
    expect("rank" in (hidden00 || {})).toBe(false);
  });

  // Test 4: Revealed pieces remain visible
  it("Test 4: Revealed pieces remain visible with full public attributes", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "player", player: "red" };

    const view = engine.projectView(state, context);
    const revealed01 = view.board[0][1];

    expect(revealed01?.isRevealed).toBe(true);
    expect(revealed01 && "type" in revealed01 ? revealed01.type : null).toBe("soldier");
    expect(revealed01 && "player" in revealed01 ? revealed01.player : null).toBe("black");
    expect(revealed01 && "rank" in revealed01 ? revealed01.rank : null).toBe(1);
  });

  // Test 5: Projection must not mutate full state
  it("Test 5: Projection must not mutate full state", () => {
    const state = createTestState();
    const before = engine.serialize(state);

    const context: GameViewContext = { role: "player", player: "red" };
    engine.projectView(state, context);

    const after = engine.serialize(state);
    expect(after).toBe(before);
  });

  // Test 6: View state cannot accidentally expose full-state reference
  it("Test 6: View state board is a structurally independent copy", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "spectator", player: null };

    const view = engine.projectView(state, context);
    expect(view).not.toBe(state);
    expect(view.board).not.toBe(state.board);
    expect(view.board[0]).not.toBe(state.board[0]);
    expect(view.board[0][0]).not.toBe(state.board[0][0]);
  });

  // Test 7: serializeView cannot reveal hidden identity
  it("Test 7: serializeView does not reveal hidden piece type, rank, or player strings", () => {
    const state = createTestState();
    const context: GameViewContext = { role: "spectator", player: null };

    const view = engine.projectView(state, context);
    const serialized = engine.serializeView(view);

    expect(serialized).not.toContain("general");
    expect(serialized).not.toContain("chariot");
    expect(serialized).toContain("soldier"); // revealed piece is present
  });
});
