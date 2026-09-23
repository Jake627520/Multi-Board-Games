import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { getCell, renderedMoveCount } from "./board-persistence-helpers";

/**
 * 手機上五子棋格子只有 ~20px，遠低於 WCAG 建議的 44×44 觸控目標，且
 * 15 格 × 44px > 390px 螢幕寬，放大格子在數學上無解。改用「兩段式落子」：
 * 觸控裝置第一次點格子只放預覽子（點錯零代價），要按確認列上一個
 * ≥44×44 的「落子」大按鈕才真的提交。滑鼠／鍵盤維持點一下直接落子。
 *
 * 這支測試驗證：
 * 1. 觸控（matchMedia "(pointer: coarse)" 為 true）→ 兩段式路徑。
 * 2. 非觸控（沒有 matchMedia，或回報不匹配）→ 舊有的點一下直接落子路徑不變，
 *    這也是既有的 gomoku-board.component.test.ts 在 jsdom 下能維持全綠的原因。
 */

type MediaQueryListenerMap = Map<string, Set<(event: MediaQueryListEvent) => void>>;

/** 安裝一個假的 window.matchMedia，只有 "(pointer: coarse)" 這個 query 會依 matches 回報。 */
function installMatchMedia(matches: boolean): void {
  const listenerMap: MediaQueryListenerMap = new Map();

  window.matchMedia = ((query: string) => {
    const isCoarseQuery = query.includes("coarse");
    const mql = {
      matches: isCoarseQuery ? matches : false,
      media: query,
      onchange: null,
      addEventListener: (type: string, cb: EventListenerOrEventListenerObject) => {
        if (type !== "change") return;
        const set = listenerMap.get(query) ?? new Set();
        set.add(cb as (event: MediaQueryListEvent) => void);
        listenerMap.set(query, set);
      },
      removeEventListener: (type: string, cb: EventListenerOrEventListenerObject) => {
        if (type !== "change") return;
        listenerMap.get(query)?.delete(cb as (event: MediaQueryListEvent) => void);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return mql as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
}

function uninstallMatchMedia(): void {
  // @ts-expect-error -- 測試特意還原成 jsdom 原本「沒有 matchMedia」的狀態
  delete window.matchMedia;
}

describe("GomokuBoard 觸控兩段式落子（(pointer: coarse) 為真）", () => {
  beforeEach(() => {
    window.localStorage.clear();
    installMatchMedia(true);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    uninstallMatchMedia();
  });

  it("點一格只放預覽子，不提交；棋譜仍為 0", () => {
    render(createElement(GomokuBoard));

    expect(renderedMoveCount()).toBe(0);
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();

    fireEvent.click(getCell(7, 7));

    expect(renderedMoveCount()).toBe(0);
    expect(screen.getByTestId("stone-preview")).toBeTruthy();
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 空位");
    expect(screen.getByTestId("tap-confirm-bar")).toBeTruthy();
  });

  it("點另一格，預覽移動到新位置，棋譜仍為 0（點錯零代價）", () => {
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));
    expect(renderedMoveCount()).toBe(0);

    fireEvent.click(getCell(8, 8));

    expect(renderedMoveCount()).toBe(0);
    // 舊的預覽位置已清空，新位置出現預覽子
    expect(getCell(7, 7).querySelector('[data-testid="stone-preview"]')).toBeNull();
    expect(getCell(8, 8).querySelector('[data-testid="stone-preview"]')).toBeTruthy();
  });

  it("按「落子」才真的提交：棋譜變 1，預覽與確認列消失", () => {
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));
    expect(renderedMoveCount()).toBe(0);

    fireEvent.click(screen.getByTestId("tap-confirm-commit-btn"));

    expect(renderedMoveCount()).toBe(1);
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();
  });

  it("按「取消」捨棄預覽，棋譜仍為 0", () => {
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));
    fireEvent.click(screen.getByTestId("tap-confirm-cancel-btn"));

    expect(renderedMoveCount()).toBe(0);
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 空位");
  });

  it("重新開始會清掉待確認的預覽", () => {
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));
    expect(screen.getByTestId("tap-confirm-bar")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("重新開始"));

    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(renderedMoveCount()).toBe(0);
  });
});

describe("GomokuBoard 非觸控裝置：點一下直接落子（舊行為不變）", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    uninstallMatchMedia();
  });

  it("沒有 window.matchMedia（典型 jsdom）時，點一格直接落子", () => {
    // 確保這個環境真的沒有 matchMedia，模擬 jsdom 預設狀態
    uninstallMatchMedia();
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));

    expect(renderedMoveCount()).toBe(1);
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();
  });

  it("matchMedia 回報 (pointer: coarse) 不匹配時，點一格直接落子", () => {
    installMatchMedia(false);
    render(createElement(GomokuBoard));

    fireEvent.click(getCell(7, 7));

    expect(renderedMoveCount()).toBe(1);
    expect(getCell(7, 7).getAttribute("aria-label")).toBe("7-7 black");
    expect(screen.queryByTestId("stone-preview")).toBeNull();
    expect(screen.queryByTestId("tap-confirm-bar")).toBeNull();
  });
});
