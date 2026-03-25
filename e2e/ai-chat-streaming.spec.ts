import { expect, test } from "@playwright/test";

test.describe("AI Chat Streaming", () => {
  test("真实端到端流式对话", async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!email || !password, "需要设置 E2E_EMAIL 与 E2E_PASSWORD");

    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email as string);
    await page.getByPlaceholder("••••••••").fill(password as string);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/(?!login)/, { timeout: 30000 });

    const openButton = page.getByRole("button", { name: "与老朋友对话" });
    await expect(openButton).toBeVisible({ timeout: 30000 });
    await openButton.click();

    const chatArea = page.locator(
      "div.flex-1.overflow-y-auto.p-4.space-y-4.magic-scrollbar",
    );
    await expect(chatArea).toBeVisible();

    const input = page.getByPlaceholder("输入你想说的...");
    await expect(input).toBeVisible();

    const initialText = (await chatArea.textContent()) ?? "";

    await input.fill("你好");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(input).toBeDisabled();
    await expect(input).toBeEnabled({ timeout: 60000 });

    await expect
      .poll(
        async () => ((await chatArea.textContent()) ?? "").includes("你好"),
        { timeout: 60000 },
      )
      .toBeTruthy();

    await expect
      .poll(async () => (await chatArea.textContent())?.length ?? 0, {
        timeout: 60000,
      })
      .toBeGreaterThan(initialText.length + 4);
  });
});
