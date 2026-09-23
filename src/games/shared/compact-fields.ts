/**
 * 緊湊序列化格式共用的純量欄位編解碼。
 * 慣例："_" 代表欄位在原始物件上是 undefined（完全沒有這個 key）；
 * 其餘值（含空字串、"0"）代表欄位存在且有實際內容。
 */

export const ABSENT = "_";

export function encodeOptionalBool(value: boolean | undefined): string {
  if (value === undefined) return ABSENT;
  return value ? "1" : "0";
}

export function decodeOptionalBool(field: string, context: string): boolean | undefined {
  if (field === ABSENT) return undefined;
  if (field === "1") return true;
  if (field === "0") return false;
  throw new Error(`${context}: expected "_"/"0"/"1", got "${field}"`);
}

export function encodeOptionalInt(value: number | undefined): string {
  if (value === undefined) return ABSENT;
  if (!Number.isInteger(value)) {
    throw new Error(`Cannot compactly encode non-integer number: ${value}`);
  }
  return String(value);
}

export function decodeOptionalInt(field: string, context: string): number | undefined {
  if (field === ABSENT) return undefined;
  if (!/^-?\d+$/.test(field)) {
    throw new Error(`${context}: expected an integer, got "${field}"`);
  }
  return Number(field);
}

export function decodeRequiredInt(field: string, context: string): number {
  if (!/^-?\d+$/.test(field)) {
    throw new Error(`${context}: expected an integer, got "${field}"`);
  }
  return Number(field);
}

/** id 例外清單：位置不符合標準流水號格式時，老實存下完整 id。 */
export interface IdOverride {
  readonly row: number;
  readonly col: number;
  readonly id: string;
}

export function encodeIdOverrides(overrides: readonly IdOverride[]): string {
  if (overrides.length === 0) return ABSENT;
  return overrides
    .map((o) => `${o.row},${o.col}=${encodeURIComponent(o.id)}`)
    .join(";");
}

export function decodeIdOverrides(field: string, context: string): IdOverride[] {
  if (field === ABSENT) return [];
  if (field === "") return [];
  return field.split(";").map((entry) => {
    const m = /^(\d+),(\d+)=(.*)$/.exec(entry);
    if (!m) throw new Error(`${context}: malformed id override entry "${entry}"`);
    return { row: Number(m[1]), col: Number(m[2]), id: decodeURIComponent(m[3]) };
  });
}

export function assertPartCount(parts: string[], expected: number, context: string): void {
  if (parts.length !== expected) {
    throw new Error(`${context}: expected ${expected} fields, got ${parts.length}`);
  }
}
