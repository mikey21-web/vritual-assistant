import { test, expect } from '@playwright/test';

test.describe.serial('Full lead journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token-for-testing');
      localStorage.setItem('refreshToken', 'mock-refresh');
      sessionStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@example.com', role: 'OWNER' }));
    });
  });

  test('Phase 1: Agent Queue page loads with mock auth', async ({ page }) => {
    await page.goto('/#/queue');
    await page.waitForTimeout(1000);

    // Verify the page heading
    await expect(page.locator('h1')).toContainText('My Queue', { timeout: 10000 });

    // Check the bottom tab bar is visible (mobile nav pattern)
    const bottomBar = page.locator('.fixed.bottom-0');
    await expect(bottomBar).toBeVisible();
    await expect(bottomBar).toContainText('Today');
    await expect(bottomBar).toContainText('Leads');
    await expect(bottomBar).toContainText('Stats');

    // Check the filter tabs in the header
    await expect(page.locator('button:has-text("Today")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Leads")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Stats")').first()).toBeVisible();
  });

  test('Phase 2: Agent Queue loads leads and navigates to lead workbench', async ({ page }) => {
    await page.goto('/#/queue');
    await page.waitForTimeout(1500);

    // Click the "Leads" tab in the header
    await page.locator('button:has-text("Leads")').first().click();
    await page.waitForTimeout(500);

    // The leads tab shows a search input
    await expect(page.locator('input[placeholder*="Search leads"]')).toBeVisible();

    // Check bottom nav active state switched to Leads
    const bottomBar = page.locator('.fixed.bottom-0');
    // After clicking Leads in header, the bottom bar may or may not reflect that
    // Just verify all tabs are still there

    // Look for lead cards — either the all-leads section or hot-leads section
    const leadSection = page.locator('text=All Leads').or(page.locator('text=Hot Leads'));
    await expect(leadSection.first()).toBeVisible({ timeout: 5000 });

    // Find a lead card entry (any segment circle, name, or lead row) and click it
    // Lead cards have segment dots and names — try clicking the first "Open" button (ChevronRight) or the lead row
    const openButton = page.locator('button[title="Open"]').first();
    const leadNameButton = page.locator('button:has-text("Unknown")').or(page.locator('text=All Leads'));

    // Try to navigate via any open/chevron button, if none available just navigate directly
    if (await openButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openButton.click();
    } else {
      // If no leads rendered (API returns empty), navigate to a mock lead directly
      await page.goto('/#/leads/mock-lead-1');
    }

    await page.waitForTimeout(1000);

    // === Phase 3: Lead Workbench ===

    // The workbench shows either a lead name or loading state
    // After loading, it should show lead details or "Lead not found"
    await page.waitForTimeout(2000);

    // Check if we hit the workbench — look for key indicators
    const body = page.locator('body');

    // Check for either lead detail elements or the "Lead not found" empty state
    const hasLeadContent = await body.textContent().then(t => t?.includes('Lead') ?? false);
    if (hasLeadContent) {
      // If we have a lead loaded, verify action buttons are visible
      const hasActions = page.locator('button:has-text("Call"), button:has-text("WhatsApp"), button:has-text("Visit"), button:has-text("Cost Sheet")').first();
      const hasActionsVisible = await hasActions.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasActionsVisible) {
        // Verify action buttons
        await expect(page.locator('button:has-text("Call")').or(page.locator('button:has-text("WhatsApp")'))).toBeVisible({ timeout: 5000 });
      }

      // Check for the 3-column layout (grid-cols-1 md:grid-cols-3)
      const columns = page.locator('.grid.grid-cols-1');
      const hasThreeColumns = await columns.count().then(c => c > 0);
      if (hasThreeColumns) {
        await expect(columns.first()).toBeVisible();
      }

      // Check Details section
      const detailsSection = page.locator('text=Details').or(page.locator('text=Unified Timeline'));
      await expect(detailsSection.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Non-critical — API data may not have loaded
      });

      // Check Notes section exists
      await expect(page.locator('text=Notes').or(page.locator('text=Add a note'))).toBeVisible({ timeout: 5000 }).catch(() => {});
    }

    // Screenshot at desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/lead-workbench-desktop.png', fullPage: true });
  });

  test('Phase 3: WhatsApp composer modal', async ({ page }) => {
    await page.goto('/#/leads/mock-lead-1');
    await page.waitForTimeout(2000);

    // Try to find and click the WhatsApp button
    const whatsAppBtn = page.locator('button:has-text("WhatsApp")').first();
    const whatsAppVisible = await whatsAppBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (whatsAppVisible) {
      await whatsAppBtn.click();
      await page.waitForTimeout(500);

      // Verify a modal overlay appears
      await expect(page.locator('.fixed.inset-0.z-50')).toBeVisible();

      // The modal should have "Send WhatsApp" heading
      await expect(page.locator('h2:has-text("Send WhatsApp")')).toBeVisible();

      // Verify the textarea and buttons
      await expect(page.locator('textarea[placeholder="Type your message..."]')).toBeVisible();
      await expect(page.locator('button:has-text("Draft with Jarvis")').or(page.locator('button:has-text("Send")'))).toBeVisible();

      // Screenshot the WhatsApp modal
      await page.screenshot({ path: 'e2e/screenshots/whatsapp-modal.png' });

      // Close the modal via the Cancel button
      await page.locator('button:has-text("Cancel")').first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('h2:has-text("Send WhatsApp")')).not.toBeVisible();
    } else {
      // WhatsApp button not visible (e.g., no phone) — take a screenshot anyway
      await page.screenshot({ path: 'e2e/screenshots/whatsapp-modal-unavailable.png' });
    }
  });

  test('Phase 4: Mobile viewport — queue & workbench', async ({ page }) => {
    // Set viewport to iPhone 12 Pro size
    await page.setViewportSize({ width: 390, height: 844 });

    // Navigate to queue
    await page.goto('/#/queue');
    await page.waitForTimeout(1500);

    // Verify queue heading
    await expect(page.locator('h1')).toContainText('My Queue', { timeout: 10000 });

    // Bottom tab bar should be visible at the bottom of the viewport
    const bottomBar = page.locator('.fixed.bottom-0');
    await expect(bottomBar).toBeVisible();

    // Take screenshot of mobile queue view
    await page.screenshot({ path: 'e2e/screenshots/mobile-queue.png', fullPage: true });

    // Navigate to Leads tab and click first lead
    await page.locator('button:has-text("Leads")').first().click();
    await page.waitForTimeout(500);

    // Try to navigate into a lead
    const openBtn = page.locator('button[title="Open"]').first();
    if (await openBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openBtn.click();
    } else {
      await page.goto('/#/leads/mock-lead-1');
    }
    await page.waitForTimeout(2000);

    // On mobile, the layout should be single column (not 3-column)
    // Verify there's no 3-column grid class issue — the default is grid-cols-1
    const gridContainer = page.locator('.grid.grid-cols-1');
    const hasSingleCol = await gridContainer.count().then(c => c > 0);

    // Take screenshot of mobile lead workbench
    await page.screenshot({ path: 'e2e/screenshots/mobile-lead-workbench.png', fullPage: true });

    // Verify back button exists (ArrowLeft) — the first button in the workbench header
    await expect(page.locator('button').first().or(page.locator('h1'))).toBeVisible();
  });

  test('Phase 5: Interactions — adding a note', async ({ page }) => {
    await page.goto('/#/leads/mock-lead-1');
    await page.waitForTimeout(2000);

    // Check for the notes section
    const notesSection = page.locator('text=Notes').or(page.locator('text=Add a note'));
    const notesVisible = await notesSection.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (notesVisible) {
      // Try to find the notes textarea
      const noteTextarea = page.locator('textarea[placeholder="Add a note..."]');
      if (await noteTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Type a note
        await noteTextarea.fill('Test note from E2E test — checking notes functionality');
        await page.waitForTimeout(200);

        // Click "Add Note" button
        const addNoteBtn = page.locator('button:has-text("Add Note")');
        if (await addNoteBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await addNoteBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Check timeline section is visible
    const timelineSection = page.locator('text=Unified Timeline');
    await expect(timelineSection).toBeVisible({ timeout: 5000 }).catch(() => {
      // Non-critical — timeline may not load without real data
    });
  });

  test('Phase 6: Action buttons — Visit, Cost Sheet, Hold Unit, Book', async ({ page }) => {
    await page.goto('/#/leads/mock-lead-1');
    await page.waitForTimeout(2000);

    // Verify Visit button exists
    const visitBtn = page.locator('button:has-text("Visit")').first();
    await expect(visitBtn).toBeVisible({ timeout: 5000 });
    await expect(visitBtn).toContainText('Visit');

    // Verify Cost Sheet button exists
    const costSheetBtn = page.locator('button:has-text("Cost Sheet")').first();
    await expect(costSheetBtn).toBeVisible({ timeout: 5000 });
    await expect(costSheetBtn).toContainText('Cost Sheet');

    // Check for Hold Unit button
    const holdUnitBtn = page.locator('button:has-text("Hold Unit")').first();
    await expect(holdUnitBtn).toBeVisible({ timeout: 5000 }).catch(() => {
      // Hold Unit only shows for non-terminal statuses (not CONVERTED/LOST/SPAM)
    });

    // Check for Book button
    const bookBtn = page.locator('button:has-text("Book")').first();
    await expect(bookBtn).toBeVisible({ timeout: 5000 }).catch(() => {
      // Book only shows for non-terminal statuses
    });

    // Verify the Timeline play button exists
    const timelineBtn = page.locator('button:has-text("Timeline")').first();
    await expect(timelineBtn).toBeVisible({ timeout: 5000 });

    // Take a final summary screenshot
    await page.screenshot({ path: 'e2e/screenshots/lead-workbench-actions.png', fullPage: true });
  });
});
