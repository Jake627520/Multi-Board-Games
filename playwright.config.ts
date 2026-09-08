import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30000,
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !((globalThis as unknown as { process?: { env?: { CI?: string } } }).process?.env?.CI),
  },
});
