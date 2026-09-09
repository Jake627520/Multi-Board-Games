import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { GameSession } from "../../src/core/game/session";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { ReplayManager } from "../../src/core/persistence/replay-manager";
import type { GameViewContext } from "../../src/core/game/types";
import type { XiangqiMove, XiangqiState } from "../../src/games/xiangqi/types";
import type { GomokuMove, GomokuState } from "../../src/games/gomoku/types";
import type { BanqiMove, BanqiState, BanqiViewState } from "../../src/games/banqi/types";

describe("Save -> Load -> Replay Round-Trip Integration", () => {
  const context: GameViewContext = { role: "spectator", player: null };
  const saveManager = new SaveManager();
  const replayManager = new ReplayManager();

  it("completes full save -> load -> replay lifecycle for Xiangqi", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession<XiangqiState, XiangqiMove>(engine);

    // Red Central Cannon (7, 1) -> (7, 4)
    session.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    // Black Horse (0, 1) -> (2, 2)
    session.move({ from: { row: 0, col: 1 }, to: { row: 2, col: 2 } });

    expect(session.getHistory()).toHaveLength(2);
    expect(session.getCurrentPlayer()).toBe("red");

    // Save session
    const saveJson = saveManager.save(session, engine);

    // Create fresh session and load
    const loadedSession = new GameSession<XiangqiState, XiangqiMove>(engine);
    saveManager.load(saveJson, loadedSession, engine);

    expect(loadedSession.getCurrentPlayer()).toBe("red");
    expect(loadedSession.getState().board[7][4]?.type).toBe("cannon");
    expect(loadedSession.getState().board[2][2]?.type).toBe("horse");

    // 載入的存檔本身就帶著 2 步棋譜（v2），不再歸零
    expect(loadedSession.getHistory()).toHaveLength(2);

    // Continue game from loaded session
    loadedSession.move({ from: { row: 9, col: 1 }, to: { row: 7, col: 2 } });
    expect(loadedSession.getCurrentPlayer()).toBe("black");
    expect(loadedSession.getHistory()).toHaveLength(3);

    // Replay creation on original session
    const replayEnvelope = replayManager.createReplay(session, engine);
    const replaySession = replayManager.loadReplay(replayEnvelope, engine);

    expect(replaySession.getStepCount()).toBe(2);
    expect(replaySession.getCurrentStep()).toBe(0);

    // Replay must be side-effect free on live session
    const stateBefore = session.getState();
    replaySession.stepTo(1);
    expect(session.getState()).toEqual(stateBefore);

    const step2View = replaySession.viewAt(2, context);
    expect(step2View.board[7][4]?.type).toBe("cannon");
    expect(step2View.board[2][2]?.type).toBe("horse");
  });

  it("completes full save -> load -> replay lifecycle for Gomoku", () => {
    const engine = createGomokuEngine();
    const session = new GameSession<GomokuState, GomokuMove>(engine);

    session.move({ row: 7, col: 7 }); // black
    session.move({ row: 7, col: 8 }); // white
    session.move({ row: 8, col: 8 }); // black

    const saveJson = saveManager.save(session, engine);

    const loadedSession = new GameSession<GomokuState, GomokuMove>(engine);
    saveManager.load(saveJson, loadedSession, engine);

    expect(loadedSession.getCurrentPlayer()).toBe("white");
    expect(loadedSession.getState().board[7][7]).toBe("black");
    expect(loadedSession.getState().board[7][8]).toBe("white");
    expect(loadedSession.getState().board[8][8]).toBe("black");
  });

  it("preserves exact Banqi initial board and unrevealed identities on Load (does NOT re-randomize)", () => {
    const engine = createBanqiEngine();
    const session = new GameSession<BanqiState, BanqiMove, BanqiViewState>(engine);

    // Record initial 32 piece identities in authoritative full state
    const originalIdentities = session.getState().board.map((row) =>
      row.map((piece) => ({ id: piece?.id, type: piece?.type, player: piece?.player }))
    );

    // Flip two pieces
    session.move({ type: "flip", pos: { row: 0, col: 0 } });
    session.move({ type: "flip", pos: { row: 1, col: 1 } });

    // Save
    const saveJson = saveManager.save(session, engine);

    // Load into new session
    const loadedSession = new GameSession<BanqiState, BanqiMove, BanqiViewState>(engine);
    saveManager.load(saveJson, loadedSession, engine);

    // Verify all 32 piece identities match original setup exactly!
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const loadedPiece = loadedSession.getState().board[r][c];
        const orig = originalIdentities[r][c];
        expect(loadedPiece?.id).toBe(orig.id);
        expect(loadedPiece?.type).toBe(orig.type);
        expect(loadedPiece?.player).toBe(orig.player);
      }
    }

    // Verify revealed statuses match
    expect(loadedSession.getState().board[0][0]?.isRevealed).toBe(true);
    expect(loadedSession.getState().board[1][1]?.isRevealed).toBe(true);
    expect(loadedSession.getState().board[2][2]?.isRevealed).toBe(false);

    // Public view must still safely hide unrevealed pieces
    const publicView = loadedSession.getView(context);
    expect(publicView.board[2][2]?.isRevealed).toBe(false);
    expect((publicView.board[2][2] as unknown as Record<string, unknown>).type).toBeUndefined();
  });
});
