import { describe, it, expect } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { SaveManager } from "../../src/core/persistence/save-manager";
import type { BanqiPiece } from "../../src/games/banqi/types";

describe("012 Save / Load Persistence Architecture", () => {
  const saveManager = new SaveManager();

  describe("Save Envelope & Validation", () => {
    it("creates a versioned GameSaveEnvelope with formatVersion 1", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      const envelopeJson = saveManager.save(session, engine);
      const parsed = JSON.parse(envelopeJson);

      expect(parsed.formatVersion).toBe(1);
      expect(parsed.gameId).toBe("xiangqi");
      expect(typeof parsed.engineVersion).toBe("string");
      expect(typeof parsed.state).toBe("string");
      expect(typeof parsed.savedAt).toBe("string");
    });

    it("rejects malformed JSON", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      expect(() => {
        saveManager.load("{ invalid json", session, engine);
      }).toThrow(/malformed/i);
    });

    it("rejects non-object or null payloads", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      expect(() => {
        saveManager.load(JSON.stringify("a plain string"), session, engine);
      }).toThrow(/invalid envelope/i);
      expect(() => {
        saveManager.load(JSON.stringify(null), session, engine);
      }).toThrow(/invalid envelope/i);
    });

    it("rejects missing or unsupported formatVersion", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      const badVersion = JSON.stringify({
        formatVersion: 99,
        gameId: "xiangqi",
        engineVersion: "0.1.0",
        state: engine.serialize(session.getState()),
      });

      expect(() => {
        saveManager.load(badVersion, session, engine);
      }).toThrow(/unsupported format version/i);
    });

    it("rejects gameId mismatch without corrupting the session", () => {
      const xiangqiEngine = createXiangqiEngine();
      const banqiEngine = createBanqiEngine();

      const session = new GameSession(xiangqiEngine);
      const stateBefore = xiangqiEngine.serialize(session.getState());

      const envelope = JSON.stringify({
        formatVersion: 1,
        gameId: "banqi",
        engineVersion: "0.1.0",
        state: banqiEngine.serialize(banqiEngine.createInitialState()),
      });

      expect(() => {
        saveManager.load(envelope, session, xiangqiEngine);
      }).toThrow(/game id mismatch/i);

      // Session MUST NOT be modified
      expect(xiangqiEngine.serialize(session.getState())).toBe(stateBefore);
    });

    it("rejects corrupted state payload without mutating active session", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);
      const stateBefore = engine.serialize(session.getState());

      const badStatePayload = JSON.stringify({
        formatVersion: 1,
        gameId: "xiangqi",
        engineVersion: "0.1.0",
        state: "not a valid serialized xiangqi state",
      });

      expect(() => {
        saveManager.load(badStatePayload, session, engine);
      }).toThrow();

      // State remains strictly identical
      expect(engine.serialize(session.getState())).toBe(stateBefore);
    });
  });

  describe("Multi-Game Round Trip", () => {
    it("Xiangqi save and load restores exact board and active player", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      // Move red soldier (6, 4) -> (5, 4)
      session.move({
        from: { row: 6, col: 4 },
        to: { row: 5, col: 4 },
      });

      const savedJson = saveManager.save(session, engine);

      const newSession = new GameSession(engine);
      saveManager.load(savedJson, newSession, engine);

      expect(newSession.getCurrentPlayer()).toBe("black");
      expect(newSession.getState().board[5][4]?.type).toBe("soldier");
      expect(newSession.getState().board[6][4]).toBeNull();
    });

    it("Gomoku save and load restores placed stones and turns", () => {
      const engine = createGomokuEngine();
      const session = new GameSession(engine);

      session.move({ row: 7, col: 7 }); // black
      session.move({ row: 7, col: 8 }); // white

      const savedJson = saveManager.save(session, engine);

      const newSession = new GameSession(engine);
      saveManager.load(savedJson, newSession, engine);

      expect(newSession.getCurrentPlayer()).toBe("black");
      expect(newSession.getState().board[7][7]).toBe("black");
      expect(newSession.getState().board[7][8]).toBe("white");
    });

    it("Banqi Trusted Save faithfully preserves hidden piece private identities", () => {
      const engine = createBanqiEngine();
      const session = new GameSession(engine);

      // Find an initial face-down piece
      let faceDownPos: { row: number; col: number } | null = null;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          if (session.getState().board[r][c]?.isRevealed === false) {
            faceDownPos = { row: r, col: c };
            break;
          }
        }
        if (faceDownPos) break;
      }
      expect(faceDownPos).not.toBeNull();
      const targetPos = faceDownPos!;

      // Retrieve full authoritative piece before saving
      const pieceBefore = session.getState().board[targetPos.row][targetPos.col] as BanqiPiece;
      expect(pieceBefore.isRevealed).toBe(false);
      expect(pieceBefore.player).toBeDefined();
      expect(pieceBefore.type).toBeDefined();
      expect(pieceBefore.rank).toBeGreaterThanOrEqual(1);

      // Save trusted full state
      const savedJson = saveManager.save(session, engine);

      // Load into fresh session
      const restoredSession = new GameSession(engine);
      saveManager.load(savedJson, restoredSession, engine);

      const pieceAfter = restoredSession.getState().board[targetPos.row][targetPos.col] as BanqiPiece;
      expect(pieceAfter.isRevealed).toBe(false);
      expect(pieceAfter.id).toBe(pieceBefore.id);
      expect(pieceAfter.player).toBe(pieceBefore.player);
      expect(pieceAfter.type).toBe(pieceBefore.type);
      expect(pieceAfter.rank).toBe(pieceBefore.rank);
    });
  });

  describe("Persistence Baseline & Undo Integration", () => {
    it("loading a save establishes a clean baseline and clears prior undo snapshots", () => {
      const engine = createXiangqiEngine();
      const session = new GameSession(engine);

      // Move 1
      session.move({ from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
      // Move 2
      session.move({ from: { row: 3, col: 4 }, to: { row: 4, col: 4 } });

      const savedState = saveManager.save(session, engine);

      // Undo Move 2
      session.undo();
      expect(session.getCurrentPlayer()).toBe("black");

      // Load the saved state (which was at Move 2)
      saveManager.load(savedState, session, engine);
      expect(session.getCurrentPlayer()).toBe("red");

      // Undo on newly loaded state should be a no-op (snapshots stack was reset as a clean baseline)
      const afterUndoAttempt = session.undo();
      expect(afterUndoAttempt.board[4][4]?.type).toBe("soldier");
      expect(session.getCurrentPlayer()).toBe("red");
    });
  });
});
