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
    // localStorage 是外部持久化狀態（可能來自舊版棋種、被手動竄改），
    // 執行期本來就不驗證內容是否仍是合法 GameId，此處純粹是型別斷言。
    return raw && raw.length > 0 ? (raw as GameId) : null;
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
