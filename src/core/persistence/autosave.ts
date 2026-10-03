import type { GameId } from "../game/types";
import { getStorage } from "./local-storage";

/**
 * 自動存檔：每走一步把對局寫進一個保留 slot，供重新整理 / 關分頁 / 回首頁後續局。
 *
 * - 內容沿用 SaveManager 的 GameSaveEnvelope（v2：state + initialState + history），
 *   載入時同樣經過格式驗證與棋譜重放完整性檢查。
 * - key 前綴刻意與使用者存檔的 `mbg-save:` 不同：`listSaves` 只掃 `mbg-save:`，
 *   自動存檔因此天生不會混進使用者的存檔列表。
 * - 每個棋種只有一個 slot（`mbg-autosave:<gameId>`），不會累積。
 * - 部署在與其他 GitHub Pages 專案共用 origin 的 localStorage（5MB 共用）：
 *   所有讀寫都吞例外，失敗一律視為「沒有自動存檔」，絕不讓畫面壞掉。
 */
export const AUTOSAVE_PREFIX = "mbg-autosave:";

export function autosaveKey(gameId: GameId): string {
  return `${AUTOSAVE_PREFIX}${gameId}`;
}

export function readAutosave(gameId: GameId): string | null {
  try {
    return getStorage().getItem(autosaveKey(gameId));
  } catch {
    return null;
  }
}

/**
 * 寫入失敗（配額滿、storage 被停用）時，連同舊的自動存檔一併清掉：
 * 留著舊的會讓「繼續」無聲地把玩家倒退回幾步之前，比沒有自動存檔更誤導。
 */
export function writeAutosave(gameId: GameId, envelopeJson: string): boolean {
  try {
    getStorage().setItem(autosaveKey(gameId), envelopeJson);
    return true;
  } catch {
    clearAutosave(gameId);
    return false;
  }
}

export function clearAutosave(gameId: GameId): void {
  try {
    getStorage().removeItem(autosaveKey(gameId));
  } catch {
    /* 無法清除時靜默降級 */
  }
}

/**
 * 是否有「真的可續」的自動存檔：內容是可解析的 envelope 且至少走過一步。
 * 這裡只做廉價檢查；完整驗證（棋譜重放）在實際載入時進行，失敗會清掉該筆。
 */
export function hasAutosave(gameId: GameId): boolean {
  const raw = readAutosave(gameId);
  if (!raw) return false;
  try {
    const env: unknown = JSON.parse(raw);
    if (!env || typeof env !== "object") return false;
    const history = (env as { history?: unknown }).history;
    return Array.isArray(history) && history.length > 0;
  } catch {
    return false;
  }
}
