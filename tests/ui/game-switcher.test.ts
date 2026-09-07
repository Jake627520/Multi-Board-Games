import { describe, expect, it } from "vitest";
import { createGameRegistry } from "../../src/games/registry";
import { GameSession } from "../../src/core/game/session";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";

describe("UI Integration & Multi-Game Registration", () => {
  it("registers both Xiangqi and Gomoku in the platform registry for switcher consumption", () => {
    const registry = createGameRegistry();
    const games = registry.list();

    expect(games.map((g) => g.id)).toEqual(
      expect.arrayContaining(["xiangqi", "gomoku"])
    );
    expect(registry.get("xiangqi")?.name).toBe("中國象棋");
    expect(registry.get("gomoku")?.name).toBe("五子棋");
  });

  it("drives full Gomoku gameplay via Session lifecycle (as used by UI)", () => {
    const session = new GameSession(createGomokuEngine());

    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(0);

    // Black plays center (7, 7)
    session.move({ row: 7, col: 7 });
    expect(session.getCurrentPlayer()).toBe("white");
    expect(session.getHistory()).toHaveLength(1);

    // White plays (7, 8)
    session.move({ row: 7, col: 8 });
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(2);

    // Undo reverts White stone
    const reverted = session.undo();
    expect(session.getCurrentPlayer()).toBe("white");
    expect(session.getHistory()).toHaveLength(1);
    expect(reverted.board[7][8]).toBeNull();
    expect(reverted.board[7][7]).toBe("black");

    // Reset restores completely empty board
    const resetState = session.reset();
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(0);
    expect(resetState.board[7][7]).toBeNull();
  });

  it("drives full Xiangqi gameplay via Session lifecycle (as used by UI)", () => {
    const session = new GameSession(createXiangqiEngine());
    expect(session.getCurrentPlayer()).toBe("red");

    // Red cannon to center (中炮)
    session.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(1);

    session.undo();
    expect(session.getCurrentPlayer()).toBe("red");
    expect(session.getHistory()).toHaveLength(0);
  });
});
