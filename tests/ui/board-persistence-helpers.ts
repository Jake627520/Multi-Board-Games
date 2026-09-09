import { fireEvent, screen } from "@testing-library/react";

/**
 * 元件層測試的共用操作：只透過使用者看得到的 UI（按鈕、輸入框）驅動，
 * 不直接碰 GameSession / SaveManager，才攔得住「三個功能各自都對、湊在一起壞掉」的組合層 bug。
 */

/** 依 aria-label 前綴取得棋盤格按鈕（各棋盤的 aria-label 皆以 `${row}-${col}` 開頭）。 */
export function getCell(row: number, col: number): HTMLButtonElement {
  const cells = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[aria-label]")
  ).filter((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    return label === `${row}-${col}` || label.startsWith(`${row}-${col} `);
  });
  if (cells.length !== 1) {
    throw new Error(`Expected exactly one cell for ${row}-${col}, found ${cells.length}`);
  }
  return cells[0];
}

export function clickCell(row: number, col: number): void {
  fireEvent.click(getCell(row, col));
}

/** 目前步譜列表中的步數（直接數 MoveHistory 渲染出來的項目）。 */
export function renderedMoveCount(): number {
  return document.querySelectorAll('[data-testid^="move-item-"]').length;
}

/** MoveHistory 標題列顯示的文字，例如「對局步譜（1 步）」。 */
export function moveHistoryHeaderText(): string {
  return screen.getByTestId("move-history").textContent ?? "";
}

export function replayButton(): HTMLButtonElement {
  return screen.getByTestId("enter-replay-btn") as HTMLButtonElement;
}

/** 透過 SaveManagerPanel 存檔（等同使用者輸入名稱後按「儲存目前局」）。 */
export function saveCurrentGame(name: string): void {
  fireEvent.change(screen.getByTestId("save-name-input"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByTestId("save-submit-btn"));
}

/** 透過 SaveManagerPanel 載入列表中的第一筆存檔（等同使用者按「載入」）。 */
export function loadFirstSave(): void {
  const button = document.querySelector<HTMLButtonElement>(
    '[data-testid^="save-load-"]'
  );
  if (!button) {
    throw new Error("No save entry rendered in SaveManagerPanel");
  }
  fireEvent.click(button);
}

/** 直接把一筆存檔寫進 localStorage，用於構造舊格式（v1）存檔情境。 */
export function seedLocalSave(options: {
  readonly id: string;
  readonly name: string;
  readonly gameId: string;
  readonly envelopeJson: string;
  readonly moveCount: number;
}): void {
  const meta = {
    id: options.id,
    name: options.name,
    gameId: options.gameId,
    savedAt: new Date().toISOString(),
    moveCount: options.moveCount,
    data: options.envelopeJson,
  };
  window.localStorage.setItem(`mbg-save:${options.id}`, JSON.stringify(meta));
}
