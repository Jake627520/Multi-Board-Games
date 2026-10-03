import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { SaveManager } from "../../src/core/persistence/save-manager";
import {
  AUTOSAVE_PREFIX,
  autosaveKey,
  clearAutosave,
  hasAutosave,
  readAutosave,
  writeAutosave,
} from "../../src/core/persistence/autosave";
import { listSaves, saveGameToStorage } from "../../src/core/persistence/local-storage";
import { createGomokuEngine } from "../../src/games/gomoku/engine";

function oneMoveEnvelope(): string {
  const engine = createGomokuEngine();
  const session = new GameSession(engine);
  session.move({ row: 7, col: 7 });
  return new SaveManager().save(session, engine);
}

describe("autosave 儲存層", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("key 前綴與使用者存檔的 mbg-save: 不同", () => {
    expect(AUTOSAVE_PREFIX).not.toBe("mbg-save:");
    expect(autosaveKey("xiangqi")).toBe("mbg-autosave:xiangqi");
    expect(autosaveKey("xiangqi").startsWith("mbg-save:")).toBe(false);
  });

  it("寫入 → 讀回 → 清除", () => {
    const env = oneMoveEnvelope();
    expect(readAutosave("gomoku")).toBeNull();
    expect(writeAutosave("gomoku", env)).toBe(true);
    expect(readAutosave("gomoku")).toBe(env);
    clearAutosave("gomoku");
    expect(readAutosave("gomoku")).toBeNull();
  });

  it("listSaves 不會列出自動存檔，也不影響使用者存檔數量", () => {
    const env = oneMoveEnvelope();
    writeAutosave("gomoku", env);
    expect(listSaves("gomoku")).toEqual([]);
    expect(listSaves()).toEqual([]);

    saveGameToStorage("gomoku", "我的存檔", env, 1);
    const saves = listSaves("gomoku");
    expect(saves).toHaveLength(1);
    expect(saves[0].name).toBe("我的存檔");
    // 自動存檔仍在、且仍是獨立的一筆
    expect(readAutosave("gomoku")).toBe(env);
  });

  it("使用者存檔超過上限被修剪時，不會誤刪自動存檔", () => {
    const env = oneMoveEnvelope();
    writeAutosave("gomoku", env);
    for (let i = 0; i < 25; i++) saveGameToStorage("gomoku", `s${i}`, env, 1);
    expect(listSaves("gomoku").length).toBeLessThanOrEqual(20);
    expect(readAutosave("gomoku")).toBe(env);
  });

  it("hasAutosave：只有「可解析且至少一步」才算可續", () => {
    expect(hasAutosave("gomoku")).toBe(false);

    writeAutosave("gomoku", "not json");
    expect(hasAutosave("gomoku")).toBe(false);

    writeAutosave("gomoku", JSON.stringify({ formatVersion: 2, history: [] }));
    expect(hasAutosave("gomoku")).toBe(false);

    writeAutosave("gomoku", oneMoveEnvelope());
    expect(hasAutosave("gomoku")).toBe(true);
    expect(hasAutosave("xiangqi")).toBe(false);
  });

  it("配額滿（setItem 丟 QuotaExceededError）：不丟例外、回傳 false，且舊的自動存檔一併清除", () => {
    const env = oneMoveEnvelope();
    writeAutosave("gomoku", env);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => writeAutosave("gomoku", env)).not.toThrow();
    expect(writeAutosave("gomoku", env)).toBe(false);
    // 留著舊的會讓「繼續」無聲倒退，所以寧可沒有
    expect(readAutosave("gomoku")).toBeNull();
    expect(hasAutosave("gomoku")).toBe(false);
  });

  it("localStorage 讀取 / 刪除都丟例外時，所有函式降級而不丟例外", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readAutosave("gomoku")).toBeNull();
    expect(hasAutosave("gomoku")).toBe(false);
    expect(() => clearAutosave("gomoku")).not.toThrow();
  });
});
