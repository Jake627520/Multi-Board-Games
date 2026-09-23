import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import type { GameEngine } from "../../src/core/game/types";

/**
 * 驗收條件 #2：往返性質測試。
 * 三種棋各產生至少 200 個隨機局面（固定種子、可重現），驗證：
 *   1. deserialize(serialize(s)) 與 s 深度相等
 *   2. serialize(deserialize(serialize(s))) === serialize(s)（canonical、穩定）
 *
 * 用自製的 mulberry32 PRNG 暫時取代 Math.random，讓暗棋洗牌與隨機選步都可重現。
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomStates<State, Move, ViewState>(
  engine: GameEngine<State, Move, ViewState>,
  count: number,
  seedBase: number,
  maxMovesPerGame: number
): State[] {
  const states: State[] = [];
  const originalRandom = Math.random;
  try {
    for (let i = 0; i < count; i++) {
      const rng = mulberry32(seedBase + i * 7919);
      Math.random = rng; // 暗棋 createInitialState 內部洗牌吃這個
      let state = engine.createInitialState();
      const numMoves = Math.floor(rng() * maxMovesPerGame);
      for (let m = 0; m < numMoves; m++) {
        if (engine.isGameOver(state)) break;
        const moves = engine.getLegalMoves(state);
        if (moves.length === 0) break;
        const idx = Math.floor(rng() * moves.length);
        state = engine.applyMove(state, moves[idx]);
      }
      states.push(state);
    }
  } finally {
    Math.random = originalRandom;
  }
  return states;
}

function assertRoundTrip<State, Move, ViewState>(
  engine: GameEngine<State, Move, ViewState>,
  states: State[]
): void {
  expect(states.length).toBeGreaterThanOrEqual(200);
  for (const state of states) {
    const serialized = engine.serialize(state);
    const restored = engine.deserialize(serialized);
    expect(restored).toEqual(state);
    const reserialized = engine.serialize(restored);
    expect(reserialized).toBe(serialized);
  }
}

describe("Compact serialization round-trip (property-based, seeded)", () => {
  it("Xiangqi: 200 random states round-trip losslessly and canonically", () => {
    const engine = createXiangqiEngine();
    const states = randomStates(engine, 200, 1_000_000, 40);
    assertRoundTrip(engine, states);
  });

  it("Gomoku: 200 random states round-trip losslessly and canonically", () => {
    const engine = createGomokuEngine();
    const states = randomStates(engine, 200, 2_000_000, 60);
    assertRoundTrip(engine, states);
  });

  it("Banqi: 200 random states round-trip losslessly and canonically", () => {
    const engine = createBanqiEngine();
    const states = randomStates(engine, 200, 3_000_000, 80);
    assertRoundTrip(engine, states);
  });

  it("is reproducible: the same seed produces the same set of states", () => {
    const engine = createXiangqiEngine();
    const a = randomStates(engine, 20, 42, 30).map((s) => engine.serialize(s));
    const b = randomStates(engine, 20, 42, 30).map((s) => engine.serialize(s));
    expect(a).toEqual(b);
  });
});
