/** 回傳 [0, 1) 的隨機源。預設是 Math.random；測試注入固定種子的版本。 */
export type Rng = () => number;

/** 建構 AI 時的共用選項：給 rng 或 seed 其中之一（都不給就用 Math.random）。 */
export interface AiOptions {
  readonly rng?: Rng;
  /** 給定 seed 則使用可重現的 mulberry32；rng 優先於 seed。 */
  readonly seed?: number;
}

/** mulberry32：小而快的可種子偽隨機數產生器，輸出 [0, 1)。 */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveRng(options?: AiOptions): Rng {
  if (options?.rng) return options.rng;
  if (options?.seed !== undefined) return createSeededRng(options.seed);
  return Math.random;
}

/** 以 rng 取 [0, n) 的整數，並防禦 rng 回傳 1 或越界值。 */
export function randomIndex(rng: Rng, n: number): number {
  const i = Math.floor(rng() * n);
  return i < 0 ? 0 : i >= n ? n - 1 : i;
}

export interface Scored<T> {
  readonly item: T;
  readonly score: number;
}

/**
 * 在「最佳分數的 epsilon 範圍內」均勻隨機挑一個。
 *
 * 候選 = 所有 score >= best - epsilon 的項目。為了讓行為可對照舊版，
 * 候選陣列的第一個一定是「原順序中第一個取得最高分」的項目（舊版
 * `score > best` 只保留它）；其餘依原順序排在後面。因此 rng 恆回 0 時
 * 結果與舊版逐手相同，這是「未改變行為」的可驗證性質。
 *
 * decisiveScore：最佳分數的絕對值達到它，代表搜尋已看到「必勝」或「必敗」
 * （葉節點的勝負分數）。此時落在 ε 內的走法只是「同樣贏／同樣輸」，
 * 不是「同樣好」——多種走法都贏就取排序最前（通常是最直接的殺著或吃子），
 * 全輸就取啟發式排序最前（例如對方有活四時仍先擋一頭，寄望對手失誤），
 * 都不應該用隨機決定，所以回到確定性的第一個最佳解。
 */
export function pickWithinEpsilon<T>(
  scored: readonly Scored<T>[],
  epsilon: number,
  rng: Rng,
  decisiveScore = Infinity
): T {
  if (scored.length === 0) throw new Error("No candidates to pick from");
  let bestIndex = 0;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i].score > scored[bestIndex].score) bestIndex = i;
  }
  if (Math.abs(scored[bestIndex].score) >= decisiveScore) return scored[bestIndex].item;
  const threshold = scored[bestIndex].score - epsilon;
  const candidates: T[] = [scored[bestIndex].item];
  for (let i = 0; i < scored.length; i++) {
    if (i !== bestIndex && scored[i].score >= threshold) candidates.push(scored[i].item);
  }
  return candidates[randomIndex(rng, candidates.length)];
}
