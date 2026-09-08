import { describe, it, expect } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { exportPublicView, PersistenceTarget } from "../../src/core/persistence/policy";
import type { GameViewContext } from "../../src/core/game/types";

describe("012 Serialization Policy & Persistence Boundary", () => {
  it("defines clear PersistenceTarget classifications", () => {
    expect(PersistenceTarget.TRUSTED_SAVE).toBe("TRUSTED_SAVE");
    expect(PersistenceTarget.TRUSTED_REPLAY).toBe("TRUSTED_REPLAY");
    expect(PersistenceTarget.PUBLIC_EXPORT).toBe("PUBLIC_EXPORT");
    expect(PersistenceTarget.PUBLIC_REPLAY).toBe("PUBLIC_REPLAY");
  });

  it("exportPublicView enforces ViewState projection before serialization", () => {
    const engine = createBanqiEngine();
    const session = new GameSession(engine);

    const context: GameViewContext = { role: "spectator", player: null };
    const publicExport = exportPublicView(session, engine, context);

    // Raw full serialization would contain piece types/ranks/players for all pieces
    const rawFull = engine.serialize(session.getState());
    expect(rawFull).toContain("general");
    expect(rawFull).toContain("chariot");

    // Public export MUST NOT contain secret piece types for face-down pieces
    expect(publicExport).not.toContain("general");
    expect(publicExport).not.toContain("chariot");
    expect(publicExport).not.toContain("soldier");
  });

  it("exportPublicView works seamlessly for perfect information games", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);

    const context: GameViewContext = { role: "spectator", player: null };
    const publicExport = exportPublicView(session, engine, context);

    // In Xiangqi, all pieces are visible
    expect(publicExport).toContain("general");
    expect(publicExport).toContain("chariot");
  });
});
