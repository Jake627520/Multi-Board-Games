import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/core/game/session";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { applyMove as applyXiangqiMove } from "../../src/games/xiangqi/rules";

/**
 * 驗收條件 #3：舊存檔相容測試。
 * 手寫（不透過新的 engine.serialize）v1／v2 格式的存檔字串，
 * 證明新版 deserialize 仍吃得下部署在使用者 localStorage 裡的舊格式。
 *
 * v1、v2 envelope 之間唯一差異在存檔外層（有沒有 history / initialState），
 * 每個遊戲的 `state` 字串本身在 v1、v2 都是同一套舊版 `JSON.stringify(state)` 格式，
 * 所以這裡針對每個遊戲各寫一份「舊格式 state JSON」，分別包進 v1 與 v2 envelope 測試。
 */

const saveManager = new SaveManager();

// ---- 手寫的舊格式（plain JSON.stringify）狀態字串，完全不透過新版 engine.serialize ----

function legacyXiangqiBoard(): (unknown | null)[][] {
  const board: (unknown | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
  const back = ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"];
  let id = 1;
  for (let col = 0; col < 9; col++) {
    board[0][col] = { id: `black-${back[col]}-${id++}`, player: "black", type: back[col], position: { row: 0, col } };
    board[9][col] = { id: `red-${back[col]}-${id++}`, player: "red", type: back[col], position: { row: 9, col } };
  }
  for (const col of [1, 7]) {
    board[2][col] = { id: `black-cannon-${id++}`, player: "black", type: "cannon", position: { row: 2, col } };
    board[7][col] = { id: `red-cannon-${id++}`, player: "red", type: "cannon", position: { row: 7, col } };
  }
  for (const col of [0, 2, 4, 6, 8]) {
    board[3][col] = { id: `black-soldier-${id++}`, player: "black", type: "soldier", position: { row: 3, col } };
    board[6][col] = { id: `red-soldier-${id++}`, player: "red", type: "soldier", position: { row: 6, col } };
  }
  return board;
}

function legacyXiangqiInitialStateJson(): string {
  return JSON.stringify({
    board: legacyXiangqiBoard(),
    currentPlayer: "red",
    winner: null,
    moveNumber: 1,
  });
}

/**
 * 手寫的紅方兵五進一之後的舊格式局面（模擬走一步後被舊版存下來）。
 * 用真正的 applyMove 算出「走這步之後」的完整狀態（含 checkHistory /
 * positionHistory / nonCaptureCount 這些衍生欄位的真實值），再用舊版
 * `JSON.stringify` 序列化——這樣才能跟「重放 history 得到的狀態」完全一致，
 * 不會因為手動亂猜衍生欄位值而被 SaveManager 的一致性檢查誤判成損毀存檔。
 */
function legacyXiangqiAfterOneMoveJson(): string {
  const initial = JSON.parse(legacyXiangqiInitialStateJson());
  const after = applyXiangqiMove(initial, { from: { row: 6, col: 4 }, to: { row: 5, col: 4 } });
  return JSON.stringify(after);
}

function legacyGomokuStateJson(): string {
  const board: (string | null)[][] = Array.from({ length: 15 }, () => Array<string | null>(15).fill(null));
  board[7][7] = "black";
  board[7][8] = "white";
  board[6][6] = "black";
  return JSON.stringify({
    board,
    currentPlayer: "white",
    winner: null,
    isDraw: false,
    moveNumber: 3,
    ruleMode: "freestyle",
    winningLine: undefined,
  });
}

function legacyBanqiStateJson(): string {
  const board: (unknown | null)[][] = Array.from({ length: 4 }, () => Array(8).fill(null));
  board[0][0] = { id: "red-general-1", player: "red", type: "general", rank: 7, isRevealed: false };
  board[0][1] = { id: "black-soldier-9", player: "black", type: "soldier", rank: 1, isRevealed: true };
  board[1][3] = { id: "black-cannon-2", player: "black", type: "cannon", rank: 2, isRevealed: false };
  return JSON.stringify({
    board,
    currentPlayer: "red",
    player1Color: "black",
    winner: null,
    moveNumber: 4,
  });
}

describe("Legacy save format compatibility (hand-written v1 / v2 JSON, no new serializer involved)", () => {
  it("Xiangqi: legacy v1 envelope (no history) loads and establishes a clean baseline", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);

    const envelope = JSON.stringify({
      formatVersion: 1,
      gameId: "xiangqi",
      engineVersion: "0.9.0",
      state: legacyXiangqiAfterOneMoveJson(),
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    saveManager.load(envelope, session, engine);
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getState().board[5][4]).toMatchObject({ type: "soldier", player: "red" });
    expect(session.getState().board[6][4]).toBeNull();
    expect(session.getHistory()).toHaveLength(0);
  });

  it("Gomoku: legacy v1 envelope loads placed stones correctly", () => {
    const engine = createGomokuEngine();
    const session = new GameSession(engine);

    const envelope = JSON.stringify({
      formatVersion: 1,
      gameId: "gomoku",
      engineVersion: "0.9.0",
      state: legacyGomokuStateJson(),
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    saveManager.load(envelope, session, engine);
    expect(session.getState().board[7][7]).toBe("black");
    expect(session.getState().board[7][8]).toBe("white");
    expect(session.getCurrentPlayer()).toBe("white");
  });

  it("Banqi: legacy v1 envelope preserves hidden piece authoritative identity", () => {
    const engine = createBanqiEngine();
    const session = new GameSession(engine);

    const envelope = JSON.stringify({
      formatVersion: 1,
      gameId: "banqi",
      engineVersion: "0.9.0",
      state: legacyBanqiStateJson(),
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    saveManager.load(envelope, session, engine);
    const hiddenGeneral = session.getState().board[0][0];
    expect(hiddenGeneral?.isRevealed).toBe(false);
    expect(hiddenGeneral?.type).toBe("general");
    expect(hiddenGeneral?.player).toBe("red");
    expect(session.getState().player1Color).toBe("black");
  });

  it("Xiangqi: legacy v2 envelope (old-format state+initialState+history) restores history and undo", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);

    // v2 envelope 完全用舊格式字串構造，initialState 是開局，history 一步，
    // state 是走完那一步之後的舊格式局面——完全不經過新版 engine.serialize。
    const envelope = JSON.stringify({
      formatVersion: 2,
      gameId: "xiangqi",
      engineVersion: "0.11.0",
      initialState: legacyXiangqiInitialStateJson(),
      state: legacyXiangqiAfterOneMoveJson(),
      history: [{ move: { from: { row: 6, col: 4 }, to: { row: 5, col: 4 } }, player: "red", notation: "兵五進一" }],
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    saveManager.load(envelope, session, engine);
    expect(session.getCurrentPlayer()).toBe("black");
    expect(session.getHistory()).toHaveLength(1);

    // 悔棋快照必須是由 initialState + history 重放重建出來的
    const afterUndo = session.undo();
    expect(afterUndo.board[6][4]).toMatchObject({ type: "soldier", player: "red" });
    expect(afterUndo.board[5][4]).toBeNull();
    expect(session.getCurrentPlayer()).toBe("red");
  });

  it("Xiangqi: legacy v2 with a genuinely tampered state is still rejected as corrupted", () => {
    const engine = createXiangqiEngine();
    const session = new GameSession(engine);
    const stateBefore = engine.serialize(session.getState());

    const tamperedState = legacyXiangqiInitialStateJson(); // 跟 history 重放結果對不上（沒真的走那一步）
    const envelope = JSON.stringify({
      formatVersion: 2,
      gameId: "xiangqi",
      engineVersion: "0.11.0",
      initialState: legacyXiangqiInitialStateJson(),
      state: tamperedState,
      history: [{ move: { from: { row: 6, col: 4 }, to: { row: 5, col: 4 } }, player: "red" }],
      savedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(() => saveManager.load(envelope, session, engine)).toThrow(/corrupted history payload/i);
    // 驗證失敗不能動到現有 session
    expect(engine.serialize(session.getState())).toBe(stateBefore);
  });
});
