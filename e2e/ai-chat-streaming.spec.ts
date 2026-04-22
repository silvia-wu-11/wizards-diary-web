import { expect, test } from "@playwright/test";

test.describe("AI Chat Streaming", () => {
  test("真实端到端流式对话", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    const openButton = page.getByRole("button", { name: "Speak with CHUM" });
    await expect(openButton).toBeVisible({ timeout: 30000 });
    await openButton.click();

    const chatArea = page.locator(
      "div.flex-1.overflow-y-auto.p-4.space-y-4.magic-scrollbar",
    );
    await expect(chatArea).toBeVisible();

    const input = page.getByPlaceholder("Speak what rests on your mind...");
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
