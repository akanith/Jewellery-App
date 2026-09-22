import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName, loginAsAdmin } from './helpers/test-utils';

test.describe('AW-06: Record Monthly Installment Payment', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can record a ₹1,000 monthly installment payment for a customer', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();

    // 1. Create a fresh test customer
    await page.goto('/customers/new');
    await page.getByPlaceholder(/enter customer full name/i).fill(testName);
    await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
    await page.getByRole('button', { name: /save customer profile/i }).click();
    await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
    await page.getByRole('link', { name: /open customer passbook/i }).click();

    // 2. Click "Record Installment" button
    await page.getByRole('button', { name: /record installment/i }).click();

    // Drawer / Modal should be open
    await expect(page.getByRole('heading', { name: /record installment/i })).toBeVisible();

    // 3. Confirm payment recording
    await page.getByRole('button', { name: 'Record Installment', exact: true }).click();

    // 4. Verify passbook reflects paid state (1 of 12 Months Completed)
    await expect(page.getByText(/1 of 12/i)).toBeVisible({ timeout: 10000 });
  });
});
