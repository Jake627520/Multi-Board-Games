import { describe, expect, it } from "vitest";
import { applyMove, boardSignature, getWinner, isGameOver } from "../../src/games/xiangqi/rules";
import { hashSignature, isHashSignature } from "../../src/games/shared/hash";
import { buildState, createPiece } from "./test-helper";

/**
 * 驗收條件 #2：重複偵測行為不變。
 * positionHistory 現在存的是 hashSignature(boardSignature(state))，而不是
 * 完整簽章字串本身，這裡驗證：
 *   1. 三次重複判定（和棋）的結果與改動前完全一致。
 *   2. 兩個車互換身分後回到相同局面，仍被判定為重複——證明雜湊沒有
 *      把棋子 id（身分）帶進判定依據裡。
 */
describe("positionHistory hashing preserves repetition-detection behavior", () => {
  it("detects threefold repetition exactly as before, and positionHistory now holds hashes", () => {
    // 與 tests/xiangqi/cyclical-rules.test.ts 完全相同的走法序列。
    let s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 4),
      createPiece("shield", "red", "soldier", 5, 4),
      createPiece("rc", "red", "chariot", 6, 0),
      createPiece("bc", "black", "chariot", 3, 8),
    ]);

    s = applyMove(s, { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
    s = applyMove(s, { from: { row: 3, col: 8 }, to: { row: 4, col: 8 } });
    s = applyMove(s, { from: { row: 5, col: 0 }, to: { row: 6, col: 0 } });
    s = applyMove(s, { from: { row: 4, col: 8 }, to: { row: 3, col: 8 } });
    expect(isGameOver(s)).toBe(false);

    s = applyMove(s, { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } });
    s = applyMove(s, { from: { row: 3, col: 8 }, to: { row: 4, col: 8 } });
    s = applyMove(s, { from: { row: 5, col: 0 }, to: { row: 6, col: 0 } });
    s = applyMove(s, { from: { row: 4, col: 8 }, to: { row: 3, col: 8 } }); // 3rd occurrence

    expect(isGameOver(s)).toBe(true);
    expect(s.isDraw).toBe(true);
    expect(getWinner(s)).toBeNull();
    expect(s.terminationReason).toBe("threefold_repetition");

    // positionHistory 現在應該全都是 32 個十六進位字元的雜湊，不是完整簽章字串。
    expect(s.positionHistory?.length).toBeGreaterThan(0);
    for (const entry of s.positionHistory ?? []) {
      expect(isHashSignature(entry)).toBe(true);
    }
  });

  it("two chariots swapping identities back to an identical board layout is still counted as a repeated position", () => {
    // Generals on different columns so the "flying general" rule never fires,
    // keeping this fixture focused purely on the chariot identity swap.
    let s = buildState([
      createPiece("rg", "red", "general", 9, 3),
      createPiece("bg", "black", "general", 0, 5),
      createPiece("adv", "black", "advisor", 0, 3),
      createPiece("rc1", "red", "chariot", 4, 0),
      createPiece("rc2", "red", "chariot", 6, 0),
    ]);

    const initialHash = hashSignature(boardSignature(s));

    // Red performs a 3-move cycle to swap rc1 and rc2's squares; Black just
    // bounces its advisor back and forth (reversible, keeps turn parity).
    s = applyMove(s, { from: { row: 4, col: 0 }, to: { row: 4, col: 8 } }); // rc1 -> (4,8)
    s = applyMove(s, { from: { row: 0, col: 3 }, to: { row: 1, col: 4 } });
    s = applyMove(s, { from: { row: 6, col: 0 }, to: { row: 4, col: 0 } }); // rc2 -> (4,0), rc1's old square
    s = applyMove(s, { from: { row: 1, col: 4 }, to: { row: 0, col: 3 } });
    s = applyMove(s, { from: { row: 4, col: 8 }, to: { row: 6, col: 8 } }); // rc1 -> (6,8)
    s = applyMove(s, { from: { row: 0, col: 3 }, to: { row: 1, col: 4 } });
    s = applyMove(s, { from: { row: 6, col: 8 }, to: { row: 6, col: 0 } }); // rc1 -> (6,0), rc2's old square
    s = applyMove(s, { from: { row: 1, col: 4 }, to: { row: 0, col: 3 } });

    // Board layout (piece types & positions) matches the initial position,
    // but the two chariots have swapped which physical piece occupies which square.
    expect(s.board[4][0]?.type).toBe("chariot");
    expect(s.board[4][0]?.id).toBe("rc2");
    expect(s.board[6][0]?.type).toBe("chariot");
    expect(s.board[6][0]?.id).toBe("rc1");
    expect(s.currentPlayer).toBe("red");

    const finalHash = hashSignature(boardSignature(s));
    expect(finalHash).toBe(initialHash);

    // The actual repetition-tracking machinery recorded this as a repeat of
    // the very first position, proving the hash carries no piece identity.
    const occurrences = (s.positionHistory ?? []).filter((h) => h === initialHash).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
