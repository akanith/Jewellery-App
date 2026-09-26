import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-utils';

test.describe('AW-09: Scheme Maturity Redemption', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test('admin can access redemption page and view eligible customer schemes', async ({ page }) => {
    await page.goto('/redemption');

    // Page header
    await expect(page.getByRole('heading', { name: /scheme redemption hub/i })).toBeVisible();

    // Verify search or table is visible
    await expect(page.getByPlaceholder(/search by customer name, mobile, code, or scheme/i)).toBeVisible();
  });
});
