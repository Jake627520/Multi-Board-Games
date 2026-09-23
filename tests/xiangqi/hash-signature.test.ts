import { describe, expect, it } from "vitest";
import { hashSignature, isHashSignature } from "../../src/games/shared/hash";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { boardSignature } from "../../src/games/xiangqi/rules";

/**
 * 驗收條件 #4：雜湊決定性測試。
 *
 * 1. 同一局面簽章字串重複計算雜湊必須永遠相同。
 * 2. 輸出格式固定為 32 個十六進位字元。
 * 3. 對數百個隨機局面驗證雜湊值彼此不碰撞。
 *
 * 隨機局面產生方式與 tests/serialization/compact-roundtrip.property.test.ts
 * 相同手法：固定種子的 mulberry32 PRNG 暫時取代 Math.random，跑隨機對局。
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

function randomBoardSignatures(count: number, seedBase: number, maxMovesPerGame: number): string[] {
  const engine = createXiangqiEngine();
  const signatures: string[] = [];
  const originalRandom = Math.random;
  try {
    for (let i = 0; i < count; i++) {
      const rng = mulberry32(seedBase + i * 7919);
      Math.random = rng;
      let state = engine.createInitialState();
      const numMoves = Math.floor(rng() * maxMovesPerGame);
      for (let m = 0; m < numMoves; m++) {
        if (engine.isGameOver(state)) break;
        const moves = engine.getLegalMoves(state);
        if (moves.length === 0) break;
        const idx = Math.floor(rng() * moves.length);
        state = engine.applyMove(state, moves[idx]);
      }
      signatures.push(boardSignature(state));
    }
  } finally {
    Math.random = originalRandom;
  }
  return signatures;
}

describe("hashSignature (self-implemented FNV-1a 64-bit x2 via BigInt)", () => {
  it("is deterministic: hashing the same signature string repeatedly always yields the same result", () => {
    const sig = "red:black-advisor@0,3;black-cannon@2,1;black-general@0,4";
    const first = hashSignature(sig);
    for (let i = 0; i < 200; i++) {
      expect(hashSignature(sig)).toBe(first);
    }
  });

  it("always outputs exactly 32 lowercase hex characters", () => {
    const signatures = randomBoardSignatures(50, 5_000_000, 30);
    expect(signatures.length).toBe(50);
    for (const sig of signatures) {
      const h = hashSignature(sig);
      expect(h).toMatch(/^[0-9a-f]{32}$/);
      expect(isHashSignature(h)).toBe(true);
    }
  });

  it("produces no collisions across several hundred distinct random board signatures", () => {
    const signatures = randomBoardSignatures(500, 9_000_000, 40);
    const uniqueSignatures = [...new Set(signatures)];
    // Sanity check that the random playouts actually produced meaningful variety.
    expect(uniqueSignatures.length).toBeGreaterThan(300);

    const hashes = uniqueSignatures.map(hashSignature);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(uniqueSignatures.length);
  });

  it("is not the identity/trivial function: different signatures produce different-looking hashes", () => {
    const a = hashSignature("red:black-advisor@0,3");
    const b = hashSignature("red:black-advisor@0,4");
    expect(a).not.toBe(b);
  });
});
