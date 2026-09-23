import type { ReactNode } from "react";

/**
 * 觸控裝置「兩段式落子」的確認列：預覽座標 + 一個 ≥44×44 的「落子」大按鈕 + 「取消」。
 * 與棋種無關（不認得棋盤座標的形狀），future 的其他棋盤（象棋／暗棋若日後也要類似體驗）
 * 可以直接複用，只要餵 label 與 callback。
 */
export interface TapConfirmBarProps {
  readonly label: ReactNode;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export function TapConfirmBar({
  label,
  onConfirm,
  onCancel,
  confirmLabel = "落子",
  cancelLabel = "取消",
}: TapConfirmBarProps) {
  return (
    <div className="tap-confirm-bar" data-testid="tap-confirm-bar" role="status" aria-live="polite">
      <span className="tap-confirm-label" data-testid="tap-confirm-label">
        {label}
      </span>
      <div className="tap-confirm-actions">
        <button
          type="button"
          className="tap-confirm-btn tap-confirm-cancel"
          onClick={onCancel}
          data-testid="tap-confirm-cancel-btn"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="tap-confirm-btn tap-confirm-commit"
          onClick={onConfirm}
          data-testid="tap-confirm-commit-btn"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
