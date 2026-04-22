/**
 * Playwright E2E 登录辅助：
 * 统一读取测试账号，并在 setup/业务用例中复用登录逻辑。
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

type E2ECredentials = {
  username: string;
  password: string;
};

/**
 * 读取 .env 中的 E2E 测试账号。
 */
export function getE2ECredentials(): E2ECredentials {
  const username = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "E2EAuthConfigError: 缺少 E2E_EMAIL 或 E2E_PASSWORD，无法生成 Playwright 登录态。",
    );
  }

  return { username, password };
}

/**
 * 使用测试账号完成一次真实登录。
 */
export async function loginWithE2EAccount(page: Page): Promise<void> {
  try {
    const { username, password } = getE2ECredentials();

    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/$/, {
      timeout: 15000,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知登录错误";
    throw new Error(
      `E2ELoginSetupError: 生成 Playwright 登录态失败。${message}`,
    );
  }
}
