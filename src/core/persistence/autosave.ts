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

/**
 * 隨自動存檔一起保存的 UI 設定（對戰模式 / 執方 / AI 風格 / 五子棋規則模式）。
 *
 * 放在同一份 envelope 的 `ui` 欄位，而不是另開一個 key：
 * - 一次 setItem 寫完，不會出現「棋局寫成功、設定沒寫到」的半套狀態，
 *   配額滿時的「失敗就整份清掉」語意也維持不變；
 * - SaveManager.load 只讀它認得的欄位，多出來的 `ui` 會被忽略，
 *   formatVersion 維持 2，既有存檔（含手動存檔）的格式完全不受影響——
 *   手動存檔根本不經過這裡，不會帶 `ui`。
 */
export interface AutosaveUi {
  readonly mode: "pvp" | "pve";
  readonly humanPlayer: string;
  readonly aiLevel: "l1" | "l2";
  /** 只有有規則模式的棋種（五子棋）才有 */
  readonly ruleMode?: string;
}

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
export function writeAutosave(
  gameId: GameId,
  envelopeJson: string,
  ui?: AutosaveUi
): boolean {
  try {
    let payload = envelopeJson;
    if (ui) {
      const env = JSON.parse(envelopeJson) as Record<string, unknown>;
      payload = JSON.stringify({ ...env, ui });
    }
    getStorage().setItem(autosaveKey(gameId), payload);
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

/**
 * 讀出自動存檔裡的 UI 設定。只在「確實有可續的局」時才回傳（與 hasAutosave 同標準），
 * 欄位逐一驗證型別；不合格就當沒有（呼叫端退回預設值），不丟例外。
 * 完整驗證仍以棋局重放為準——這裡只是設定值，寫壞了最壞就是退回預設。
 */
export function readAutosaveUi(gameId: GameId): AutosaveUi | null {
  if (!hasAutosave(gameId)) return null;
  const raw = readAutosave(gameId);
  if (!raw) return null;
  try {
    const ui = (JSON.parse(raw) as { ui?: unknown }).ui;
    if (!ui || typeof ui !== "object") return null;
    const u = ui as Record<string, unknown>;
    if (u.mode !== "pvp" && u.mode !== "pve") return null;
    if (u.aiLevel !== "l1" && u.aiLevel !== "l2") return null;
    if (typeof u.humanPlayer !== "string") return null;
    if (u.ruleMode !== undefined && typeof u.ruleMode !== "string") return null;
    return {
      mode: u.mode,
      humanPlayer: u.humanPlayer,
      aiLevel: u.aiLevel,
      ...(u.ruleMode !== undefined ? { ruleMode: u.ruleMode } : {}),
    };
  } catch {
    return null;
  }
}
