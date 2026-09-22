import { test, expect } from '@playwright/test';
import { getE2EAdminCredentials } from './helpers/test-utils';

test.describe('AW-01: Admin Authentication & Route Protection', () => {

  test('unauthenticated users navigating to protected routes are redirected to login', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/payments');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/password-reset-requests');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin can log in successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    const { email, password } = getE2EAdminCredentials();
    const emailInput = page.getByLabel(/email address/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.click();
    await emailInput.fill(email);
    if ((await emailInput.inputValue()) !== email) {
      await emailInput.pressSequentially(email, { delay: 10 });
    }

    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.click();
    await passwordInput.fill(password);
    if ((await passwordInput.inputValue()) !== password) {
      await passwordInput.pressSequentially(password, { delay: 10 });
    }

    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Verify successful authentication and redirection to dashboard/home
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('heading', { name: /good day|dashboard|customers directory|ramya/i })).toBeVisible({ timeout: 20000 });
  });

  test('invalid login credentials display an error alert', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email address/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.click();
    await emailInput.fill('invalid_admin@gmail.com');
    if ((await emailInput.inputValue()) !== 'invalid_admin@gmail.com') {
      await emailInput.pressSequentially('invalid_admin@gmail.com', { delay: 10 });
    }

    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.click();
    await passwordInput.fill('WrongPassword123!');
    if ((await passwordInput.inputValue()) !== 'WrongPassword123!') {
      await passwordInput.pressSequentially('WrongPassword123!', { delay: 10 });
    }

    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Error alert banner should be displayed
    await expect(page.getByText(/invalid email or password|invalid login credentials/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
