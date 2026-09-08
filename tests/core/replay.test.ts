import { describe, it, expect } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { ReplayManager } from "../../src/core/persistence/replay-manager";
import type { GameViewContext } from "../../src/core/game/types";
import type { BanqiViewState } from "../../src/games/banqi/types";

describe("012 Replay Architecture & Banqi Public Security", () => {
  const replayManager = new ReplayManager();

  describe("Replay Creation & Deterministic Stepping", () => {
    it("records full move history and recovers initial and intermediate states", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      // Initial state
      const initialSerialized = engine.serialize(session.getState());

      // Move 1: red soldier
      session.move({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      const step1Serialized = engine.serialize(session.getState());

      // Move 2: black cannon
      session.move({ from: { row: 2, col: 1 }, to: { row: 2, col: 4 } });
      const step2Serialized = engine.serialize(session.getState());

      const replayEnvelope = replayManager.createReplay(session, engine);
      expect(replayEnvelope.formatVersion).toBe(1);
      expect(replayEnvelope.gameId).toBe("xiangqi");
      expect(replayEnvelope.moves).toHaveLength(2);

      const replaySession = replayManager.loadReplay(replayEnvelope, engine);
      expect(replaySession.getStepCount()).toBe(2);

      // Step to initial (0)
      const at0 = replaySession.stepTo(0);
      expect(engine.serialize(at0)).toBe(initialSerialized);

      // Step to 1
      const at1 = replaySession.stepTo(1);
      expect(engine.serialize(at1)).toBe(step1Serialized);

      // Step to 2 (final)
      const at2 = replaySession.stepTo(2);
      expect(engine.serialize(at2)).toBe(step2Serialized);
    });

    it("replay stepping does not mutate the active live GameSession", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      session.move({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      const liveStateBefore = engine.serialize(session.getState());

      const envelope = replayManager.createReplay(session, engine);
      const replay = replayManager.loadReplay(envelope, engine);

      // Step replay back to 0
      replay.stepTo(0);

      // Live session state must be completely untouched
      expect(engine.serialize(session.getState())).toBe(liveStateBefore);
    });
  });

  describe("Banqi Replay: Trusted vs Public Security", () => {
    it("Trusted Replay retains hidden piece private identities across all steps", () => {
      const engine = createBanqiEngine();
      const session = new GameSession(engine);

      // Flip first piece at (0, 0)
      session.move({ type: "flip", pos: { row: 0, col: 0 } });

      const envelope = replayManager.createReplay(session, engine);
      const replay = replayManager.loadReplay(envelope, engine);

      // At step 0 in trusted replay, face-down pieces retain their true rank, type, and player
      const state0 = replay.stepTo(0);
      const piece00 = state0.board[0][0];
      expect(piece00?.isRevealed).toBe(false);
      expect(piece00?.player).toBeDefined();
      expect(piece00?.type).toBeDefined();
      expect(piece00?.rank).toBeGreaterThanOrEqual(1);

      // At step 1 in trusted replay, piece at (0, 0) is revealed
      const state1 = replay.stepTo(1);
      expect(state1.board[0][0]?.isRevealed).toBe(true);
    });

    it("Public Replay projects safe ViewStates and never exposes unrevealed pieces", () => {
      const engine = createBanqiEngine();
      const session = new GameSession(engine);

      // Flip piece at (0, 0)
      session.move({ type: "flip", pos: { row: 0, col: 0 } });
      // Flip piece at (0, 1)
      session.move({ type: "flip", pos: { row: 0, col: 1 } });

      const envelope = replayManager.createReplay(session, engine);
      const replay = replayManager.loadReplay(envelope, engine);

      const spectatorContext: GameViewContext = { role: "spectator", player: null };

      // 1. Inspect public view projection at step 0 (game start)
      const view0 = replay.viewAt(0, spectatorContext) as BanqiViewState;
      // All pieces face-down at step 0
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          const p = view0.board[r][c];
          if (p) {
            expect(p.isRevealed).toBe(false);
            expect("player" in p).toBe(false);
            expect("type" in p).toBe(false);
            expect("rank" in p).toBe(false);
          }
        }
      }

      // 2. Export public replay serialized log
      const publicLogJson = replay.exportPublicReplay(spectatorContext);
      const publicViews = JSON.parse(publicLogJson) as BanqiViewState[];
      expect(publicViews).toHaveLength(3); // step 0, 1, 2

      // Step 0 view in exported public log has NO revealed pieces
      expect(publicViews[0].board[0][0]?.isRevealed).toBe(false);
      expect("type" in (publicViews[0].board[0][0] || {})).toBe(false);

      // Step 1 view in exported public log reveals ONLY piece at (0, 0)
      expect(publicViews[1].board[0][0]?.isRevealed).toBe(true);
      expect("type" in (publicViews[1].board[0][0] || {})).toBe(true);
      expect(publicViews[1].board[0][1]?.isRevealed).toBe(false);
      expect("type" in (publicViews[1].board[0][1] || {})).toBe(false);

      // Step 2 view reveals both (0, 0) and (0, 1)
      expect(publicViews[2].board[0][0]?.isRevealed).toBe(true);
      expect(publicViews[2].board[0][1]?.isRevealed).toBe(true);
    });
  });
});
