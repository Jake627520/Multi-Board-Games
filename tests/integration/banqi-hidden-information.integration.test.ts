import { describe, expect, it } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { GameSession } from "../../src/core/game/session";
import { exportPublicView } from "../../src/core/persistence/policy";
import { ReplayManager } from "../../src/core/persistence/replay-manager";
import type { GameViewContext } from "../../src/core/game/types";
import type { BanqiMove, BanqiState, BanqiViewState } from "../../src/games/banqi/types";

describe("Banqi Hidden Information & Non-Complete Information Boundary", () => {
  const context: GameViewContext = { role: "spectator", player: null };

  it("never exposes piece type, player, or rank for unrevealed pieces in ViewState", () => {
    const engine = createBanqiEngine();
    const state = engine.createInitialState();
    const view = engine.projectView(state, context);

    // Initial board has 32 face-down pieces
    let hiddenCount = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const p = view.board[r][c];
        expect(p).not.toBeNull();
        expect(p?.isRevealed).toBe(false);
        // Explicitly check properties must NOT exist on hidden piece view
        expect((p as unknown as Record<string, unknown>).player).toBeUndefined();
        expect((p as unknown as Record<string, unknown>).type).toBeUndefined();
        expect((p as unknown as Record<string, unknown>).rank).toBeUndefined();
        expect(p?.id).toBe(`hidden-${r}-${c}`);
        hiddenCount++;
      }
    }
    expect(hiddenCount).toBe(32);
  });

  it("never leaks unrevealed piece identities in exportPublicView() output", () => {
    const engine = createBanqiEngine();
    const session = new GameSession(engine);

    const publicExport = exportPublicView(session, engine, context);
    const parsed = JSON.parse(publicExport) as BanqiViewState;

    for (const row of parsed.board) {
      for (const piece of row) {
        if (!piece) continue;
        if (!piece.isRevealed) {
          expect((piece as unknown as Record<string, unknown>).player).toBeUndefined();
          expect((piece as unknown as Record<string, unknown>).type).toBeUndefined();
          expect((piece as unknown as Record<string, unknown>).rank).toBeUndefined();
        }
      }
    }
  });

  it("ensures public replay export masks unrevealed pieces at all historical steps", () => {
    const engine = createBanqiEngine();
    const session = new GameSession<BanqiState, BanqiMove, BanqiViewState>(engine);
    const replayManager = new ReplayManager();

    // Flip first piece at (0, 0)
    session.move({ type: "flip", pos: { row: 0, col: 0 } });

    // Flip second piece at (0, 1)
    session.move({ type: "flip", pos: { row: 0, col: 1 } });

    const replayEnv = replayManager.createReplay(session, engine);
    const replaySession = replayManager.loadReplay(replayEnv, engine);

    const publicReplayJson = replaySession.exportPublicReplay(context);
    const steps = JSON.parse(publicReplayJson) as BanqiViewState[];

    expect(steps).toHaveLength(3); // initial + 2 moves

    // Step 0: all 32 pieces must be hidden without identity
    for (const row of steps[0].board) {
      for (const piece of row) {
        expect(piece?.isRevealed).toBe(false);
        expect((piece as unknown as Record<string, unknown>).player).toBeUndefined();
        expect((piece as unknown as Record<string, unknown>).type).toBeUndefined();
      }
    }

    // Step 1: exactly 1 piece revealed, 31 pieces hidden
    let revealedStep1 = 0;
    for (const row of steps[1].board) {
      for (const piece of row) {
        if (piece?.isRevealed) {
          revealedStep1++;
          expect(piece.player).toBeDefined();
          expect(piece.type).toBeDefined();
        } else {
          expect((piece as unknown as Record<string, unknown>).player).toBeUndefined();
        }
      }
    }
    expect(revealedStep1).toBe(1);
  });

  it("ensures Banqi AI Level 1 and Level 2 moves never carry hidden metadata", async () => {
    const engine = createBanqiEngine();
    const state = engine.createInitialState();
    const legalMoves = engine.getLegalMoves(state);

    const aiL1 = createBanqiAiLevel1();
    const aiL2 = createBanqiAiLevel2();

    const moveL1 = await aiL1.selectMove(state, legalMoves);
    const moveL2 = await aiL2.selectMove(state, legalMoves);

    // Move objects must strictly conform to BanqiMove interface without leaking identity
    expect(moveL1.type).toBe("flip");
    expect((moveL1 as unknown as Record<string, unknown>).piece).toBeUndefined();
    expect((moveL1 as unknown as Record<string, unknown>).player).toBeUndefined();

    expect(moveL2.type).toBe("flip");
    expect((moveL2 as unknown as Record<string, unknown>).piece).toBeUndefined();
    expect((moveL2 as unknown as Record<string, unknown>).player).toBeUndefined();
  });
});
