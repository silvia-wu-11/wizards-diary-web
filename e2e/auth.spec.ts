import { expect, test } from '@playwright/test';

test.describe('Auth', () => {
  test('未登录访问首页重定向至登录页', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /魔法日记本/i })).toBeVisible();
  });

  test('登录页展示表单和切换到创建账号入口', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('邮箱')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    await expect(page.getByRole('link', { name: /切换到创建账号/i })).toBeVisible();
  });

  test('未填邮箱时点击登录展示错误', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText(/请输入邮箱/i)).toBeVisible();
  });

  test('未填密码时点击登录展示错误', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText(/请输入密码/i)).toBeVisible();
  });

  test('密码可见性切换', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByPlaceholder('••••••••');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: '显示密码' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: '隐藏密码' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('切换到创建账号跳转至注册页', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /切换到创建账号/i }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: /创建账号/i })).toBeVisible();
  });

  test('注册页去登录链接', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /去登录/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('两次密码不一致时展示错误', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('邮箱').fill('new@example.com');
    await page.getByPlaceholder('至少 8 位').fill('password123');
    await page.getByPlaceholder('再次输入密码').fill('different');
    await page.getByRole('button', { name: '创建账号' }).click();
    await expect(page.getByText(/两次密码不一致/i)).toBeVisible();
  });
});
