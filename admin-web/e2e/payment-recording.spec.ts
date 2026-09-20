import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName } from './helpers/test-utils';

test.describe('AW-06: Record Monthly Installment Payment', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
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

    // 2. Click "Record Payment" button
    await page.getByRole('button', { name: /record payment/i }).click();

    // Drawer / Modal should be open
    await expect(page.getByText(/record scheme installment payment/i)).toBeVisible();

    // 3. Confirm payment recording
    await page.getByRole('button', { name: /confirm & record ₹1,000 payment/i }).click();

    // 4. Verify passbook reflects paid state
    await expect(page.getByText(/payment recorded successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/1 of 12/i)).toBeVisible();
    await expect(page.getByText(/₹1,000.00/i)).toBeVisible();
  });
});
