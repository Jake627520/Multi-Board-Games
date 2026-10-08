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
 * 首頁每張卡有兩個對手入口（雙人 / 對電腦）＋ 有存檔時一個「繼續」入口。
 * 語義分工是這支測試最要守的：
 *   - 兩個 mode 按鈕一律「開新局」並用選的對手——玩家明確點了就該尊重，
 *     有未完成存檔時先確認放棄（避免「點對戰電腦卻進了雙人」）。
 *   - 「繼續」入口（卡片上的 resume-game，或頂部 resume-last-game 橫幅）才是
 *     續局，用存檔的 mode。
 * 開新局進入前會清掉該棋種的 autosave，所以棋盤端 saved.mode 為空、
 * 由 initialMode 生效。
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

    it("存檔是 PvE，點「雙人對戰」→ 確認後開新局且是 PvP（尊重按鈕，不續存檔）", () => {
      seedAutosaveWithMode(id, "pve");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pvp-${id}`));
      // 開新局用選的對手，不是續上存檔的 PvE
      expect(isActive(pvpBtn())).toBe(true);
      expect(isActive(pveBtn())).toBe(false);
      // 開新局清掉存檔
      expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();
    });

    it("存檔是 PvP，點「對戰電腦」→ 確認後開新局且是 PvE", () => {
      seedAutosaveWithMode(id, "pvp");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pve-${id}`));
      expect(isActive(pveBtn())).toBe(true);
      expect(isActive(pvpBtn())).toBe(false);
      expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();
    });

    it("有存檔時點 mode 按鈕、取消確認 → 不進入、存檔還在", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      seedAutosaveWithMode(id, "pve");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`play-pvp-${id}`));
      // 還在首頁，存檔未被清
      expect(screen.getByTestId("game-home")).toBeTruthy();
      expect(window.localStorage.getItem(autosaveKey(id))).not.toBeNull();
    });

    it("卡片「繼續」入口 → 續上存檔的 PvE（mode 來自存檔，不是首頁）", () => {
      seedAutosaveWithMode(id, "pve");
      render(createElement(App));
      fireEvent.click(screen.getByTestId(`resume-game-${id}`));
      expect(isActive(pveBtn())).toBe(true);
      // 續局不清存檔
      expect(window.localStorage.getItem(autosaveKey(id))).not.toBeNull();
    });

    it("「繼續上次」橫幅不帶 mode：續上存檔的 PvE", () => {
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

  it("開新局（點 mode 按鈕）後存檔被清掉，不會殘留舊的 mode 存檔", () => {
    seedAutosaveWithMode("gomoku", "pve");
    render(createElement(App));
    fireEvent.click(screen.getByTestId("play-pvp-gomoku"));
    expect(window.localStorage.getItem(autosaveKey("gomoku"))).toBeNull();
    expect(isActive(pvpBtn())).toBe(true);
  });
});
