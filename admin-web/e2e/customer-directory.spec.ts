import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName, loginAsAdmin } from './helpers/test-utils';

test.describe('AW-03: Customer Directory Search & Filters', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can search customer directory by mobile or customer code', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();

    // Register a unique test customer through the admin creation workflow
    await page.goto('/customers/new');
    await page.getByPlaceholder(/enter customer full name/i).fill(testName);
    await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
    await page.getByRole('button', { name: /save customer profile/i }).click();
    await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();

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
  });
});
