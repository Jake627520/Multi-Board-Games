import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";

describe("GameSession", () => {
  it("initializes with engine initial state and empty history", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);

    expect(session.getState()).toEqual(engine.createInitialState());
    expect(session.getHistory()).toEqual([]);
    expect(session.getCurrentPlayer()).toBe("red");
  });

  it("executes legal move, updates state and records history", () => {
    const session = new GameSession(createXiangqiEngine());
    const legalMove = { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } };

    const nextState = session.move(legalMove);
    expect(nextState.currentPlayer).toBe("black");
    expect(session.getHistory()).toHaveLength(1);
    expect(session.getHistory()[0]).toEqual({ move: legalMove, player: "red" });
    expect(session.getCurrentPlayer()).toBe("black");
  });

  it("rejects illegal moves with an error and does not mutate history", () => {
    const session = new GameSession(createXiangqiEngine());
    const illegalMove = { from: { row: 9, col: 4 }, to: { row: 5, col: 4 } };

    expect(() => session.move(illegalMove)).toThrow("Illegal move");
    expect(session.getHistory()).toHaveLength(0);
    expect(session.getCurrentPlayer()).toBe("red");
  });

  it("supports undo and reverts to prior state and history", () => {
    const session = new GameSession(createXiangqiEngine());
    const before = session.getState();
    const move1 = { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } };

    session.move(move1);
    expect(session.getHistory()).toHaveLength(1);

    const reverted = session.undo();
    expect(reverted).toEqual(before);
    expect(session.getHistory()).toHaveLength(0);
    expect(session.getCurrentPlayer()).toBe("red");
  });

  it("treats undo on initial state as a safe no-op", () => {
    const session = new GameSession(createXiangqiEngine());
    const before = session.getState();

    const result = session.undo();
    expect(result).toEqual(before);
    expect(session.getHistory()).toHaveLength(0);
  });

  it("resets session back to clean initial state and purges history", () => {
    const session = new GameSession(createXiangqiEngine());
    session.move({ from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
    session.move({ from: { row: 3, col: 0 }, to: { row: 4, col: 0 } });
    expect(session.getHistory()).toHaveLength(2);

    const resetState = session.reset();
    expect(resetState.currentPlayer).toBe("red");
    expect(session.getHistory()).toHaveLength(0);

    // After reset, undo should be no-op
    session.undo();
    expect(session.getHistory()).toHaveLength(0);
  });
});
