import { describe, it, expect, beforeEach } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { GameSession } from "../../src/core/game/session";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { ReplayManager } from "../../src/core/persistence/replay-manager";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { MoveHistory } from "../../src/ui/components/MoveHistory";
import {
  listSaves,
  saveGameToStorage,
  loadSaveFromStorage,
  deleteSave,
  renameSave,
  getStorage,
} from "../../src/core/persistence/local-storage";
import type { BanqiMove, BanqiState, BanqiViewState } from "../../src/games/banqi/types";
import type { GomokuMove, GomokuState } from "../../src/games/gomoku/types";

describe("Replay & Save UI Integration Lifecycle (Round 14)", () => {
  beforeEach(() => {
    getStorage().clear();
  });

  it("drives full replay stepping lifecycle with ReplayManager", () => {
    const engine = createGomokuEngine();
    const session = new GameSession<GomokuState, GomokuMove>(engine);

    // Play 3 moves
    session.move({ row: 7, col: 7 }, "H8");
    session.move({ row: 7, col: 8 }, "I8");
    session.move({ row: 8, col: 7 }, "H7");

    const replayManager = new ReplayManager();
    const envelope = replayManager.createReplay(session, engine);
    expect(envelope.moves).toHaveLength(3);

    const replaySession = replayManager.loadReplay(envelope, engine);
    expect(replaySession.getStepCount()).toBe(3);
    expect(replaySession.getCurrentStep()).toBe(0);

    // Initial state: board is empty
    const s0 = replaySession.stepTo(0);
    expect(s0.board[7][7]).toBeNull();

    // Step 1: Black placed at (7, 7)
    const s1 = replaySession.stepTo(1);
    expect(s1.board[7][7]).toBe("black");
    expect(s1.board[7][8]).toBeNull();

    // Step 2: White placed at (7, 8)
    const s2 = replaySession.stepTo(2);
    expect(s2.board[7][8]).toBe("white");
    expect(s2.board[8][7]).toBeNull();

    // Step 3: Black placed at (8, 7)
    const s3 = replaySession.stepTo(3);
    expect(s3.board[8][7]).toBe("black");

    // Out-of-bounds protection
    expect(() => replaySession.stepTo(4)).toThrow("Step index out of bounds");
    expect(() => replaySession.stepTo(-1)).toThrow("Step index out of bounds");
  });

  it("safeguards Banqi hidden information at every replay step", () => {
    const engine = createBanqiEngine();
    const session = new GameSession<BanqiState, BanqiMove, BanqiViewState>(engine);

    // Perform a flip
    session.move({ type: "flip", pos: { row: 0, col: 0 } }, "翻(0,0)");

    const replayManager = new ReplayManager();
    const envelope = replayManager.createReplay(session, engine);
    const replaySession = replayManager.loadReplay(envelope, engine);

    const spectatorCtx = { role: "spectator" as const, player: null };

    // At step 0: (0, 0) is still face-down in spectator view
    const v0 = replaySession.viewAt(0, spectatorCtx);
    const p0 = v0.board[0][0];
    expect(p0?.isRevealed).toBe(false);
    expect("type" in (p0 ?? {})).toBe(false);

    // At step 1: (0, 0) is revealed, but unrevealed pieces remain sanitized
    const v1 = replaySession.viewAt(1, spectatorCtx);
    const p1_0 = v1.board[0][0];
    const p1_1 = v1.board[0][1];
    expect(p1_0?.isRevealed).toBe(true);
    expect(p1_1?.isRevealed).toBe(false);
    expect("type" in (p1_1 ?? {})).toBe(false);
  });

  it("completes full 'Save -> List -> Load -> Rename -> Delete' storage cycle", () => {
    const engine = createGomokuEngine();
    const session = new GameSession<GomokuState, GomokuMove>(engine);
    const saveManager = new SaveManager();

    session.move({ row: 7, col: 7 }, "H8");
    session.move({ row: 7, col: 8 }, "I8");

    // 1. Save
    const envelopeJson = saveManager.save(session, engine);
    const meta = saveGameToStorage("gomoku", "重要對局", envelopeJson, 2);
    expect(meta.id).toBeDefined();

    // 2. List
    const list = listSaves("gomoku");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("重要對局");

    // 3. Load & restore in new session
    const restoredSession = new GameSession<GomokuState, GomokuMove>(engine);
    const loadedMeta = loadSaveFromStorage(meta.id);
    expect(loadedMeta).not.toBeNull();
    saveManager.load(loadedMeta!.data, restoredSession, engine);

    expect(restoredSession.getState().board[7][7]).toBe("black");
    expect(restoredSession.getState().board[7][8]).toBe("white");
    expect(restoredSession.getCurrentPlayer()).toBe("black");

    // 4. Rename
    const renamed = renameSave(meta.id, "冠軍賽關鍵手");
    expect(renamed?.name).toBe("冠軍賽關鍵手");
    expect(listSaves("gomoku")[0].name).toBe("冠軍賽關鍵手");

    // 5. Delete
    deleteSave(meta.id);
    expect(listSaves("gomoku")).toHaveLength(0);
  });

  it("enables Enter and Space keyboard activation on replay move items (Round 19 P1-4)", async () => {
    let clickedStep = -1;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const moves = [
      { player: "black" as const, notation: "H8" },
      { player: "white" as const, notation: "I8" },
    ];

    await act(async () => {
      root.render(
        createElement(MoveHistory, {
          moves,
          isReplayMode: true,
          activeStep: 1,
          onStepClick: (s: number) => {
            clickedStep = s;
          },
        })
      );
    });

    const items = container.querySelectorAll(".move-item");
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute("role")).toBe("button");
    expect(items[0].getAttribute("tabindex")).toBe("0");

    // Press Enter on item 1 (step 2)
    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    items[1].dispatchEvent(enterEvent);
    expect(clickedStep).toBe(2);

    // Press Space on item 0 (step 1)
    const spaceEvent = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    items[0].dispatchEvent(spaceEvent);
    expect(clickedStep).toBe(1);
    expect(spaceEvent.defaultPrevented).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
