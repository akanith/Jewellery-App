import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName, loginAsAdmin, deleteTestCustomer } from './helpers/test-utils';

test.describe('AW-05: Add New Customer & Scheme Enrollment', () => {

  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin
    await loginAsAdmin(page);
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can register a new customer and atomically enroll them into 12-month scheme', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    let createdCustomerId: string | null = null;

    try {
      await page.goto('/customers/new');

      // Fill customer registration form
      await page.getByPlaceholder(/enter customer full name/i).fill(testName);
      await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
      await page.getByPlaceholder(/street name, house number/i).fill('45 Gold Palace Road');
      await page.getByPlaceholder(/coimbatore/i).fill('Coimbatore');

      // Submit form
      await page.getByRole('button', { name: /save customer profile/i }).click();

      // Verify success enrollment view
      await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
      await expect(page.getByText(testName)).toBeVisible();
      await expect(page.getByText(/₹13,000/i)).toBeVisible();

      // Open Customer Passbook
      await page.getByRole('link', { name: /open customer passbook/i }).click();

      // Extract created customer ID from passbook URL
      await page.waitForURL(/\/customers\/[a-f0-9-]+/i);
      createdCustomerId = page.url().split('/customers/')[1];

      // Verify customer passbook loads cleanly with 12 installment slots
      await expect(page.getByRole('heading', { name: testName })).toBeVisible();
      await expect(page.getByText(/12-month gold savings scheme/i)).toBeVisible();
    } finally {
      if (createdCustomerId) {
        await deleteTestCustomer(createdCustomerId);
      }
    }
  });
});
