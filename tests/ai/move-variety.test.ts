import { describe, expect, it } from "vitest";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createGomokuAiLevel1, createGomokuAiLevel2 } from "../../src/games/gomoku/ai";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createXiangqiAiLevel1, createXiangqiAiLevel2 } from "../../src/games/xiangqi/ai";
import { buildState, createPiece } from "../xiangqi/test-helper";
import { getLegalMoves as xiangqiLegal } from "../../src/games/xiangqi/rules";
import { getLegalMoves as gomokuLegal } from "../../src/games/gomoku/rules";
import { createInitialState as gomokuInitial } from "../../src/games/gomoku/board";

const key = (m: unknown) => JSON.stringify(m);

describe("象棋 AI：同一局面不再永遠同一步", () => {
  const engine = createXiangqiEngine();
  const state = engine.createInitialState();
  const legal = engine.getLegalMoves(state);
  const SEEDS = 15;

  for (const [name, make] of [
    ["Level 1", createXiangqiAiLevel1],
    ["Level 2", createXiangqiAiLevel2],
  ] as const) {
    it(`${name}：不同 seed 會走出不同開局著法，且都合法`, async () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEEDS; seed++) {
        const m = await make({ seed }).selectMove(state, legal);
        expect(legal.map(key)).toContain(key(m));
        seen.add(key(m));
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    it(`${name}：同 seed 可重現（不 flaky）`, async () => {
      const a = await make({ seed: 123 }).selectMove(state, legal);
      const b = await make({ seed: 123 }).selectMove(state, legal);
      expect(key(a)).toBe(key(b));
    });
  }

  it("Level 2 看到必勝時每個 seed 都走同一手（不為隨機放掉殺著）", async () => {
    const mate = buildState(
      [
        createPiece("rg", "red", "general", 9, 4),
        createPiece("bg", "black", "general", 0, 3),
        createPiece("rc1", "red", "chariot", 1, 0),
        createPiece("rc2", "red", "chariot", 2, 8),
      ],
      "red"
    );
    const moves = xiangqiLegal(mate);
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      seen.add(key(await createXiangqiAiLevel2({ seed }).selectMove(mate, moves)));
    }
    expect(seen.size).toBe(1);
  });

  it("Level 2 不會為了隨機而放掉一顆免費的車", async () => {
    // 紅車在 (5,4)，黑車無保護地停在 (5,7)（同列、中間空）；紅先走，吃車是唯一好手。
    const s = buildState(
      [
        createPiece("rg", "red", "general", 9, 3),
        createPiece("bg", "black", "general", 0, 5),
        createPiece("rc", "red", "chariot", 5, 4),
        createPiece("bc", "black", "chariot", 5, 7),
      ],
      "red"
    );
    const moves = xiangqiLegal(s);
    for (let seed = 0; seed < 40; seed++) {
      const m = await createXiangqiAiLevel2({ seed }).selectMove(s, moves);
      expect(m.to).toEqual({ row: 5, col: 7 });
    }
  });
});

describe("五子棋 AI：同一局面不再永遠同一步", () => {
  const engine = createGomokuEngine();
  // 黑天元、白已回應一手，輪到黑：左右對稱的局面有很多近乎並列的好點。
  let state = engine.createInitialState();
  state = engine.applyMove(state, { row: 7, col: 7 });
  state = engine.applyMove(state, { row: 7, col: 8 });
  const legal = engine.getLegalMoves(state);

  for (const [name, make] of [
    ["Level 1", createGomokuAiLevel1],
    ["Level 2", createGomokuAiLevel2],
  ] as const) {
    it(`${name}：不同 seed 會走出不同著法，且都合法`, async () => {
      const seen = new Set<string>();
      for (let seed = 0; seed < 40; seed++) {
        const m = await make({ seed }).selectMove(state, legal);
        expect(legal.map(key)).toContain(key(m));
        seen.add(key(m));
      }
      expect(seen.size).toBeGreaterThan(1);
    });

    it(`${name}：同 seed 可重現`, async () => {
      const a = await make({ seed: 5 }).selectMove(state, legal);
      const b = await make({ seed: 5 }).selectMove(state, legal);
      expect(key(a)).toBe(key(b));
    });
  }

  it("Level 2 有必勝一手時每個 seed 都下在能連五的點", async () => {
    const s = gomokuInitial("freestyle");
    for (const c of [3, 4, 5, 6]) s.board[7][c] = "white";
    (s as { currentPlayer: string }).currentPlayer = "white";
    const moves = gomokuLegal(s);
    for (let seed = 0; seed < 30; seed++) {
      const m = await createGomokuAiLevel2({ seed }).selectMove(s, moves);
      expect([2, 7]).toContain(m.col);
      expect(m.row).toBe(7);
    }
  });

  it("Level 2 對方有活三以上時不會為了隨機而不防守", async () => {
    // 黑三連 (7,5)(7,6)(7,7)，兩端全空；白（AI）必須在兩端或緊鄰處防守，
    // 不能走到與威脅無關的地方。
    const s = gomokuInitial("freestyle");
    for (const c of [5, 6, 7]) s.board[7][c] = "black";
    s.board[8][6] = "white";
    (s as { currentPlayer: string }).currentPlayer = "white";
    const moves = gomokuLegal(s);
    for (let seed = 0; seed < 40; seed++) {
      const m = await createGomokuAiLevel2({ seed }).selectMove(s, moves);
      const onLine = m.row === 7 && m.col >= 3 && m.col <= 9;
      expect(onLine).toBe(true);
    }
  });
});
