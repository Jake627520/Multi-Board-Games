import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { StatusBar } from "../../src/ui/components/StatusBar";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("StatusBar Accessibility & Semantics (Round 19 Phase B.2)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("exposes role='status' and aria-live='polite' on active turn row", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "red",
          isGameOver: false,
          winner: null,
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const statusRow = container.querySelector(".status-row");
    expect(statusRow).not.toBeNull();
    expect(statusRow?.getAttribute("role")).toBe("status");
    expect(statusRow?.getAttribute("aria-live")).toBe("polite");
    expect(statusRow?.textContent).toContain("輪到：紅方");
  });

  it("announces AI thinking status and disables action buttons", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "black",
          isGameOver: false,
          winner: null,
          isAiThinking: true,
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const statusRow = container.querySelector(".status-row");
    expect(statusRow?.textContent).toContain("輪到：黑方");
    expect(statusRow?.textContent).toContain("（電腦思考中...）");

    const undoBtn = container.querySelector("button[aria-label='悔棋']") as HTMLButtonElement;
    const resetBtn = container.querySelector("button[aria-label='重新開始']") as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(true);
    expect(resetBtn.disabled).toBe(true);
  });

  it("displays check (將軍！) notice during active play", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "black",
          isGameOver: false,
          winner: null,
          inCheck: true,
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const checkSpan = container.querySelector(".check");
    expect(checkSpan).not.toBeNull();
    expect(checkSpan?.textContent).toBe("將軍！");
  });

  it("announces winner on game over", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "red",
          isGameOver: true,
          winner: "red",
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const statusRow = container.querySelector(".status-row");
    expect(statusRow?.textContent).toContain("🎉 紅方 獲勝！");
    expect(statusRow?.textContent).not.toContain("輪到：");
  });

  it("announces draw on game over draw", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "red",
          isGameOver: true,
          winner: null,
          isDraw: true,
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const statusRow = container.querySelector(".status-row");
    expect(statusRow?.textContent).toContain("🤝 雙方和局");
  });

  it("presents error message with role='alert' and aria-live='assertive'", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(StatusBar, {
          currentPlayer: "red",
          isGameOver: false,
          winner: null,
          error: "此棋步不符合象棋走法規則",
          onUndo: vi.fn(),
          onReset: vi.fn(),
        })
      );
    });

    const errorDiv = container.querySelector(".error");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.getAttribute("role")).toBe("alert");
    expect(errorDiv?.getAttribute("aria-live")).toBe("assertive");
    expect(errorDiv?.textContent).toBe("此棋步不符合象棋走法規則");
  });
});
