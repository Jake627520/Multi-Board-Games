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
    projectView: (state) => state,
    serializeView: (viewState) => JSON.stringify(viewState),
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

  it("accepts arbitrary game IDs and novel player models without core modifications", () => {
    const registry = new GameRegistry();
    type GomokuPlayer = "black" | "white";
    interface GomokuState {
      board: (GomokuPlayer | null)[][];
      currentPlayer: GomokuPlayer;
    }
    const othelloEngine: GameEngine<GomokuState, { row: number; col: number }> = {
      // GameId 現在是已註冊三種棋的封閉聯集；這裡刻意用型別斷言繞過，
      // 因為這個測試驗證的是 GameRegistry 本身在「執行期」對任意 id 沒有限制
      // （見上方案名：accepts arbitrary game IDs ... without core modifications）。
      id: "othello-custom" as GameId,
      name: "Othello / Reversi",
      createInitialState: () => ({ board: [], currentPlayer: "black" }),
      getCurrentPlayer: (s) => s.currentPlayer,
      getLegalMoves: () => [{ row: 2, col: 3 }],
      applyMove: (s) => ({ ...s, currentPlayer: s.currentPlayer === "black" ? "white" : "black" }),
      isGameOver: () => false,
      getWinner: () => null,
      serialize: (s) => JSON.stringify(s),
      deserialize: (str) => JSON.parse(str),
      projectView: (s) => s,
      serializeView: (v) => JSON.stringify(v),
    };

    registry.register(othelloEngine);
    expect(registry.get("othello-custom" as GameId)).toBe(othelloEngine);
  });
});
