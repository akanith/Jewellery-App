import { test, expect } from '@playwright/test';

test.describe('AW-03: Customer Directory Search & Filters', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can search customer directory by mobile or customer code', async ({ page }) => {
    await page.goto('/customers');

    // Search input should be present
    const searchInput = page.getByPlaceholder(/search by customer name, mobile, or id/i);
    await expect(searchInput).toBeVisible();

    // Type test search query
    await searchInput.fill('8778173682');

    // Directory table should filter matching rows
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('8778173682')).toBeVisible();
  });
});
