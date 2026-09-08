import { describe, it, expect, beforeEach } from "vitest";
import {
  listSaves,
  saveGameToStorage,
  loadSaveFromStorage,
  deleteSave,
  renameSave,
  getStorage,
} from "../../src/core/persistence/local-storage";

describe("Local Storage Persistence (Round 14)", () => {
  beforeEach(() => {
    getStorage().clear();
  });

  it("saves game and lists saved metadata", () => {
    const dummyEnvelope = JSON.stringify({
      formatVersion: 1,
      gameId: "gomoku",
      engineVersion: "0.12.0",
      state: "{}",
      savedAt: new Date().toISOString(),
    });

    const meta = saveGameToStorage("gomoku", "測試局", dummyEnvelope, 5);
    expect(meta.name).toBe("測試局");
    expect(meta.gameId).toBe("gomoku");
    expect(meta.moveCount).toBe(5);

    const list = listSaves("gomoku");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(meta.id);
    expect(list[0].name).toBe("測試局");
  });

  it("filters saves by gameId", () => {
    saveGameToStorage("gomoku", "五子棋存檔", "{}", 2);
    saveGameToStorage("xiangqi", "象棋存檔", "{}", 4);

    expect(listSaves("gomoku")).toHaveLength(1);
    expect(listSaves("xiangqi")).toHaveLength(1);
    expect(listSaves()).toHaveLength(2);
  });

  it("loads a specific save from storage", () => {
    const saved = saveGameToStorage("banqi", "暗棋1", '{"state":"ok"}', 10);
    const loaded = loadSaveFromStorage(saved.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("暗棋1");
    expect(loaded?.data).toBe('{"state":"ok"}');
  });

  it("renames an existing save", () => {
    const saved = saveGameToStorage("gomoku", "舊名稱", "{}", 3);
    const updated = renameSave(saved.id, "新名稱");
    expect(updated?.name).toBe("新名稱");

    const reloaded = loadSaveFromStorage(saved.id);
    expect(reloaded?.name).toBe("新名稱");
  });

  it("deletes an existing save", () => {
    const saved = saveGameToStorage("xiangqi", "將刪除", "{}", 1);
    expect(listSaves("xiangqi")).toHaveLength(1);

    deleteSave(saved.id);
    expect(listSaves("xiangqi")).toHaveLength(0);
    expect(loadSaveFromStorage(saved.id)).toBeNull();
  });

  it("enforces max 20 saves per game to prevent quota overflow", () => {
    for (let i = 1; i <= 25; i++) {
      saveGameToStorage("gomoku", `存檔${i}`, "{}", i);
    }

    const list = listSaves("gomoku");
    expect(list.length).toBeLessThanOrEqual(20);
  });
});
