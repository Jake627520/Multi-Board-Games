import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { autosaveKey, hasAutosave } from "../../src/core/persistence/autosave";
import { clickCell, moveHistoryHeaderText, renderedMoveCount } from "./board-persistence-helpers";
import { clickReset, mulberry32, playViaUi, seedAutosave } from "./autosave-helpers";

/**
 * 首頁「繼續上次的 X」按鈕必須名副其實：
 * 只有真的有可續的局才顯示，點下去棋譜要還原（原本是空頭支票：點進去是 0 步）。
 */
const resumeButton = () => screen.queryByTestId("resume-last-game");

function enter(gameId: "xiangqi" | "gomoku" | "banqi"): void {
  fireEvent.click(screen.getByTestId(`play-pvp-${gameId}`));
}

function goHome(): void {
  fireEvent.click(screen.getByTestId("back-to-home"));
}

describe("首頁「繼續」按鈕與自動存檔", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(Math, "random").mockImplementation(mulberry32(20261003));
    // 對局中回首頁會跳確認；一律同意
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("全新使用者：首頁沒有繼續按鈕", () => {
    render(createElement(App));
    expect(screen.getByTestId("game-home")).toBeTruthy();
    expect(resumeButton()).toBeNull();
  });

  it("進了棋盤但一步沒走就回首頁：沒有繼續按鈕（修正前：有，而且是空頭支票）", () => {
    render(createElement(App));
    enter("xiangqi");
    goHome();
    expect(resumeButton()).toBeNull();
  });

  it("走一步 → 回首頁 → 有繼續按鈕 → 點下去棋譜還原（不是 0 步）", () => {
    render(createElement(App));
    enter("xiangqi");
    clickCell(6, 4);
    clickCell(5, 4);
    expect(renderedMoveCount()).toBe(1);

    goHome();
    const btn = resumeButton();
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain("中國象棋");

    fireEvent.click(btn!);
    expect(screen.getByTestId("xiangqi-board")).toBeTruthy();
    expect(renderedMoveCount()).toBe(1);
    expect(moveHistoryHeaderText()).toContain("對局步譜（1 步）");
    expect(
      screen.getByRole("button", { name: "5-4 red soldier" })
    ).toBeTruthy();
  });

  it("三種棋都一樣：走一步 → 回首頁 → 繼續 → 步數還原", () => {
    render(createElement(App));
    const plays: Record<string, () => void> = {
      xiangqi: () => {
        clickCell(6, 4);
        clickCell(5, 4);
      },
      gomoku: () => clickCell(7, 7),
      banqi: () => clickCell(0, 0),
    };
    for (const id of ["xiangqi", "gomoku", "banqi"] as const) {
      // 回首頁選棋種（上一輪已回到首頁）；本輪結束後 lastGame 會是這個棋種
      enter(id);
      plays[id]();
      expect(renderedMoveCount()).toBe(1);
      goHome();
      expect(resumeButton()).not.toBeNull();
      fireEvent.click(resumeButton()!);
      expect(renderedMoveCount()).toBe(1);
      goHome();
    }
  });

  it("按重新開始後：自動存檔消失，首頁不再有繼續按鈕", () => {
    render(createElement(App));
    enter("gomoku");
    clickCell(7, 7);
    clickReset();
    expect(hasAutosave("gomoku")).toBe(false);
    goHome();
    expect(resumeButton()).toBeNull();
  });

  it("對局結束後：自動存檔消失，首頁不再有繼續按鈕", () => {
    const engine = createGomokuEngine();
    const seq = [
      { row: 7, col: 3 }, { row: 8, col: 3 },
      { row: 7, col: 4 }, { row: 8, col: 5 },
      { row: 7, col: 5 }, { row: 8, col: 7 },
      { row: 7, col: 6 }, { row: 8, col: 9 },
      { row: 7, col: 7 },
    ];
    seedAutosave(engine, engine.createInitialState(), seq.slice(0, -1));
    window.localStorage.setItem("mbg:last-game", "gomoku");

    render(createElement(App));
    expect(resumeButton()).not.toBeNull();
    fireEvent.click(resumeButton()!);
    expect(renderedMoveCount()).toBe(8);

    playViaUi(seq[seq.length - 1]);
    expect(document.querySelector(".gameover")).not.toBeNull();
    expect(window.localStorage.getItem(autosaveKey("gomoku"))).toBeNull();

    goHome();
    expect(resumeButton()).toBeNull();
  });

  it("自動存檔損毀：首頁不顯示繼續按鈕", () => {
    window.localStorage.setItem("mbg:last-game", "xiangqi");
    window.localStorage.setItem(autosaveKey("xiangqi"), "garbage");
    render(createElement(App));
    expect(resumeButton()).toBeNull();
  });

  it("localStorage 讀取丟例外：首頁照常顯示、沒有繼續按鈕", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(createElement(App));
    expect(screen.getByTestId("game-home")).toBeTruthy();
    expect(resumeButton()).toBeNull();
    enter("xiangqi");
    expect(screen.getByTestId("xiangqi-board")).toBeTruthy();
  });

  it("寫入配額滿：App 內照常下棋，回首頁沒有繼續按鈕、不白屏", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    render(createElement(App));
    enter("xiangqi");
    clickCell(6, 4);
    clickCell(5, 4);
    expect(renderedMoveCount()).toBe(1);
    goHome();
    expect(screen.getByTestId("game-home")).toBeTruthy();
    expect(resumeButton()).toBeNull();
  });

  it("StrictMode（正式入口 main.tsx 的包法，effect 會雙跑）下一樣能還原", () => {
    const strict = () => createElement(StrictMode, null, createElement(App));
    const first = render(strict());
    enter("banqi");
    clickCell(0, 0);
    clickCell(1, 1);
    expect(renderedMoveCount()).toBe(2);
    first.unmount();
    cleanup();

    render(strict());
    // lastGame 是 banqi 且有自動存檔 -> 首頁有繼續按鈕
    expect(resumeButton()).not.toBeNull();
    fireEvent.click(resumeButton()!);
    expect(renderedMoveCount()).toBe(2);
  });
});
