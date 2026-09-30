import { describe, expect, it } from "vitest";
import {
  createSeededRng,
  pickWithinEpsilon,
  resolveRng,
  type Scored,
} from "../../src/core/ai/random";

describe("AI 隨機源與 ε 內選取", () => {
  it("同一個 seed 產生同一串數字，不同 seed 不同，且都落在 [0,1)", () => {
    const a = createSeededRng(7);
    const b = createSeededRng(7);
    const c = createSeededRng(8);
    const sa = Array.from({ length: 20 }, () => a());
    const sb = Array.from({ length: 20 }, () => b());
    const sc = Array.from({ length: 20 }, () => c());
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const x of sa) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("resolveRng：rng 優先於 seed，都沒給就是 Math.random", () => {
    const custom = () => 0.5;
    expect(resolveRng({ rng: custom, seed: 1 })).toBe(custom);
    expect(resolveRng()).toBe(Math.random);
    expect(resolveRng({ seed: 3 })()).toBe(createSeededRng(3)());
  });

  const scored: Scored<string>[] = [
    { item: "a", score: 10 },
    { item: "b", score: 100 },
    { item: "c", score: 95 },
    { item: "d", score: 100 },
    { item: "e", score: 80 },
  ];

  it("只會挑到最佳分數 ε 以內的項目，門檻以外的永遠不會被選", () => {
    const seen = new Set<string>();
    const rng = createSeededRng(1);
    for (let i = 0; i < 300; i++) seen.add(pickWithinEpsilon(scored, 5, rng));
    expect([...seen].sort()).toEqual(["b", "c", "d"]);
  });

  it("ε = 0 時只在並列最佳之間選", () => {
    const seen = new Set<string>();
    const rng = createSeededRng(2);
    for (let i = 0; i < 200; i++) seen.add(pickWithinEpsilon(scored, 0, rng));
    expect([...seen].sort()).toEqual(["b", "d"]);
  });

  it("rng 恆為 0 時等同舊版「第一個最高分」", () => {
    expect(pickWithinEpsilon(scored, 5, () => 0)).toBe("b");
    expect(pickWithinEpsilon(scored, 1000, () => 0)).toBe("b");
  });

  it("防禦 rng 回傳 1（越界）", () => {
    expect(["b", "c", "d"]).toContain(pickWithinEpsilon(scored, 5, () => 1));
  });

  it("最佳分數達 decisiveScore（必勝／必敗）時不隨機，固定取第一個最佳", () => {
    const won: Scored<string>[] = [
      { item: "x", score: 100_000 },
      { item: "y", score: 100_000 },
      { item: "z", score: 99_995 },
    ];
    const lost: Scored<string>[] = [
      { item: "p", score: -100_000 },
      { item: "q", score: -100_000 },
    ];
    const rng = createSeededRng(9);
    for (let i = 0; i < 50; i++) {
      expect(pickWithinEpsilon(won, 10, rng, 100_000)).toBe("x");
      expect(pickWithinEpsilon(lost, 10, rng, 100_000)).toBe("p");
    }
  });

  it("空候選會丟錯", () => {
    expect(() => pickWithinEpsilon([], 1, () => 0)).toThrow();
  });
});
