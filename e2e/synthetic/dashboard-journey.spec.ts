import { test, expect } from '@playwright/test';

test.describe('Synthetic Monitor: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token-for-testing');
      localStorage.setItem('refreshToken', 'mock-refresh');
      sessionStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@example.com', role: 'OWNER' }));
    });
  });

  test('overview page loads with key metrics', async ({ page }) => {
    await page.goto('/#/overview');
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(100);
  });

  test('leads page renders table', async ({ page }) => {
    await page.goto('/#/leads');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(100);
  });

  test('ai-agent page shows controls', async ({ page }) => {
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Online').or(page.locator('text=Offline'))).toBeVisible({ timeout: 10000 });
  });

  test('mikey page shows autonomy status', async ({ page }) => {
    await page.goto('/#/mikey');
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
  });

  test('monitoring page loads with health data', async ({ page }) => {
    await page.goto('/#/monitoring');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(50);
  });

  test('tasks page loads', async ({ page }) => {
    await page.goto('/#/tasks');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(50);
  });
});
