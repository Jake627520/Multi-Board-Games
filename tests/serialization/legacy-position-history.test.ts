import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { applyMove, boardSignature, isGameOver } from "../../src/games/xiangqi/rules";
import { serializeXiangqiState } from "../../src/games/xiangqi/serialization";
import { isHashSignature } from "../../src/games/shared/hash";
import { buildState, createPiece } from "../xiangqi/test-helper";
import type { XiangqiMove, XiangqiState } from "../../src/games/xiangqi/types";

const saveManager = new SaveManager();

/**
 * 驗收條件 #3：舊存檔（positionHistory 是完整局面簽章字串，而非雜湊）實載測試。
 *
 * 手法：用目前的 applyMove 真的走一遍 round1 的 4 步，取得「這個局面真正該有的」
 * winner / isDraw / checkHistory / nonCaptureCount 等衍生欄位；但塞進存檔的
 * positionHistory 換成「這次改動之前」的舊格式——也就是每一步當下完整的
 * boardSignature() 字串本身，不雜湊。這樣產生的 XQK1 字串，跟使用者
 * localStorage 裡「這次改動上線前」存下的舊存檔，在 positionHistory 欄位的
 * 格式上完全一樣。
 */
function buildOldFormatSaveFixture(): {
  initialStateJson: string;
  round1Moves: XiangqiMove[];
  round2Moves: XiangqiMove[];
  oldFormatStateAfterRound1Json: string;
} {
  const initial = buildState([
    createPiece("rg", "red", "general", 9, 4),
    createPiece("bg", "black", "general", 0, 4),
    createPiece("shield", "red", "soldier", 5, 4),
    createPiece("rc", "red", "chariot", 6, 0),
    createPiece("bc", "black", "chariot", 3, 8),
  ]);

  const round1Moves: XiangqiMove[] = [
    { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } },
    { from: { row: 3, col: 8 }, to: { row: 4, col: 8 } },
    { from: { row: 5, col: 0 }, to: { row: 6, col: 0 } },
    { from: { row: 4, col: 8 }, to: { row: 3, col: 8 } },
  ];
  const round2Moves: XiangqiMove[] = round1Moves.map((m) => ({ from: { ...m.from }, to: { ...m.to } }));

  let state: XiangqiState = initial;
  const legacyPositionHistory = [boardSignature(initial)];
  for (const move of round1Moves) {
    state = applyMove(state, move);
    legacyPositionHistory.push(boardSignature(state));
  }

  const oldFormatState: XiangqiState = { ...state, positionHistory: legacyPositionHistory };

  return {
    initialStateJson: serializeXiangqiState(initial),
    round1Moves,
    round2Moves,
    oldFormatStateAfterRound1Json: serializeXiangqiState(oldFormatState),
  };
}

describe("Old-format positionHistory (full signature strings) save compatibility", () => {
  it("loads a hand-written old-format save without 'Corrupted history payload', and threefold repetition still works after continuing play", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);
    const fixture = buildOldFormatSaveFixture();

    const envelope = JSON.stringify({
      formatVersion: 2,
      gameId: "xiangqi",
      engineVersion: "0.11.0",
      initialState: fixture.initialStateJson,
      state: fixture.oldFormatStateAfterRound1Json,
      history: fixture.round1Moves.map((move, i) => ({
        move,
        player: i % 2 === 0 ? "red" : "black",
      })),
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    // 最重要的斷言：載入舊格式存檔不能拋出 "Corrupted history payload"。
    expect(() => saveManager.load(envelope, session, engine)).not.toThrow();

    expect(isGameOver(session.getState())).toBe(false);
    expect(session.getHistory()).toHaveLength(4);

    // 載入後 positionHistory 應該已經就地正規化成雜湊格式，不再是完整簽章字串。
    const loadedHistory = session.getState().positionHistory ?? [];
    expect(loadedHistory.length).toBeGreaterThan(0);
    for (const entry of loadedHistory) {
      expect(isHashSignature(entry)).toBe(true);
    }

    // 載入後繼續對局：第二輪重複的第 3 次出現，仍要能正確判定為三次重複。
    for (const move of fixture.round2Moves) {
      session.move(move);
    }

    const finalState = session.getState();
    expect(isGameOver(finalState)).toBe(true);
    expect(finalState.isDraw).toBe(true);
    expect(finalState.terminationReason).toBe("threefold_repetition");
  });

  it("a genuinely tampered old-format save is still rejected as corrupted", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);
    const fixture = buildOldFormatSaveFixture();
    const stateBefore = engine.serialize(session.getState());

    // history 只放一半的走法，但 state 卻是走完全部 4 步之後的局面：對不上。
    const envelope = JSON.stringify({
      formatVersion: 2,
      gameId: "xiangqi",
      engineVersion: "0.11.0",
      initialState: fixture.initialStateJson,
      state: fixture.oldFormatStateAfterRound1Json,
      history: fixture.round1Moves.slice(0, 2).map((move, i) => ({
        move,
        player: i % 2 === 0 ? "red" : "black",
      })),
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(() => saveManager.load(envelope, session, engine)).toThrow(/corrupted history payload/i);
    expect(engine.serialize(session.getState())).toBe(stateBefore);
  });
});
