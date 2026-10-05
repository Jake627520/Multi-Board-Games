import { test, expect } from "@playwright/test";

const seenDialogs: string[] = [];

test.describe("E2E Platform User Flows A through E", () => {
  test.beforeEach(async ({ page }) => {
    // 首頁現在是三張遊戲卡；各 Flow 從首頁進入象棋後再照原本流程跑。
    // 對局中切換遊戲會跳確認，這裡一律同意（Flow E 會實際觸發）。
    // 一律同意會讓「不該出現的確認」變成測試盲區——先前對局結束後離開會跳
    // 不實警告，兩層測試都抓不到就是因為這一行。改成記錄下來，個別 flow
    // 可以斷言它在不該出現的路徑上是空的。
    seenDialogs.length = 0;
    page.on("dialog", (d) => {
      seenDialogs.push(d.message());
      void d.accept();
    });
    await page.goto("/");
    await page.getByTestId("game-card-xiangqi").click();
    await expect(page.getByTestId("xiangqi-board")).toBeVisible();
  });

  test("Flow 0: 首頁三張卡 -> 進入遊戲 -> 回首頁", async ({ page }) => {
    await page.getByTestId("back-to-home").click();
    await expect(page.getByTestId("game-home")).toBeVisible();
    await expect(page.locator(".game-card")).toHaveCount(3);
    await expect(page.getByTestId("game-card-banqi")).toBeVisible();

    // 進了棋盤但一步沒走，沒有可續的局 —— 不該出現「繼續」。
    // 這條原本斷言相反，而那正是自動存檔要修掉的空頭支票：
    // 按鈕當時只看 mbg:last-game 有沒有值，點下去是空棋盤。
    await expect(page.getByTestId("resume-last-game")).toHaveCount(0);

    await page.getByTestId("game-card-gomoku").click();
    await expect(page.getByTestId("gomoku-board")).toBeVisible();
  });

  test("Flow 0b: 走一步 -> 回首頁 -> 繼續 -> 棋譜還原", async ({ page }) => {
    await page.locator(".cell").nth(7 * 9 + 1).click();
    await page.locator(".cell").nth(7 * 9 + 4).click();
    await expect(page.locator(".move-history-container")).toContainText("炮八平五");

    await page.getByTestId("back-to-home").click();
    const resume = page.getByTestId("resume-last-game");
    await expect(resume).toContainText("中國象棋");

    await resume.click();
    await expect(page.getByTestId("xiangqi-board")).toBeVisible();
    // 真的續上，不是開新局
    await expect(page.locator(".move-history-container")).toContainText("炮八平五");

    // 棋局已自動保存，整段路徑不該有任何「會放棄棋局」的確認
    expect(seenDialogs).toEqual([]);
  });

  test("Flow A: Home -> Xiangqi -> PvP -> move -> save -> replay", async ({ page }) => {
    // Confirm home view
    await expect(page.locator("h1")).toContainText("多棋類遊戲平台");
    await expect(page.getByTestId("xiangqi-board")).toBeVisible();

    // Select Red Central Cannon cell (7, 1)
    const cannonCell = page.locator(".cell").nth(7 * 9 + 1);
    await cannonCell.click();
    await expect(cannonCell).toHaveClass(/selected/);

    // Target cell (7, 4)
    const targetCell = page.locator(".cell").nth(7 * 9 + 4);
    await targetCell.click();

    // Verify move registered in MoveHistory
    await expect(page.locator(".move-history-container")).toContainText("炮八平五");

    // Enter replay
    const replayBtn = page.getByTestId("enter-replay-btn");
    await expect(replayBtn).toBeEnabled();
    await replayBtn.click();
    await expect(page.locator(".replay-toolbar")).toBeVisible();
  });

  test("Flow B: Home -> Xiangqi -> PvE Level 2 -> human move -> AI move", async ({ page }) => {
    // Switch to PvE
    await page.getByTestId("mode-pve").click();
    await expect(page.getByTestId("ai-level-selector")).toBeVisible();

    // Choose Level 2
    await page.getByTestId("ai-level-2").click();

    // Human (Red) makes opening move: Cannon (7, 1) -> (7, 4)
    await page.locator(".cell").nth(7 * 9 + 1).click();
    await page.locator(".cell").nth(7 * 9 + 4).click();

    // Verify AI responds (history length increases to 2)
    await expect(page.locator(".move-item")).toHaveCount(2, { timeout: 5000 });
  });

  test("Flow C: Home -> Gomoku -> PvE Level 2 -> moves -> replay", async ({ page }) => {
    // Switch to Gomoku
    await page.getByTestId("game-switcher-select").selectOption("gomoku");
    await expect(page.getByTestId("gomoku-board")).toBeVisible();

    // Switch to PvE Level 2
    await page.getByTestId("mode-pve").click();
    await page.getByTestId("ai-level-2").click();

    // Human plays center (7, 7)
    await page.locator(".gomoku-cell").nth(7 * 15 + 7).click();

    // AI responds
    await expect(page.locator(".move-item")).toHaveCount(2, { timeout: 5000 });

    // Enter Replay
    await page.getByTestId("enter-replay-btn").click();
    await expect(page.locator(".replay-toolbar")).toBeVisible();
  });

  test("Flow D: Home -> Banqi -> PvE Level 2 -> reveal -> move -> replay", async ({ page }) => {
    // Switch to Banqi
    await page.getByTestId("game-switcher-select").selectOption("banqi");
    await expect(page.getByTestId("banqi-board")).toBeVisible();

    // Switch to PvE Level 2
    await page.getByTestId("mode-pve").click();
    await page.getByTestId("ai-level-2").click();

    // Click first face-down piece at (0, 0) to flip
    const firstCell = page.locator(".banqi-cell").first();
    await firstCell.click();

    // AI responds to flip
    await expect(page.locator(".move-item")).toHaveCount(2, { timeout: 5000 });

    // Enter Replay
    await page.getByTestId("enter-replay-btn").click();
    await expect(page.locator(".replay-toolbar")).toBeVisible();
  });

  test("Flow E: switch games -> Xiangqi -> Gomoku -> Banqi session isolation", async ({ page }) => {
    // Xiangqi: play 1 move
    await page.locator(".cell").nth(7 * 9 + 1).click();
    await page.locator(".cell").nth(7 * 9 + 4).click();
    await expect(page.locator(".move-item")).toHaveCount(1);

    // Switch to Gomoku: fresh board, 0 moves
    await page.getByTestId("game-switcher-select").selectOption("gomoku");
    await expect(page.getByTestId("gomoku-board")).toBeVisible();
    await expect(page.locator(".move-item")).toHaveCount(0);

    // Switch to Banqi: fresh board, 0 moves
    await page.getByTestId("game-switcher-select").selectOption("banqi");
    await expect(page.getByTestId("banqi-board")).toBeVisible();
    await expect(page.locator(".move-item")).toHaveCount(0);

    // Switch back to Xiangqi: verify independent session state
    await page.getByTestId("game-switcher-select").selectOption("xiangqi");
    await expect(page.getByTestId("xiangqi-board")).toBeVisible();
  });

  test("Flow F: A11y & Mobile UX (Round 19 Phase B.2) - StatusBar aria-live, touch targets >= 44px", async ({ page }) => {
    // 1. StatusBar aria-live & role
    const statusRow = page.locator(".status-row");
    await expect(statusRow).toHaveAttribute("role", "status");
    await expect(statusRow).toHaveAttribute("aria-live", "polite");

    // 2. Narrow screen touch targets >= 44px
    await page.setViewportSize({ width: 375, height: 667 });

    const undoBtn = page.getByRole("button", { name: "悔棋" });
    const resetBtn = page.getByRole("button", { name: "重新開始" });
    const undoBox = await undoBtn.boundingBox();
    const resetBox = await resetBtn.boundingBox();
    expect(undoBox?.height).toBeGreaterThanOrEqual(44);
    expect(undoBox?.width).toBeGreaterThanOrEqual(44);
    expect(resetBox?.height).toBeGreaterThanOrEqual(44);
    expect(resetBox?.width).toBeGreaterThanOrEqual(44);

    // Make 1 move and enter replay to check replay toolbar buttons
    await page.locator(".cell").nth(7 * 9 + 1).click();
    await page.locator(".cell").nth(7 * 9 + 4).click();
    await page.getByTestId("enter-replay-btn").click();

    const replayToolbarBtns = page.locator(".replay-toolbar button");
    const count = await replayToolbarBtns.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await replayToolbarBtns.nth(i).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
  });
});
