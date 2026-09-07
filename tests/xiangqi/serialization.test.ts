import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";

describe("Xiangqi State Serialization", () => {
  it("losslessly restores state after serialize and deserialize", () => {
    const engine = createXiangqiEngine();
    const initial = engine.createInitialState();

    const serialized = engine.serialize(initial);
    expect(typeof serialized).toBe("string");

    const restored = engine.deserialize(serialized);
    expect(restored).toEqual(initial);
    expect(engine.getLegalMoves(restored)).toEqual(engine.getLegalMoves(initial));
    expect(engine.getCurrentPlayer(restored)).toBe("red");
  });

  it("restores state accurately mid-game after moves", () => {
    const engine = createXiangqiEngine();
    let state = engine.createInitialState();

    // Red cannon move: [7,1] -> [7,4] (中炮)
    state = engine.applyMove(state, {
      from: { row: 7, col: 1 },
      to: { row: 7, col: 4 },
    });

    const serialized = engine.serialize(state);
    const restored = engine.deserialize(serialized);

    expect(restored).toEqual(state);
    expect(restored.currentPlayer).toBe("black");
    expect(restored.moveNumber).toBe(2);
  });
});
