import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('未登录访问首页时仍停留在首页', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle(/Wizard's Diary/i);
});
