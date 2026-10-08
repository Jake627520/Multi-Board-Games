import { test, expect, type Page } from "@playwright/test";

/**
 * 首頁每張卡的兩個對手入口。手機（390px）上要：
 * 1. 一眼看得到「對戰電腦」，且觸控目標 >= 44px；
 * 2. 首頁與三種棋盤都不出現橫向捲動。
 */
const GAMES = ["xiangqi", "gomoku", "banqi"] as const;

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
}

test.describe("首頁對手入口 @ 手機 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("首頁：三張卡的兩個入口都可見、>= 44px、無橫向捲動", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("game-home")).toBeVisible();
    for (const id of GAMES) {
      for (const kind of ["pvp", "pve"] as const) {
        const btn = page.getByTestId(`play-${kind}-${id}`);
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    }
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  for (const id of GAMES) {
    test(`${id}：首頁點「對戰電腦」→ PvE，棋盤無橫向捲動`, async ({ page }) => {
      await page.goto("/");
      await page.getByTestId(`play-pve-${id}`).scrollIntoViewIfNeeded();
      await page.getByTestId(`play-pve-${id}`).click();
      await expect(page.getByTestId(`${id}-board`)).toBeVisible();
      await expect(page.getByTestId("mode-pve")).toHaveClass(/active/);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }

  test("首頁點「雙人對戰」→ PvP", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("play-pvp-gomoku").click();
    await expect(page.getByTestId("mode-pvp")).toHaveClass(/active/);
  });
});
