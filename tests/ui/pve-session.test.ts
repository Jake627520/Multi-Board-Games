import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGomokuAiLevel1 } from "../../src/games/gomoku/ai";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel1 } from "../../src/games/xiangqi/ai";

describe("UI / Hook PvE AI Integration Lifecycle", () => {
  it("executes an interactive Gomoku PvE match with AI opponent", async () => {
    const engine = createGomokuEngine();
    const session = new GameSession(engine);
    const ai = createGomokuAiLevel1();

    // Human plays Black: center (7, 7)
    session.move({ row: 7, col: 7 });
    expect(session.getCurrentPlayer()).toBe("white");
    expect(session.getHistory()).toHaveLength(1);

    // AI is White: selects move
    const legalMoves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), legalMoves);

    expect(legalMoves).toContainEqual(aiMove);

    // Session applies AI move
    session.move(aiMove);
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(2);

    // Human can undo AI move + human move
    session.undo(); // undoes AI move
    expect(session.getCurrentPlayer()).toBe("white");
    session.undo(); // undoes Human move
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(0);
  });

  it("executes an interactive Xiangqi PvE match with AI opponent", async () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);
    const ai = createXiangqiAiLevel1();

    // Human plays Red: moves Central Cannon (7, 1) -> (7, 4)
    session.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    expect(session.getCurrentPlayer()).toBe("black");

    // AI is Black: selects move
    const legalMoves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), legalMoves);

    const isLegal = legalMoves.some(
      (m) =>
        m.from.row === aiMove.from.row &&
        m.from.col === aiMove.from.col &&
        m.to.row === aiMove.to.row &&
        m.to.col === aiMove.to.col
    );
    expect(isLegal).toBe(true);

    // Session applies AI move
    session.move(aiMove);
    expect(session.getCurrentPlayer()).toBe("red");
    expect(session.getHistory()).toHaveLength(2);
  });
});
