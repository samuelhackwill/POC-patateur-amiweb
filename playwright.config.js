import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4175",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: "npm run dev -- --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
  },
});
