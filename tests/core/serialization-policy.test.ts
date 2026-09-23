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

    const state = session.getState();
    const rawFull = engine.serialize(state);

    // Premise: the authoritative state really does carry every piece's identity.
    const hidden = state.board
      .flat()
      .filter((piece): piece is NonNullable<typeof piece> => piece !== null)
      .filter((piece) => !piece.isRevealed);

    expect(hidden.length).toBeGreaterThan(0);
    expect(hidden.every((piece) => piece.type && piece.player)).toBe(true);
    expect(rawFull).not.toBe(publicExport);

    // The public export must be structurally incapable of identifying a
    // face-down piece. Asserted on the parsed shape, not on literal words:
    // an absence assertion pinned to one encoding turns vacuously true the
    // moment the format changes, which is exactly how a leak slips through
    // unnoticed. Every face-down entry must expose nothing but its coordinate
    // placeholder and the flag saying it is face-down.
    const exported = JSON.parse(publicExport) as {
      board: ({ id: string; isRevealed: boolean } | null)[][];
    };
    const exportedHidden = exported.board
      .flat()
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null)
      .filter((cell) => cell.isRevealed === false);

    expect(exportedHidden).toHaveLength(hidden.length);
    for (const cell of exportedHidden) {
      expect(Object.keys(cell).sort()).toEqual(["id", "isRevealed"]);
      expect(cell.id).toMatch(/^hidden-\d+-\d+$/);
    }
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
