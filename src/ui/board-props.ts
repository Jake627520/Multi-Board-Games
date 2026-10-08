import type { GameMode } from "./components/GameModeSelector";

/**
 * 所有棋盤元件共用的 props。
 * - onProgressChange：讓棋盤把「本局是否已開始」往上回報給 App，
 *   好讓切換遊戲 / 回首頁時能先確認 —— 刻意不把整個 session 狀態提升到 App。
 * - initialMode：首頁選的對手（雙人 / 電腦）。只是「沒有存檔時的預設」，
 *   優先序固定為 saved.mode ?? initialMode ?? "pvp"：續局存檔的 mode 一定贏過首頁選擇。
 */
export interface BoardProps {
  readonly onProgressChange?: (inProgress: boolean) => void;
  readonly initialMode?: GameMode;
}
