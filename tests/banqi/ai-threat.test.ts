import { describe, expect, it } from "vitest";
import { adjacentThreatValue, attackedAt } from "../../src/games/banqi/ai";
import type { BanqiViewState } from "../../src/games/banqi/types";

type Board = BanqiViewState["board"];

function revealed(player: "red" | "black", type: string, rank: number) {
  return { id: `${player}-${type}`, player, type, rank, isRevealed: true as const };
}

/** 4×8 空盤，放入指定位置的明子。 */
function boardWith(pieces: Record<string, ReturnType<typeof revealed>>): Board {
  const b: Board = Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => null));
  for (const [key, piece] of Object.entries(pieces)) {
    const [r, c] = key.split(",").map(Number);
    (b[r] as unknown[])[c] = piece;
  }
  return b;
}

/**
 * 炮只能隔子跳吃，相鄰的炮吃不到任何子。canCapture 只比階級（炮 2 ≥ 卒 1），
 * 先前穩健型 AI 直接沿用它，把相鄰的敵炮誤判成威脅而系統性高估危險。
 */
describe("穩健型 AI 的威脅判斷", () => {
  it("相鄰的敵炮不構成威脅", () => {
    const board = boardWith({ "1,1": revealed("red", "soldier", 1), "1,2": revealed("black", "cannon", 2) });
    expect(attackedAt(board, 1, 1)).toBe(false);
  });

  it("相鄰的高階敵子構成威脅", () => {
    const board = boardWith({ "1,1": revealed("red", "soldier", 1), "1,2": revealed("black", "horse", 3) });
    expect(attackedAt(board, 1, 1)).toBe(true);
  });

  it("兵吃將：相鄰的敵兵對將構成威脅", () => {
    const board = boardWith({ "1,1": revealed("red", "general", 7), "1,2": revealed("black", "soldier", 1) });
    expect(attackedAt(board, 1, 1)).toBe(true);
  });

  it("翻子風險不計相鄰的敵炮", () => {
    const onlyCannon = boardWith({ "1,2": revealed("black", "cannon", 2) });
    expect(adjacentThreatValue(onlyCannon, 1, 1, "red")).toBe(0);

    const withHorse = boardWith({ "1,2": revealed("black", "horse", 3) });
    expect(adjacentThreatValue(withHorse, 1, 1, "red")).toBeGreaterThan(0);
  });
});
