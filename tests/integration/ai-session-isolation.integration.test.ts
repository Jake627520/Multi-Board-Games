import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel1, createXiangqiAiLevel2 } from "../../src/games/xiangqi/ai";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGomokuAiLevel1, createGomokuAiLevel2 } from "../../src/games/gomoku/ai";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { GameSession } from "../../src/core/game/session";

describe("AI Integration, Legality & Session Isolation", () => {
  it("guarantees AI generated moves strictly pass GameEngine rule validation across all games", async () => {
    // Xiangqi Level 1 & Level 2
    const xEngine = createXiangqiEngine();
    const xState = xEngine.createInitialState();
    const xMoves = xEngine.getLegalMoves(xState);
    const xAi1 = createXiangqiAiLevel1();
    const xAi2 = createXiangqiAiLevel2();
    const xm1 = await xAi1.selectMove(xState, xMoves);
    const xm2 = await xAi2.selectMove(xState, xMoves);
    expect(() => xEngine.applyMove(xState, xm1)).not.toThrow();
    expect(() => xEngine.applyMove(xState, xm2)).not.toThrow();

    // Gomoku Level 1 & Level 2
    const gEngine = createGomokuEngine("freestyle");
    const gState = gEngine.createInitialState();
    const gMoves = gEngine.getLegalMoves(gState);
    const gAi1 = createGomokuAiLevel1();
    const gAi2 = createGomokuAiLevel2();
    const gm1 = await gAi1.selectMove(gState, gMoves);
    const gm2 = await gAi2.selectMove(gState, gMoves);
    expect(() => gEngine.applyMove(gState, gm1)).not.toThrow();
    expect(() => gEngine.applyMove(gState, gm2)).not.toThrow();

    // Banqi Level 1 & Level 2
    const bEngine = createBanqiEngine();
    const bState = bEngine.createInitialState();
    const bMoves = bEngine.getLegalMoves(bState);
    const bAi1 = createBanqiAiLevel1();
    const bAi2 = createBanqiAiLevel2();
    const bm1 = await bAi1.selectMove(bState, bMoves);
    const bm2 = await bAi2.selectMove(bState, bMoves);
    expect(() => bEngine.applyMove(bState, bm1)).not.toThrow();
    expect(() => bEngine.applyMove(bState, bm2)).not.toThrow();
  });

  it("ensures game-over state strictly terminates move legality and prevents moves", () => {
    const gEngine = createGomokuEngine("freestyle");
    const session = new GameSession(gEngine);

    // Black 5-in-a-row: (7, 0) to (7, 4)
    // White plays row 8
    session.move({ row: 7, col: 0 }); // B
    session.move({ row: 8, col: 0 }); // W
    session.move({ row: 7, col: 1 }); // B
    session.move({ row: 8, col: 1 }); // W
    session.move({ row: 7, col: 2 }); // B
    session.move({ row: 8, col: 2 }); // W
    session.move({ row: 7, col: 3 }); // B
    session.move({ row: 8, col: 3 }); // W
    session.move({ row: 7, col: 4 }); // B (wins!)

    const finalState = session.getState();
    expect(gEngine.isGameOver(finalState)).toBe(true);
    expect(gEngine.getWinner(finalState)).toBe("black");
    expect(gEngine.getLegalMoves(finalState)).toEqual([]);

    // Any move attempted post-game-over must be rejected
    expect(() => session.move({ row: 8, col: 4 })).toThrow("Illegal move");
  });

  it("prevents cross-session contamination when multiple game sessions run in parallel", async () => {
    const xSession = new GameSession(createXiangqiEngine());
    const gSession = new GameSession(createGomokuEngine());

    // Make moves on both sessions concurrently
    xSession.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    gSession.move({ row: 7, col: 7 });

    expect(xSession.getHistory()).toHaveLength(1);
    expect(gSession.getHistory()).toHaveLength(1);

    // Reset Gomoku session
    gSession.reset();

    // Xiangqi session must remain completely undisturbed
    expect(xSession.getHistory()).toHaveLength(1);
    expect(xSession.getCurrentPlayer()).toBe("black");
    expect(xSession.getState().board[7][4]?.type).toBe("cannon");
  });
});
