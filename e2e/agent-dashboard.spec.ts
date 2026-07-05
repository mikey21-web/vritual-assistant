import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows landing page with headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Your leads');
  });

  test('shows sign in and get started buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign In').first()).toBeVisible();
    await expect(page.locator('text=Get Started').first()).toBeVisible();
  });

  test('landing page has feature sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Lead');
    expect(body).toContain('AI');
  });
});

test.describe('AI Agent page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token-for-testing');
      localStorage.setItem('refreshToken', 'mock-refresh');
      sessionStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@example.com', role: 'OWNER' }));
    });
  });

  test('shows the AI Agent page after mock login', async ({ page }) => {
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(1000);
    await expect(page.locator('h1')).toContainText('AI Agent', { timeout: 10000 });
  });

  test('shows agent status indicator', async ({ page }) => {
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=Online').or(page.locator('text=Offline'))).toBeVisible({ timeout: 10000 });
  });

  test('can switch to Configure tab', async ({ page }) => {
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Configure")').click();
    await expect(page.locator('text=Business & Tone')).toBeVisible();
  });

  test('configure tab has form fields', async ({ page }) => {
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Configure")').click();
    await expect(page.locator('input[placeholder="Your Business Name"]')).toBeVisible();
    await expect(page.locator('text=Qualification Questions')).toBeVisible();
  });
});
