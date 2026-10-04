import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
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
