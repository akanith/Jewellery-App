# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment-recording.spec.ts >> AW-06: Record Monthly Installment Payment >> admin can record a ₹1,000 monthly installment payment for a customer
- Location: e2e\payment-recording.spec.ts:14:7

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
- text: Invalid login credentials Email Address
- textbox "Email Address":
  - /placeholder: name@aurelian.com
  - text: admin1@gmail.com
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
  4  | test.describe('AW-06: Record Monthly Installment Payment', () => {
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
  14 |   test('admin can record a ₹1,000 monthly installment payment for a customer', async ({ page }) => {
  15 |     const testName = generateTestName();
  16 |     const testMobile = generateTestMobile();
  17 | 
  18 |     // 1. Create a fresh test customer
  19 |     await page.goto('/customers/new');
  20 |     await page.getByPlaceholder(/enter customer full name/i).fill(testName);
  21 |     await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
  22 |     await page.getByRole('button', { name: /save customer profile/i }).click();
  23 |     await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
  24 |     await page.getByRole('link', { name: /open customer passbook/i }).click();
  25 | 
  26 |     // 2. Click "Record Payment" button
  27 |     await page.getByRole('button', { name: /record payment/i }).click();
  28 | 
  29 |     // Drawer / Modal should be open
  30 |     await expect(page.getByText(/record scheme installment payment/i)).toBeVisible();
  31 | 
  32 |     // 3. Confirm payment recording
  33 |     await page.getByRole('button', { name: /confirm & record ₹1,000 payment/i }).click();
  34 | 
  35 |     // 4. Verify passbook reflects paid state
  36 |     await expect(page.getByText(/payment recorded successfully/i)).toBeVisible({ timeout: 10000 });
  37 |     await expect(page.getByText(/1 of 12/i)).toBeVisible();
  38 |     await expect(page.getByText(/₹1,000.00/i)).toBeVisible();
  39 |   });
  40 | });
  41 | 
```