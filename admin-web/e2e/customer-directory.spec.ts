import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName, loginAsAdmin, deleteTestCustomer } from './helpers/test-utils';

test.describe('AW-03: Customer Directory Search & Filters', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test('admin can search customer directory by mobile or customer code', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    let customerId: string | null = null;

    try {
      // Register a unique test customer through the admin creation workflow
      await page.goto('/customers/new');
      await page.getByPlaceholder(/enter customer full name/i).fill(testName);
      await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
      await page.getByRole('button', { name: /save customer profile/i }).click();
      await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();

      const viewProfileBtn = page.getByRole('link', { name: /open customer passbook|view customer profile/i });
      if (await viewProfileBtn.isVisible()) {
        const href = await viewProfileBtn.getAttribute('href');
        if (href) {
          const parts = href.split('/customers/');
          if (parts[1]) customerId = parts[1];
        }
      }

      // Navigate to Customer Directory
      await page.goto('/customers');

      // Search input should be present
      const searchInput = page.getByPlaceholder(/search by customer name, mobile, or id/i);
      await expect(searchInput).toBeVisible();

      // Type test search query
      await searchInput.fill(testMobile);

      // Directory table should filter matching rows and show the dynamically created customer
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByText(testName)).toBeVisible();
    } finally {
      if (customerId) {
        await deleteTestCustomer(customerId);
      }
    }
  });
});
