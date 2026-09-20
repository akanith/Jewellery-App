# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bonus-maturity.spec.ts >> AW-08: 12th Installment Bonus Crediting & Maturity Transition >> completing 12th installment automatically credits ₹1,000 bonus and transitions scheme to MATURED
- Location: e2e\bonus-maturity.spec.ts:14:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/"
Received: "http://localhost:3000/login"
Timeout:  10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × locator resolved to <html lang="en" class="h-full bg-slate-50">…</html>
       - unexpected value "http://localhost:3000/login"

```

```yaml
- text: R RAMYAS JEWELLER
- heading "Jewellery Savings Scheme Management" [level=1]
- paragraph: Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
- img "Ramyas Jeweller - Heritage Gold and Diamond Jewellery Showcase"
- text: RAMYAS
- heading "Welcome Back" [level=2]
- paragraph: Sign in to your dashboard
- text: Email Address
- textbox "Email Address":
  - /placeholder: name@aurelian.com
- text: Password
- button "Forgot Password?"
- textbox "Password":
  - /placeholder: ••••••••
  - text: AdminPassword123!
- button "Show secret"
- checkbox "Remember this device"
- text: Remember this device
- button "Sign In"
- paragraph:
  - text: Admin assistance?
  - button "Contact Support"
- text: Don't have an account?
- button "Request access"
- contentinfo: © 2024 Ramyas Jeweller Privacy Policy Terms of Service Security
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { generateTestMobile, generateTestName } from './helpers/test-utils';
  3  | 
  4  | test.describe('AW-08: 12th Installment Bonus Crediting & Maturity Transition', () => {
  5  | 
  6  |   test.beforeEach(async ({ page }) => {
  7  |     await page.goto('/login');
  8  |     await page.getByLabel(/email address/i).fill('admin1@gmail.com');
  9  |     await page.getByLabel(/password/i).fill('AdminPassword123!');
  10 |     await page.getByRole('button', { name: /sign in|login/i }).click();
> 11 |     await expect(page).toHaveURL('http://localhost:3000/');
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  12 |   });
  13 | 
  14 |   test('completing 12th installment automatically credits ₹1,000 bonus and transitions scheme to MATURED', async ({ page }) => {
  15 |     const testName = generateTestName();
  16 |     const testMobile = generateTestMobile();
  17 | 
  18 |     // Register test customer
  19 |     await page.goto('/customers/new');
  20 |     await page.getByPlaceholder(/enter customer full name/i).fill(testName);
  21 |     await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
  22 |     await page.getByRole('button', { name: /save customer profile/i }).click();
  23 |     await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
  24 |     await page.getByRole('link', { name: /open customer passbook/i }).click();
  25 | 
  26 |     // Verify initial active state
  27 |     await expect(page.getByText(/scheme status: active/i)).toBeVisible();
  28 | 
  29 |     // Record payments 1 through 12
  30 |     for (let i = 1; i <= 12; i++) {
  31 |       const recordBtn = page.getByRole('button', { name: /record payment/i });
  32 |       if (await recordBtn.isVisible()) {
  33 |         await recordBtn.click();
  34 |         await page.getByRole('button', { name: /confirm & record ₹1,000 payment/i }).click();
  35 |         await page.waitForTimeout(500);
  36 |       }
  37 |     }
  38 | 
  39 |     // Verify final MATURED state and ₹13,000 maturity value display
  40 |     await expect(page.getByText(/₹13,000|matured/i)).toBeVisible({ timeout: 15000 });
  41 |   });
  42 | });
  43 | 
```