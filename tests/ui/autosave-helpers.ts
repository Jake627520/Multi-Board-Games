import { fireEvent, screen } from "@testing-library/react";
import type { GameEngine } from "../../src/core/game/types";
import { GameSession } from "../../src/core/game/session";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { writeAutosave } from "../../src/core/persistence/autosave";
import { clickCell } from "./board-persistence-helpers";

/** 固定種子的亂數（暗棋開局會洗牌；測試必須可重現，避免 flaky）。 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 目前畫面上所有棋盤格的 aria-label（盤面快照）。 */
export function boardSnapshot(): string[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label]"))
    .map((b) => b.getAttribute("aria-label") ?? "")
    .filter((label) => /^\d+-\d+( |$)/.test(label));
}

/** 目前步譜每一項的文字。 */
export function moveItemTexts(): string[] {
  return Array.from(document.querySelectorAll('[data-testid^="move-item-"]')).map(
    (el) => el.textContent ?? ""
  );
}

export function clickReset(): void {
  fireEvent.click(screen.getByRole("button", { name: "重新開始" }));
}

export function clickUndo(): void {
  fireEvent.click(screen.getByRole("button", { name: "悔棋" }));
}

/** 用 UI 點擊執行一個 move（象棋 / 暗棋 / 五子棋三種 move 形狀）。 */
export function playViaUi(move: unknown): void {
  const m = move as Record<string, { row: number; col: number } | string | number>;
  if (m.pos) {
    const p = m.pos as { row: number; col: number };
    clickCell(p.row, p.col);
  } else if (m.from && m.to) {
    const f = m.from as { row: number; col: number };
    const t = m.to as { row: number; col: number };
    clickCell(f.row, f.col);
    clickCell(t.row, t.col);
  } else {
    clickCell(m.row as number, m.col as number);
  }
}

/**
 * 從 initial 出發，用 DFS 找一串合法著法，使得「最後一手」讓對局結束、
 * 其前綴（至少一手）都沒結束。回傳該序列；找不到就丟錯（讓測試明確失敗而非靜默通過）。
 */
export function findFinishingSequence<S, M, V>(
  engine: GameEngine<S, M, V>,
  initial: S,
  maxPlies: number
): M[] {
  const dfs = (state: S, path: M[]): M[] | null => {
    if (path.length >= maxPlies) return null;
    for (const move of engine.getLegalMoves(state)) {
      const next = engine.applyMove(state, move);
      const seq = [...path, move];
      if (engine.isGameOver(next)) {
        if (seq.length >= 2) return seq;
        continue;
      }
      const found = dfs(next, seq);
      if (found) return found;
    }
    return null;
  };
  const result = dfs(initial, []);
  if (!result) throw new Error("No finishing sequence found for the given position");
  return result;
}

/**
 * 把「走完 moves 的前綴」存成自動存檔（走真正的 SaveManager，產出與 app 同格式的 v2 envelope）。
 * 自訂起始局面透過包一層 createInitialState 實現——envelope 的 initialState 會帶著它。
 */
export function seedAutosave<S, M, V>(
  engine: GameEngine<S, M, V>,
  initial: S,
  moves: readonly M[]
): void {
  // 用 Object.create 而非展開：有的引擎是 class 實例，展開會丟掉原型上的方法
  const customEngine: GameEngine<S, M, V> = Object.create(engine, {
    createInitialState: { value: () => initial },
  });
  const session = new GameSession(customEngine);
  for (const m of moves) session.move(m);
  writeAutosave(engine.id, new SaveManager().save(session, customEngine));
}
