/**
 * 決定性、不依賴瀏覽器 API 的字串雜湊工具。
 *
 * 動機：象棋 `positionHistory` 過去存的是完整局面簽章字串（~500 字元／筆），
 * 長局存檔的體積幾乎全來自這個欄位。三次重複偵測只需要「字串是否相等」，
 * 不需要保留原文，所以改存雜湊即可大幅縮小存檔，且不改變比對語義。
 *
 * 實作：FNV-1a 64-bit（BigInt），用兩個不同的 offset basis 各跑一次、
 * 各輸出 16 個十六進位字元，串接成 32 個十六進位字元（等效 128-bit），
 * 對這個用途（幾百到幾千筆局面）碰撞機率可忽略不計。
 * 不使用 `crypto.subtle`：它是非同步 API，會污染目前完全同步的規則層。
 */

const FNV64_PRIME = 0x100000001b3n;
// 標準 FNV-1a 64-bit offset basis。
const FNV64_OFFSET_BASIS_1 = 0xcbf29ce484222325n;
// 第二輪用另一個 64-bit 常數（黃金分割比例常數）作 offset basis，
// 讓兩輪輸出彼此獨立，降低任何單一 basis 潛在弱點造成碰撞的機率。
const FNV64_OFFSET_BASIS_2 = 0x9e3779b97f4a7c15n;
const MASK_64 = 0xffffffffffffffffn;

function fnv1a64(input: string, offsetBasis: bigint): bigint {
  let hash = offsetBasis;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV64_PRIME) & MASK_64;
  }
  return hash;
}

function toHex16(value: bigint): string {
  return value.toString(16).padStart(16, "0");
}

/** 32 個十六進位字元組成的雜湊格式：`^[0-9a-f]{32}$`。 */
const HASH_PATTERN = /^[0-9a-f]{32}$/;

/**
 * 對任意字串產生 32 個十六進位字元的決定性雜湊。
 * 同一輸入在任何時候、任何平台都會得到同一輸出（純 BigInt 整數運算，無浮點誤差）。
 */
export function hashSignature(input: string): string {
  const h1 = fnv1a64(input, FNV64_OFFSET_BASIS_1);
  const h2 = fnv1a64(input, FNV64_OFFSET_BASIS_2);
  return toHex16(h1) + toHex16(h2);
}

/** 判斷一個字串是否已經是本模組輸出的雜湊格式（用來辨識舊格式資料）。 */
export function isHashSignature(value: string): boolean {
  return HASH_PATTERN.test(value);
}
