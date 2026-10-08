import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import type { GameEngine, GameId } from "../../src/core/game/types";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { autosaveKey, readAutosave, writeAutosave } from "../../src/core/persistence/autosave";
import { mulberry32, seedAutosave } from "./autosave-helpers";

/**
 * 首頁每張卡有兩個對手入口（雙人 / 對電腦）。
 * 優先序是這支測試最要守的：棋盤端 mode = saved.mode ?? initialMode ?? "pvp"，
 * 續局存檔的 mode 一定贏過首頁選擇——否則玩家續上一局 PvE，會因為在首頁點了
 * 「雙人對戰」（或預設）被無聲改成 PvP。
 */
const GAMES: readonly GameId[] = ["xiangqi", "gomoku", "banqi"];

function engineFor(id: GameId): GameEngine<unknown, unknown, unknown> {
  const e =
    id === "xiangqi" ? createXiangqiEngine() : id === "gomoku" ? createGomokuEngine() : createBanqiEngine();
  return e as unknown as GameEngine<unknown, unknown, unknown>;
}

/** 寫一份「走過一步」的自動存檔，並把指定的 UI mode 附在 envelope 的 ui 欄位上。 */
function seedAutosaveWithMode(id: GameId, mode: "pvp" | "pve"): void {
  const engine = engineFor(id);
  const initial = engine.createInitialState();
  const [first] = engine.getLegalMoves(initial);
  seedAutosave(engine, initial, [first]);
  const raw = readAutosave(id);
  expect(raw).not.toBeNull();
  // humanPlayer 取「第一手之後輪到的那方」，這樣 PvE 續局時 AI 不需要馬上動
  const humanPlayer = engine.getCurrentPlayer(engine.applyMove(initial, first));
  writeAutosave(id, raw!, { mode, humanPlayer: String(humanPlayer), aiLevel: "l1" });
  expect(JSON.parse(readAutosave(id)!).ui.mode).toBe(mode);
}

const pvpBtn = () => screen.getByTestId("mode-pvp");
const pveBtn = () => screen.getByTestId("mode-pve");
const isActive = (el: HTMLElement) => el.classList.contains("active");

describe("首頁對手入口（雙人 / 對電腦）", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // 暗棋開局會洗牌：固定種子，避免 flaky
    vi.spyOn(Math, "random").mockImplementation(mulberry32(20261008));
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("每張卡都有「雙人對戰」與「對戰電腦」兩個入口，文字清楚", () => {
    render(createElement(App));
    for (const id of GAMES) {
      const pvp = screen.getByTestId(`play-pvp-${id}`);
      const pve = screen.getByTestId(`play-pve-${id}`);
      expect(pvp.textContent).toContain("雙人對戰");
      expect(pvp.textContent).toContain("Two Players");
      expect(pve.textContent).toContain("對戰電腦");
      expect(pve.textContent).toContain("vs Computer");
    }
  });

  describe.each(GAMES)("%s", (id) => {
    it("首頁點「對戰電腦」→ 進入 PvE", () => {
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pve-${id}`));
      expect(isActive(pveBtn())).toBe(true);
      expect(isActive(pvpBtn())).toBe(false);
      expect(screen.getByTestId("side-selector")).toBeTruthy();
    });

    it("首頁點「雙人對戰」→ 進入 PvP", () => {
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pvp-${id}`));
      expect(isActive(pvpBtn())).toBe(true);
      expect(isActive(pveBtn())).toBe(false);
      expect(screen.queryByTestId("side-selector")).toBeNull();
    });

    it("優先序：存檔是 PvE，就算從首頁點「雙人對戰」，續局仍是 PvE", () => {
      seedAutosaveWithMode(id, "pve");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pvp-${id}`));
      expect(isActive(pveBtn())).toBe(true);
      expect(isActive(pvpBtn())).toBe(false);
    });

    it("優先序：存檔是 PvP，從首頁點「對戰電腦」，續局仍是 PvP（存檔贏過首頁）", () => {
      seedAutosaveWithMode(id, "pvp");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pve-${id}`));
      expect(isActive(pvpBtn())).toBe(true);
      expect(isActive(pveBtn())).toBe(false);
    });

    it("「繼續上次」不帶 mode：續上存檔的 PvE", () => {
      seedAutosaveWithMode(id, "pve");
      // 讓 last-game 指向這個棋種，首頁才會出現繼續按鈕
      window.localStorage.setItem("mbg:last-game", id);
      render(createElement(App));
      const resume = screen.queryByTestId("resume-last-game");
      if (!resume) throw new Error("expected resume button; check last-game storage key");
      fireEvent.click(resume);
      expect(isActive(pveBtn())).toBe(true);
    });
  });

  it("首頁選的對手不會漏到別的棋種：從首頁 PvE 進象棋，再用切換器換成五子棋 → PvP", () => {
    render(createElement(App));
    fireEvent.click(screen.getByTestId("play-pve-xiangqi"));
    expect(isActive(pveBtn())).toBe(true);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "gomoku" } });
    expect(screen.getByTestId("gomoku-board")).toBeTruthy();
    expect(isActive(pvpBtn())).toBe(true);
  });

  it("開新局後存檔被清掉，不會殘留舊的 mode 存檔", () => {
    seedAutosaveWithMode("gomoku", "pve");
    render(createElement(App));
    fireEvent.click(screen.getByTestId("new-game-gomoku"));
    expect(window.localStorage.getItem(autosaveKey("gomoku"))).toBeNull();
    // 沒帶 mode 的入口 → 預設 PvP
    expect(isActive(pvpBtn())).toBe(true);
  });
});
