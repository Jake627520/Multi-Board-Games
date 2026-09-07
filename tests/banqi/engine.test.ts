import { describe, it, expect } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { GameSession } from "../../src/core/game/session";

describe("Banqi Engine & Session Integration", () => {
  const engine = createBanqiEngine();

  it("registers with id 'banqi' and name '暗棋 (Banqi)'", () => {
    expect(engine.id).toBe("banqi");
    expect(engine.name).toContain("暗棋");
  });

  it("runs initial state with 32 flip moves available", () => {
    const state = engine.createInitialState();
    const legal = engine.getLegalMoves(state);
    expect(legal).toHaveLength(32);
    expect(legal.every((m) => m.type === "flip")).toBe(true);
  });

  it("drives full flip move lifecycle via GameSession", () => {
    const session = new GameSession(engine);
    const initialMoves = engine.getLegalMoves(session.getState());

    // Execute first flip
    const firstMove = initialMoves[0];
    session.move(firstMove);

    const stateAfter = session.getState();
    expect(stateAfter.player1Color).not.toBeNull();
    expect(session.getHistory()).toHaveLength(1);

    // Undo reverts back to unrevealed state
    session.undo();
    expect(session.getHistory()).toHaveLength(0);
    expect(session.getState().player1Color).toBeNull();
  });
});
