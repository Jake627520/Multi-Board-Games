import { describe, expect, it } from "vitest";
import { act, createElement, useMemo } from "react";
import { createRoot } from "react-dom/client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { GameSession } from "../../src/core/game/session";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGomokuAiLevel1 } from "../../src/games/gomoku/ai";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel1 } from "../../src/games/xiangqi/ai";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { useGameSession } from "../../src/ui/hooks/useGameSession";
import type { XiangqiMove, XiangqiState } from "../../src/games/xiangqi/types";

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

  it("executes an interactive Banqi PvE match with AI opponent", async () => {
    const engine = createBanqiEngine();
    const session = new GameSession(engine);
    const ai = createBanqiAiLevel2();

    // Human flips first piece at (0, 0)
    session.move({ type: "flip", pos: { row: 0, col: 0 } });
    expect(session.getHistory()).toHaveLength(1);
    const opponent = session.getCurrentPlayer();

    // AI selects response move
    const legalMoves = engine.getLegalMoves(session.getState());
    const aiMove = await ai.selectMove(session.getState(), legalMoves);

    expect(legalMoves).toContainEqual(aiMove);

    // Apply AI move
    session.move(aiMove);
    expect(session.getHistory()).toHaveLength(2);
    expect(session.getCurrentPlayer()).not.toBe(opponent);
  });

  it("implements decision-point based undo in PvE mode (Round 19 P1-2)", async () => {
    let api!: ReturnType<typeof useGameSession<XiangqiState, XiangqiMove>>;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function Harness() {
      const engine = useMemo(() => createXiangqiEngine(), []);
      const ai = useMemo(() => createXiangqiAiLevel1(), []);
      const session = useGameSession<XiangqiState, XiangqiMove>(engine, {
        aiPlayer: ai,
        aiColor: "black",
        aiDelayMs: 20,
      });
      api = session;
      return null;
    }

    await act(async () => {
      root.render(createElement(Harness));
    });

    // Initial state: Red (Human) turn
    expect(api.currentPlayer).toBe("red");
    expect(api.history).toHaveLength(0);

    // Human makes Move 1 (Red Cannon 7,1 -> 7,4)
    await act(async () => {
      api.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    });

    // Wait for AI to respond (AI delay 20ms)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    // Test 1: Human move + AI move -> history = 2, currentPlayer = red (Human)
    expect(api.history).toHaveLength(2);
    expect(api.currentPlayer).toBe("red");

    // Human clicks Undo
    await act(async () => {
      api.undo();
    });

    // Expected Test 1 result: history reverted to 0, currentPlayer = red (Human)
    expect(api.history).toHaveLength(0);
    expect(api.currentPlayer).toBe("red");

    // Test 3: Wait > AI delay to ensure old AI does NOT re-trigger
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(api.history).toHaveLength(0);
    expect(api.currentPlayer).toBe("red");

    // Test 2: Play 2 full rounds (Human -> AI -> Human -> AI), then Undo
    // Round 1: Human move 1
    await act(async () => {
      api.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(api.history).toHaveLength(2);

    // Round 2: Human move 2 (Horse 9,1 -> 7,2)
    await act(async () => {
      api.move({ from: { row: 9, col: 1 }, to: { row: 7, col: 2 } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(api.history).toHaveLength(4);
    expect(api.currentPlayer).toBe("red");

    // Undo: should revert to Human decision point before Round 2 (history = 2)
    await act(async () => {
      api.undo();
    });
    expect(api.history).toHaveLength(2);
    expect(api.currentPlayer).toBe("red");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("preserves strict single-step undo in PvP mode (Round 19 P1-2)", async () => {
    let api!: ReturnType<typeof useGameSession<XiangqiState, XiangqiMove>>;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function PvPHarness() {
      const engine = useMemo(() => createXiangqiEngine(), []);
      const session = useGameSession<XiangqiState, XiangqiMove>(engine);
      api = session;
      return null;
    }

    await act(async () => {
      root.render(createElement(PvPHarness));
    });

    // Move 1: Red
    await act(async () => {
      api.move({ from: { row: 7, col: 1 }, to: { row: 7, col: 4 } });
    });
    expect(api.currentPlayer).toBe("black");
    expect(api.history).toHaveLength(1);

    // Move 2: Black
    await act(async () => {
      api.move({ from: { row: 0, col: 1 }, to: { row: 2, col: 2 } });
    });
    expect(api.currentPlayer).toBe("red");
    expect(api.history).toHaveLength(2);

    // PvP Undo: should undo exactly 1 move (back to Black's turn)
    await act(async () => {
      api.undo();
    });
    expect(api.history).toHaveLength(1);
    expect(api.currentPlayer).toBe("black");

    // Second Undo: back to Red's turn
    await act(async () => {
      api.undo();
    });
    expect(api.history).toHaveLength(0);
    expect(api.currentPlayer).toBe("red");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
