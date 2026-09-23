import { useEffect, useState } from "react";

/**
 * 觸控裝置的「兩段式落子」通用邏輯：與棋種無關，只認得一個「座標」型別 TCoord。
 *
 * 動機：手機上棋盤格常小於 WCAG 建議的 44×44 觸控目標（例如五子棋 15×15 格在
 * 390px 螢幕上只有 ~20px），放大格子在數學上無解（15×44 > 390）。改用「先點格
 * 子放預覽子（點錯零代價）→ 按一個 ≥44×44 的大按鈕才真的提交」，把「確認」的
 * 點擊目標從小格子換成大按鈕。
 *
 * `enabled=false`（滑鼠／鍵盤）時完全繞過兩段式，`selectCell` 等同直接提交，
 * 不讓非觸控使用者多按一次。
 */

export interface UseTapConfirmPlacementOptions<TCoord> {
  /** 是否啟用兩段式確認（通常傳入 useCoarsePointer() 的結果）。 */
  readonly enabled: boolean;
  /** 確認提交時要執行的動作（例如呼叫 useGameSession 的 move）。 */
  readonly onCommit: (coord: TCoord) => void;
  /**
   * 提交前的守門（遊戲已結束／AI 思考中／復盤模式等）。
   * 回傳 false 時，selectCell／confirmPending 都不會有任何效果。
   * 不傳則永遠允許。
   */
  readonly canAct?: () => boolean;
}

export interface TapConfirmPlacement<TCoord> {
  /** 目前的預覽座標；null 代表沒有待確認的落子。 */
  readonly pending: TCoord | null;
  readonly isPending: boolean;
  /** 使用者點了一格：非觸控 → 直接提交；觸控 → 設定／移動預覽（不提交）。 */
  readonly selectCell: (coord: TCoord) => void;
  /** 提交目前的預覽（觸控裝置的「落子」按鈕）。 */
  readonly confirmPending: () => void;
  /** 捨棄目前的預覽（觸控裝置的「取消」按鈕，或外部情境需要清除時呼叫）。 */
  readonly cancelPending: () => void;
}

export function useTapConfirmPlacement<TCoord>({
  enabled,
  onCommit,
  canAct,
}: UseTapConfirmPlacementOptions<TCoord>): TapConfirmPlacement<TCoord> {
  const [pending, setPending] = useState<TCoord | null>(null);

  // 觸控 ↔ 非觸控切換（轉屏、外接滑鼠）時清掉預覽，避免卡在半完成狀態。
  useEffect(() => {
    setPending(null);
  }, [enabled]);

  function selectCell(coord: TCoord): void {
    if (canAct && !canAct()) return;
    if (!enabled) {
      onCommit(coord);
      return;
    }
    setPending(coord);
  }

  function confirmPending(): void {
    if (pending === null) return;
    if (canAct && !canAct()) return;
    const coord = pending;
    setPending(null);
    onCommit(coord);
  }

  function cancelPending(): void {
    setPending(null);
  }

  return {
    pending,
    isPending: pending !== null,
    selectCell,
    confirmPending,
    cancelPending,
  };
}
