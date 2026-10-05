/**
 * 破壞性操作（重新開始 / 切模式 / 換執方 / 換規則）的共用確認。
 *
 * 只在「對局進行中」才問：有棋譜且尚未結束。已結束的對局沒有東西可丟
 * （自動存檔在結束時就清掉了，與 App 離開確認用同一個判準），
 * 對一局下完的棋問「確定要放棄嗎」是不實的警告。
 */
export function confirmDiscardGame(inProgress: boolean, action: string): boolean {
  if (!inProgress) return true;
  return window.confirm(`${action}會放棄目前尚未結束的棋局，已走的棋步與自動存檔都會清除。確定要繼續嗎？`);
}
