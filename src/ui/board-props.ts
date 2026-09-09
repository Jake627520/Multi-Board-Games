/**
 * 所有棋盤元件共用的 props。
 * 目前只有一項：讓棋盤把「本局是否已開始」往上回報給 App，
 * 好讓切換遊戲 / 回首頁時能先確認 —— 刻意不把整個 session 狀態提升到 App。
 */
export interface BoardProps {
  readonly onProgressChange?: (inProgress: boolean) => void;
}
