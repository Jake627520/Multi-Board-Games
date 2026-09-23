/**
 * 共用的緊湊棋盤字串編解碼工具。
 *
 * 每一列用逗號分隔的 token 序列表示：
 * - 純數字 token（例如 "9"）＝該數字所代表的連續空格數（run-length 壓縮）。
 * - 其餘 token（例如 "R12"、"b"）＝一顆棋子，佔 1 格；token 內容完全由呼叫端定義
 *   （棋子種類、陣營、流水號、翻開旗標……怎麼塞都可以），因為 token 之間用逗號
 *   明確分隔，不會有「棋子 id 的數字」跟「空格 run-length 的數字」混在一起的歧義
 *   （這是先前版本的臭蟲：不用逗號分隔時，字母後面接的數字究竟屬於棋子 id 還是
 *   下一段空格根本無法唯一判讀）。
 *
 * 列與列之間用 "/" 分隔（board-fen 頂層）。
 */

function isEmptyRunToken(token: string): boolean {
  return /^\d+$/.test(token);
}

/** 把每一格的 token（null=空格）編碼成單一列字串（run-length 壓縮空格，逗號分隔 token）。 */
export function encodeBoardRow(cells: ReadonlyArray<string | null>): string {
  const tokens: string[] = [];
  let emptyRun = 0;
  for (const cell of cells) {
    if (cell === null) {
      emptyRun++;
      continue;
    }
    if (emptyRun > 0) {
      tokens.push(String(emptyRun));
      emptyRun = 0;
    }
    tokens.push(cell);
  }
  if (emptyRun > 0) tokens.push(String(emptyRun));
  return tokens.join(",");
}

/** 解析一列：逗號切開的 token，純數字 token 展開成對應數量的空格。 */
export function decodeBoardRow(row: string, cols: number): (string | null)[] {
  const cells: (string | null)[] = [];
  if (row.length > 0) {
    for (const token of row.split(",")) {
      if (isEmptyRunToken(token)) {
        const count = Number(token);
        for (let i = 0; i < count; i++) cells.push(null);
      } else {
        cells.push(token);
      }
    }
  }
  if (cells.length !== cols) {
    throw new Error(`Row length mismatch: expected ${cols} cells, got ${cells.length} (row="${row}")`);
  }
  return cells;
}

export function encodeBoard(rows: ReadonlyArray<ReadonlyArray<string | null>>): string {
  return rows.map((row) => encodeBoardRow(row)).join("/");
}

export function splitBoardRows(fen: string, expectedRows: number): string[] {
  const rows = fen.split("/");
  if (rows.length !== expectedRows) {
    throw new Error(`Board row count mismatch: expected ${expectedRows}, got ${rows.length}`);
  }
  return rows;
}

/**
 * 通用棋盤解碼：把 FEN 字串拆成列、每列拆成 token，再由呼叫端把 token 轉成該遊戲的棋子物件。
 */
export function decodeBoard<T>(
  fen: string,
  rows: number,
  cols: number,
  cellMapper: (token: string, row: number, col: number) => T
): (T | null)[][] {
  const rowStrings = splitBoardRows(fen, rows);
  return rowStrings.map((rowStr, r) =>
    decodeBoardRow(rowStr, cols).map((token, c) => (token === null ? null : cellMapper(token, r, c)))
  );
}
