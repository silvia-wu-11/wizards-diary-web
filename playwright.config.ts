import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { E2E_AUTH_STORAGE_STATE_PATH } from "./e2e/auth.constants";

const ENV_PATH = path.resolve(process.cwd(), ".env");

if (existsSync(ENV_PATH)) {
  const envContent = readFileSync(ENV_PATH, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? "3900";
const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PLAYWRIGHT_PORT}`;
const AUTH_SETUP_PATTERN = /.*\.setup\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: AUTH_SETUP_PATTERN,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: AUTH_SETUP_PATTERN,
      use: {
        ...devices["Desktop Chrome"],
        storageState: E2E_AUTH_STORAGE_STATE_PATH,
      },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PLAYWRIGHT_PORT}`,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
