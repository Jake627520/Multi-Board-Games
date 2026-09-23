import { describe, expect, it } from "vitest";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import type { GameViewContext } from "../../src/core/game/types";

/**
 * 紅線②專用測試：緊湊格式重構之後，明確證明 serializeView 的輸出
 * 「不含任何未翻開棋子的真實身分」——即使 engine.serialize()（權威完整狀態）
 * 現在改用緊湊格式、把每顆棋子的真實 type/player 編碼成單一字母，
 * serializeView 走的是完全不同的一條路（projectView 先把未翻開棋子換成
 * `hidden-${r}-${c}` 佔位物件，再交給沒有變動過的 JSON.stringify），
 * 兩條資料流不共用、不合併。
 *
 * 做法：對「開局後 100 手隨機對局」的每一步都做一次
 * engine.serialize()（含真實身分，允許） vs engine.serializeView()（不能洩漏）
 * 的交叉檢查——蒐集 serialize() 裡當時「尚未翻開」棋子的真實 id/type 字母，
 * 逐一確認這些字串完全不出現在同一時間點的 serializeView() 輸出裡。
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

describe("Banqi: serializeView never leaks unrevealed piece identity (post-refactor guard)", () => {
  const engine = createBanqiEngine();
  const context: GameViewContext = { role: "spectator", player: null };

  it("across 100 random moves, no hidden piece's real id/type ever appears in serializeView output", () => {
    const rng = mulberry32(777);
    const originalRandom = Math.random;
    Math.random = rng;
    let state;
    try {
      state = engine.createInitialState();
    } finally {
      Math.random = originalRandom;
    }

    for (let step = 0; step < 100; step++) {
      if (engine.isGameOver(state)) break;
      const moves = engine.getLegalMoves(state);
      if (moves.length === 0) break;

      // 蒐集這一刻「尚未翻開」棋子的真實識別資訊。
      // 只檢查 id（每顆棋子全域唯一），不檢查 type/player 字串本身——
      // 因為 "red"/"black"/"soldier" 這類值本來就會合法出現在 currentPlayer
      // 或「其他已翻開棋子」欄位裡，拿來比對會有偽陽性；id 才是精準指紋。
      const hiddenSecrets: string[] = [];
      for (const row of state.board) {
        for (const piece of row) {
          if (piece && !piece.isRevealed) {
            hiddenSecrets.push(piece.id);
          }
        }
      }

      const view = engine.projectView(state, context);
      const viewJson = engine.serializeView(view);

      // 用加引號的精確比對（"id" 的形式），避免 "black-soldier-3" 剛好是
      // "black-soldier-30" 的子字串造成偽陽性。
      for (const secret of hiddenSecrets) {
        expect(viewJson).not.toContain(`"${secret}"`);
      }

      // id 比對擋不住「只洩漏 type、不洩漏 id」的情形——而那正是最可能發生的
      // 洩漏形狀（有人為了方便把 type 加進視圖投影）。改用結構檢查補上：
      // 未翻開的格子除了座標佔位 id 與「尚未翻開」這個旗標之外，不得帶任何欄位。
      const parsed = JSON.parse(viewJson) as {
        board: (Record<string, unknown> | null)[][];
      };
      for (const row of parsed.board) {
        for (const cell of row) {
          if (cell && cell.isRevealed === false) {
            expect(Object.keys(cell).sort()).toEqual(["id", "isRevealed"]);
          }
        }
      }
      // 額外交叉檢查：serialize()（權威完整狀態）本來就「應該」保留這些真實身分
      // （這是它跟 serializeView 的本質差異，不是 bug）——只是現在編碼成緊湊格式，
      // 不會有字面上的英文字串，所以改成「解碼回來身分仍在」來驗證，而不是找子字串。
      const fullJson = engine.serialize(state);
      const roundTripped = engine.deserialize(fullJson);
      for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[r].length; c++) {
          const original = state.board[r][c];
          if (original && !original.isRevealed) {
            const restored = roundTripped.board[r][c];
            expect(restored?.id).toBe(original.id);
            expect(restored?.type).toBe(original.type);
            expect(restored?.player).toBe(original.player);
          }
        }
      }

      const idx = Math.floor(rng() * moves.length);
      state = engine.applyMove(state, moves[idx]);
    }
  });

  it("initial board: serializeView shows only `hidden-r-c` placeholders, zero real piece data", () => {
    const state = engine.createInitialState();
    const view = engine.projectView(state, context);
    const viewJson = engine.serializeView(view);

    const realTypeWords = ["general", "advisor", "elephant", "chariot", "horse", "cannon", "soldier"];
    for (const word of realTypeWords) {
      // 初始盤面全部未翻開，serializeView 不該包含任何一個真實棋子種類名稱
      expect(viewJson).not.toContain(word);
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        expect(viewJson).toContain(`"hidden-${r}-${c}"`);
      }
    }
  });
});
