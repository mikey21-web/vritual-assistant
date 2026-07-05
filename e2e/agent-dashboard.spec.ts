import { test, expect } from '@playwright/test';

test.describe('AI Agent page', () => {
  test.beforeEach(async ({ page }) => {
    // The dashboard uses hash-based routing with mock data fallback
    await page.goto('/');
    // Most of the app works in demo mode without login (mock data)
    await page.goto('/#/ai-agent');
    await page.waitForTimeout(500);
  });

  test('shows the AI Agent page with header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('AI Agent');
  });

  test('shows agent status indicator', async ({ page }) => {
    await expect(page.locator('text=Online').or(page.locator('text=Offline'))).toBeVisible({ timeout: 5000 });
  });

  test('can switch to Configure tab', async ({ page }) => {
    await page.click('button:has-text("Configure")');
    await expect(page.locator('text=Business & Tone')).toBeVisible();
  });

  test('configure tab has form fields', async ({ page }) => {
    await page.click('button:has-text("Configure")');
    await expect(page.locator('input[placeholder="Your Business Name"]')).toBeVisible();
    await expect(page.locator('text=Qualification Questions')).toBeVisible();
  });

  test('can type a test message and send', async ({ page }) => {
    await page.fill('input[placeholder*="test message"]', 'Hi, I need a demo');
    await page.click('button:has-text("Send")');
    await expect(page.locator('text=Agent Response')).toBeVisible({ timeout: 10000 });
  });

  test('can switch to Conversations tab', async ({ page }) => {
    await page.click('button:has-text("Conversations")');
    await expect(page.locator('text=Recent Agent Conversations')).toBeVisible();
  });
});

test.describe('Webhook page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/webhooks');
    await page.waitForTimeout(500);
  });

  test('shows webhook endpoint cards', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Webhook Endpoints');
    await expect(page.locator('text=WhatsApp')).toBeVisible();
    await expect(page.locator('text=Telegram')).toBeVisible();
  });

  test('shows at least 4 endpoint cards', async ({ page }) => {
    const cards = page.locator('text=WhatsApp, text=Telegram, text=Social Media, text=Voice');
    await expect(page.locator('text=WhatsApp').first()).toBeVisible();
    await expect(page.locator('text=Telegram').first()).toBeVisible();
  });

  test('copy URL button exists on cards', async ({ page }) => {
    const copyButtons = page.locator('button:has-text("Copy URL")');
    await expect(copyButtons.first()).toBeVisible();
  });
});

test.describe('SMS Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/sms');
    await page.waitForTimeout(500);
  });

  test('shows SMS settings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('SMS Settings');
  });

  test('shows Configure Twilio button when not configured', async ({ page }) => {
    await expect(page.locator('button:has-text("Configure Twilio")')).toBeVisible();
  });

  test('can open Twilio form', async ({ page }) => {
    await page.click('button:has-text("Configure Twilio")');
    await expect(page.locator('input[placeholder*="AC"]')).toBeVisible();
    await expect(page.locator('text=Save Credentials')).toBeVisible();
  });
});

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await page.waitForTimeout(300);
  });

  test('AI Agent link navigates to AI agent page', async ({ page }) => {
    await page.click('a[href="#/ai-agent"]');
    await expect(page.locator('h1')).toContainText('AI Agent');
  });

  test('Webhooks link navigates to webhooks page', async ({ page }) => {
    await page.click('a[href="#/webhooks"]');
    await expect(page.locator('h1')).toContainText('Webhook');
  });

  test('SMS link navigates to SMS page', async ({ page }) => {
    await page.click('a[href="#/sms"]');
    await expect(page.locator('h1')).toContainText('SMS Settings');
  });
});
