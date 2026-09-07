import { describe, expect, it } from "vitest";
import { GameRegistry } from "../../src/core/game/registry";
import type { GameEngine, GameId, Player } from "../../src/core/game/types";

function createMockEngine(id: GameId, name: string): GameEngine<{ turn: number }, { step: number }> {
  return {
    id,
    name,
    createInitialState: () => ({ turn: 0 }),
    getCurrentPlayer: () => "red",
    getLegalMoves: () => [{ step: 1 }],
    applyMove: (state, move) => ({ turn: state.turn + move.step }),
    isGameOver: () => false,
    getWinner: () => null,
    serialize: (state) => JSON.stringify(state),
    deserialize: (serialized) => JSON.parse(serialized),
  };
}

describe("GameRegistry", () => {
  it("registers and retrieves a game engine", () => {
    const registry = new GameRegistry();
    const mock = createMockEngine("xiangqi", "中國象棋");
    registry.register(mock);

    expect(registry.get("xiangqi")).toBe(mock);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].id).toBe("xiangqi");
  });

  it("throws when registering duplicate game engine IDs", () => {
    const registry = new GameRegistry();
    registry.register(createMockEngine("xiangqi", "Engine 1"));

    expect(() => {
      registry.register(createMockEngine("xiangqi", "Engine 2"));
    }).toThrow("Game engine already registered: xiangqi");
  });

  it("returns undefined for unregistered game engines", () => {
    const registry = new GameRegistry();
    expect(registry.get("gomoku")).toBeUndefined();
  });
});
