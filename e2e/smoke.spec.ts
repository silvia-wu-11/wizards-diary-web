import { expect, test } from '@playwright/test';

test('未登录访问首页重定向至登录页', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveTitle(/Wizard's Diary/i);
});
