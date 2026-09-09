import type { GameId } from "../core/game/types";

const LAST_GAME_KEY = "mbg:last-game";

/**
 * 記住上次玩的棋種。
 * localStorage 在隱私模式 / 停用 site data 時可能直接 throw，
 * 因此讀寫皆吞例外並降級為「沒有上次紀錄」，不可讓首頁整頁壞掉。
 */
export function readLastGame(): GameId | null {
  try {
    const raw = window.localStorage.getItem(LAST_GAME_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastGame(id: GameId): void {
  try {
    window.localStorage.setItem(LAST_GAME_KEY, id);
  } catch {
    /* 無法持久化時靜默降級：只是下次沒有快捷入口 */
  }
}
