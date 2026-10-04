import { test, expect } from "@playwright/test";

/**
 * 字型不得阻塞首屏。先前 index.html 用 rel="stylesheet" 載入 Google Fonts，
 * 瀏覽器會等那個第三方請求回應才開始渲染——量測顯示字型 CSS 延遲 15 秒時，
 * 首頁要 15.3 秒才出現，是 1:1 的拖累。對中國等連不到 Google 的網路，
 * 那等於整個站台打不開。
 */
test("字型請求掛住時，首頁仍然立刻渲染", async ({ page }) => {
  // 讓字型 CSS 永遠不回應
  await page.route("https://fonts.googleapis.com/**", () => {
    /* 故意不 fulfil 也不 abort：模擬請求掛住 */
  });

  const started = Date.now();
  await page.goto("/");
  await expect(page.getByTestId("game-home")).toBeVisible({ timeout: 5000 });
  const elapsed = Date.now() - started;

  // 不該因為字型掛住而等待；給足餘裕避免 CI 上 flaky
  expect(elapsed).toBeLessThan(5000);
  await expect(page.locator(".game-card")).toHaveCount(3);
});
