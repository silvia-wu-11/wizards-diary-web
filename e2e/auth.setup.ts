/**
 * Playwright 登录 setup：
 * 使用 .env 中的测试账号预生成可复用的 storageState。
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test as setup } from "@playwright/test";

import { E2E_AUTH_STORAGE_STATE_PATH } from "./auth.constants";
import { loginWithE2EAccount } from "./auth.helper";

/**
 * 生成统一复用的已登录浏览器状态。
 */
setup("生成 E2E 登录态", async ({ page }) => {
  try {
    await mkdir(path.dirname(E2E_AUTH_STORAGE_STATE_PATH), { recursive: true });
    await loginWithE2EAccount(page);
    await page.context().storageState({
      path: E2E_AUTH_STORAGE_STATE_PATH,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知 setup 错误";
    throw new Error(`PlaywrightAuthSetupError: ${message}`);
  }
});
