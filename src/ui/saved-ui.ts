import type { GameId, Player } from "../core/game/types";
import { readAutosaveUi } from "../core/persistence/autosave";
import type { AiLevel } from "./components/AiLevelSelector";
import type { GameMode } from "./components/GameModeSelector";

export interface SavedUi<R extends string = string> {
  readonly mode?: GameMode;
  readonly humanPlayer?: Player;
  readonly aiLevel?: AiLevel;
  readonly ruleMode?: R;
}

/**
 * 棋盤掛載時讀回自動存檔附帶的 UI 設定，當作各個 useState 的初始值。
 * 沒有存檔、存檔沒帶設定、或某個值不在該棋種允許的範圍內，一律回傳 undefined 讓呼叫端用預設。
 * 只在掛載時讀一次（呼叫端用 useState 惰性初始化）：之後 UI 設定以 state 為準，
 * 並由 useGameSession 隨每次局面變動寫回。
 */
export function loadSavedUi<R extends string = string>(
  gameId: GameId,
  players: readonly Player[],
  ruleModes?: readonly R[]
): SavedUi<R> {
  const ui = readAutosaveUi(gameId);
  if (!ui) return {};
  const humanPlayer = players.find((p) => p === ui.humanPlayer);
  const ruleMode = ruleModes?.find((r) => r === ui.ruleMode);
  return {
    mode: ui.mode,
    aiLevel: ui.aiLevel,
    ...(humanPlayer !== undefined ? { humanPlayer } : {}),
    ...(ruleMode !== undefined ? { ruleMode } : {}),
  };
}
