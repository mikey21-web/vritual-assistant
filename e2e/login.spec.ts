import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('shows login page with split-screen layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=AI-powered lead conversion')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('Dashboard navigation', () => {
  test('sidebar navigation links work', async ({ page }) => {
    await page.goto('/');
    // Login first
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to leads
    await page.click('text=Leads');
    await expect(page.locator('h1')).toContainText('Leads');
  });
});
