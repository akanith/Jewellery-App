import { test, expect } from '@playwright/test';

test.describe('AW-09: Scheme Maturity Redemption', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can access redemption page and view eligible customer schemes', async ({ page }) => {
    await page.goto('/redemption');

    // Page header
    await expect(page.getByRole('heading', { name: /scheme maturity & jewellery redemption/i })).toBeVisible();

    // Verify search or table is visible
    await expect(page.getByPlaceholder(/search eligible customer name, code, or mobile/i)).toBeVisible();
  });
});
