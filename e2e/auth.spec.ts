import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Auth', () => {
  test('未登录访问首页时仍停留在首页并可见入口', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Wizard's Diary/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In Or Create Account/i })).toBeVisible();
  });

  test('登录页展示表单和切换到创建账号入口', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create one/i })).toBeVisible();
  });

  test('未填账号时点击登录展示错误', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/Enter your username/i)).toBeVisible();
  });

  test('未填密码时点击登录展示错误', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('testuser');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/Enter your password/i)).toBeVisible();
  });

  test('密码可见性切换', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByPlaceholder('••••••••');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Reveal password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('切换到创建账号跳转至注册页', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Create one/i }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();
  });

  test('注册页去登录链接', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /Sign in instead/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('两次密码不一致时展示错误', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Username').fill('newuser');
    await page.getByPlaceholder('At least 8 characters').fill('password123');
    await page.getByPlaceholder('Repeat your password').fill('different');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });
});
