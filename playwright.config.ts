import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // webkit 是 Safari 的引擎。在沒有 iOS 實機的情況下，這是最接近的自動化驗證：
  // 觸控兩段式落子、固定底部操作列、aspect-ratio 都靠它守。firefox 不加——
  // 實測三個引擎各 9/9 全過，而 firefox 在這個專案沒有 webkit 那種獨有風險。
  // 誠實的限制：Linux 上的 WebKit 不等於 iOS Safari，工具列伸縮、ITP、
  // 雙擊縮放、iOS 字型都測不到。
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  timeout: 30000,
  webServer: {
    // 測 production build 而非開發伺服器：dev server 走的是未經打包的原始碼，
    // 只在 build 輸出才會出現的問題（打包、base path、minify 後的行為）在那裡看不到。
    //
    // 指令連 build 一起跑是刻意的：preview 服務的是 dist/，若 dist 過期，
    // e2e 會測到舊程式碼而且照樣全綠——那是最糟的失敗模式（綠燈但測錯東西）。
    command: "npm run build && npm run preview",
    port: 4173,
    reuseExistingServer: !((globalThis as unknown as { process?: { env?: { CI?: string } } }).process?.env?.CI),
  },
});
