import { test, expect } from '@playwright/test';
import { createTestCustomerWithPastScheme, generateTestMobile, generateTestName, loginAsAdmin } from './helpers/test-utils';

test.describe('AW-08: 12th Installment Bonus Crediting & Maturity Transition', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('completing 12th installment automatically credits ₹1,000 bonus and transitions scheme to MATURED', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();

    // Create test customer with scheme starting 11 months ago so all 12 installments are legally payable
    const customerData = await createTestCustomerWithPastScheme(testName, testMobile, 11);

    // Open Customer Passbook
    await page.goto(`/customers/${customerData.customer_id}`);

    // Verify initial active state
    await expect(page.getByText('0 of 12 Months Completed')).toBeVisible();

    // Record payments 1 through 12
    for (let i = 1; i <= 12; i++) {
      const recordBtn = page.getByRole('button', { name: new RegExp(`record installment #${i}`, 'i') });
      await expect(recordBtn).toBeVisible({ timeout: 5000 });
      await recordBtn.click();

      const confirmBtn = page.getByRole('button', { name: 'Record Installment', exact: true });
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();

      // Wait for drawer to close and passbook state to settle with updated progress
      await expect(confirmBtn).toBeHidden({ timeout: 5000 });
      await expect(page.getByText(`${i} of 12 Months Completed`)).toBeVisible({ timeout: 10000 });
    }

    // Verify final MATURED state, ₹13,000 maturity value, and redemption CTA
    await expect(page.getByText('12 of 12 Months Completed')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('₹13,000')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /proceed to scheme redemption/i })).toBeVisible({ timeout: 15000 });
  });
});
