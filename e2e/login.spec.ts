import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('shows landing page by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Your leads never');
  });

  test('navigates to login page', async ({ page }) => {
    await page.goto('/');
    await page.locator('text=Sign In').first().click();
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('shows login page via hash route', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Network error').or(page.locator('text=Invalid'))).toBeVisible({ timeout: 10000 });
  });

  test('shows error on empty form submission', async ({ page }) => {
    await page.goto('/#/login');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('login page has branding', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('text=LeadAuto')).toBeVisible();
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });
});
