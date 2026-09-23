/**
 * 象棋/暗棋共用的棋子代碼表：國際通行 Xiangqi FEN 字母。
 * 紅方大寫、黑方小寫：將帥 K/k、士仕 A/a、象相 B/b、馬 N/n、車 R/r、炮 C/c、兵卒 P/p。
 */
import type { PieceType } from "../xiangqi/types";

const TYPE_TO_LETTER: Record<PieceType, string> = {
  general: "k",
  advisor: "a",
  elephant: "b",
  horse: "n",
  chariot: "r",
  cannon: "c",
  soldier: "p",
};

const LETTER_TO_TYPE: Record<string, PieceType> = Object.fromEntries(
  Object.entries(TYPE_TO_LETTER).map(([type, letter]) => [letter, type])
) as Record<string, PieceType>;

export function encodePieceLetter(type: PieceType, player: "red" | "black"): string {
  const letter = TYPE_TO_LETTER[type];
  if (!letter) throw new Error(`Unknown piece type: ${String(type)}`);
  return player === "red" ? letter.toUpperCase() : letter;
}

export function decodePieceLetter(letter: string): { type: PieceType; player: "red" | "black" } {
  if (letter.length !== 1 || !/[a-zA-Z]/.test(letter)) {
    throw new Error(`Invalid piece letter: "${letter}"`);
  }
  const lower = letter.toLowerCase();
  const type = LETTER_TO_TYPE[lower];
  if (!type) throw new Error(`Unknown piece letter: "${letter}"`);
  const player: "red" | "black" = letter === lower ? "black" : "red";
  return { type, player };
}

/**
 * 從棋子 id 嘗試抽出「流水號」，前提是 id 完全符合
 * `${player}-${type}-${number}` 這個引擎既定生成格式。
 * 符合就回傳緊湊用的號碼字串；不符合（例如手造的自訂 id）就回傳 null，
 * 呼叫端應該改用 idOverrides 老實存下完整 id（紅線③：id 必須逐字元往返）。
 */
export function extractStandardIdSuffix(
  id: string,
  player: string,
  type: string
): string | null {
  const expectedPrefix = `${player}-${type}-`;
  if (!id.startsWith(expectedPrefix)) return null;
  const suffix = id.slice(expectedPrefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  // 往返檢查：數字重組後必須逐字元等於原始 id（防止例如前導零造成的落差）。
  if (`${expectedPrefix}${suffix}` !== id) return null;
  return suffix;
}

export function buildStandardId(player: string, type: string, suffix: string): string {
  return `${player}-${type}-${suffix}`;
}
