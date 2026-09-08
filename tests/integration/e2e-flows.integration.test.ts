import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel2 } from "../../src/games/xiangqi/ai";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGomokuAiLevel2 } from "../../src/games/gomoku/ai";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { createGameRegistry } from "../../src/games/registry";
import { GameSession } from "../../src/core/game/session";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { ReplayManager } from "../../src/core/persistence/replay-manager";
import type { GameViewContext } from "../../src/core/game/types";

describe("E2E Core Flows A through E Integration Suite", () => {
  const context: GameViewContext = { role: "spectator", player: null };
  const saveManager = new SaveManager();
  const replayManager = new ReplayManager();

  // Flow A: Home -> Xiangqi -> PvP -> move -> save -> load -> replay
  it("executes Flow A: Xiangqi PvP lifecycle with save/load and replay", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);

    // PvP Moves
    session.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }); // Red 中炮
    session.move({ from: { row: 0, col: 1 }, to: { row: 2, col: 2 } }); // Black 跳馬

    // Save
    const envelope = saveManager.save(session, engine);
    expect(envelope).toContain('"gameId":"xiangqi"');

    // Load into new session
    const restoredSession = new GameSession(engine);
    saveManager.load(envelope, restoredSession, engine);
    expect(restoredSession.getCurrentPlayer()).toBe("red");
    expect(restoredSession.getState().board[7][4]?.type).toBe("cannon");

    // Replay
    const replayEnvelope = replayManager.createReplay(session, engine);
    const replaySession = replayManager.loadReplay(replayEnvelope, engine);
    expect(replaySession.getStepCount()).toBe(2);

    const step0 = replaySession.viewAt(0, context);
    expect(step0.board[7][1]?.type).toBe("cannon");
    const step2 = replaySession.viewAt(2, context);
    expect(step2.board[7][4]?.type).toBe("cannon");
  });

  // Flow B: Home -> Xiangqi -> PvE Level 2 -> human move -> AI move -> game continues
  it("executes Flow B: Xiangqi PvE Level 2 match flow", async () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);
    const ai = createXiangqiAiLevel2();

    // Human (Red) moves
    session.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    expect(session.getCurrentPlayer()).toBe("black");

    // AI (Black) calculates move
    const legalMoves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), legalMoves);

    // Apply AI move
    expect(() => session.move(aiMove)).not.toThrow();
    expect(session.getCurrentPlayer()).toBe("red");
    expect(session.getHistory()).toHaveLength(2);
  });

  // Flow C: Home -> Gomoku -> PvE Level 2 -> moves -> replay
  it("executes Flow C: Gomoku PvE Level 2 match flow with replay", async () => {
    const engine = createGomokuEngine("freestyle");
    const session = new GameSession(engine);
    const ai = createGomokuAiLevel2();

    // Human (Black) opens center (7, 7)
    session.move({ row: 7, col: 7 });

    // AI (White) responds
    const legalMoves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), legalMoves);
    session.move(aiMove);

    expect(session.getHistory()).toHaveLength(2);

    // Create and step replay
    const replay = replayManager.loadReplay(replayManager.createReplay(session, engine), engine);
    expect(replay.getStepCount()).toBe(2);
    expect(replay.viewAt(1, context).board[7][7]).toBe("black");
  });

  // Flow D: Home -> Banqi -> PvE Level 2 -> reveal -> move -> save -> load -> replay
  it("executes Flow D: Banqi PvE Level 2 with reveal, save, load and replay", async () => {
    const engine = createBanqiEngine();
    const session = new GameSession(engine);
    const ai = createBanqiAiLevel2();

    // Human flip (0, 0)
    session.move({ type: "flip", pos: { row: 0, col: 0 } });
    const p1Color = session.getState().player1Color;
    expect(p1Color).not.toBeNull();

    // AI selects response
    const moves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), moves);
    session.move(aiMove);

    // Save & Load
    const saveJson = saveManager.save(session, engine);
    const restored = new GameSession(engine);
    saveManager.load(saveJson, restored, engine);
    expect(restored.getState().player1Color).toBe(p1Color);

    // Replay
    const replay = replayManager.loadReplay(replayManager.createReplay(session, engine), engine);
    expect(replay.getStepCount()).toBe(2);
  });

  // Flow E: switch games -> Xiangqi -> Gomoku -> Banqi -> session isolation
  it("executes Flow E: game switcher lifecycle and absolute session isolation", () => {
    const registry = createGameRegistry();
    const games = registry.list();
    expect(games.map((g) => g.id)).toEqual(["xiangqi", "gomoku", "banqi"]);

    // Instantiate each via registry
    const xEngine = registry.get("xiangqi")!;
    const gEngine = registry.get("gomoku")!;
    const bEngine = registry.get("banqi")!;

    const xSession = new GameSession(xEngine);
    const gSession = new GameSession(gEngine);
    const bSession = new GameSession(bEngine);

    xSession.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    gSession.move({ row: 7, col: 7 });
    bSession.move({ type: "flip", pos: { row: 0, col: 0 } });

    expect(xSession.getCurrentPlayer()).toBe("black");
    expect(gSession.getCurrentPlayer()).toBe("white");
    expect(bSession.getHistory()).toHaveLength(1);

    // Ensure resetting one game has zero effect on other games
    xSession.reset();
    expect(xSession.getHistory()).toHaveLength(0);
    expect(gSession.getHistory()).toHaveLength(1);
    expect(bSession.getHistory()).toHaveLength(1);
  });
});
