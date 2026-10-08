import { test, expect } from "@playwright/test";

/**
 * 棋格與棋盤要關掉雙擊縮放。iOS Safari 上連點相鄰的小格（五子棋手機上約 20px）
 * 會被當成雙擊而放大畫面。這支測試只能驗「樣式有套上」，驗不了「iOS 真的不再
 * 縮放」——那需要實機。但少了它，日後整理 CSS 時這行很容易被悄悄刪掉。
 *
 * manipulation 只取消雙擊縮放，保留雙指縮放與捲動：使用者仍然能放大畫面，
 * 這是無障礙的底線。
 */
test("棋盤與棋格關閉雙擊縮放，但保留其他觸控手勢", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("play-pvp-gomoku").click();
  await expect(page.getByTestId("gomoku-board")).toBeVisible();

  const board = await page.locator(".gomoku-board").evaluate((el) => getComputedStyle(el).touchAction);
  const cell = await page.locator(".gomoku-cell").first().evaluate((el) => getComputedStyle(el).touchAction);

  expect(board).toBe("manipulation");
  expect(cell).toBe("manipulation");
});
