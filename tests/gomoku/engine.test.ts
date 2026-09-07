import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGameRegistry } from "../../src/games/registry";

describe("Gomoku Engine & Platform Integration", () => {
  it("implements GameEngine protocol with id 'gomoku'", () => {
    const engine = createGomokuEngine();
    expect(engine.id).toBe("gomoku");
    expect(engine.name).toBe("五子棋");

    const s = engine.createInitialState();
    expect(engine.getCurrentPlayer(s)).toBe("black");
    expect(engine.isGameOver(s)).toBe(false);
    expect(engine.getWinner(s)).toBeNull();
  });

  it("losslessly serializes and deserializes game states", () => {
    const engine = createGomokuEngine();
    let s = engine.createInitialState();
    s = engine.applyMove(s, { row: 7, col: 7 });

    const serialized = engine.serialize(s);
    expect(typeof serialized).toBe("string");

    const restored = engine.deserialize(serialized);
    expect(restored).toEqual(s);
    expect(engine.getCurrentPlayer(restored)).toBe("white");
    expect(engine.getLegalMoves(restored)).toEqual(engine.getLegalMoves(s));
  });

  it("integrates seamlessly with GameSession for moves, history, and undo", () => {
    const engine = createGomokuEngine();
    const session = new GameSession(engine);

    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(0);

    session.move({ row: 7, col: 7 });
    expect(session.getCurrentPlayer()).toBe("white");
    expect(session.getHistory()).toHaveLength(1);
    expect(session.getState().board[7][7]).toBe("black");

    // Undo move
    const reverted = session.undo();
    expect(reverted.board[7][7]).toBeNull();
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(0);
  });

  it("is discoverable via the platform GameRegistry", () => {
    const registry = createGameRegistry();
    const engine = registry.get("gomoku");

    expect(engine).toBeDefined();
    expect(engine?.id).toBe("gomoku");
    expect(engine?.name).toBe("五子棋");
  });
});
