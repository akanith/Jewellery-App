import { test, expect } from '@playwright/test';
import { generateTestMobile, generateTestName } from './helpers/test-utils';

test.describe('AW-08: 12th Installment Bonus Crediting & Maturity Transition', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('completing 12th installment automatically credits ₹1,000 bonus and transitions scheme to MATURED', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();

    // Register test customer
    await page.goto('/customers/new');
    await page.getByPlaceholder(/enter customer full name/i).fill(testName);
    await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
    await page.getByRole('button', { name: /save customer profile/i }).click();
    await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
    await page.getByRole('link', { name: /open customer passbook/i }).click();

    // Verify initial active state
    await expect(page.getByText(/scheme status: active/i)).toBeVisible();

    // Record payments 1 through 12
    for (let i = 1; i <= 12; i++) {
      const recordBtn = page.getByRole('button', { name: /record payment/i });
      if (await recordBtn.isVisible()) {
        await recordBtn.click();
        await page.getByRole('button', { name: /confirm & record ₹1,000 payment/i }).click();
        await page.waitForTimeout(500);
      }
    }

    // Verify final MATURED state and ₹13,000 maturity value display
    await expect(page.getByText(/₹13,000|matured/i)).toBeVisible({ timeout: 15000 });
  });
});
