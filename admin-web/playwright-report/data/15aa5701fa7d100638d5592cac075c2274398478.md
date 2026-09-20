# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-creation.spec.ts >> AW-05: Add New Customer & Scheme Enrollment >> admin can register a new customer and atomically enroll them into 12-month scheme
- Location: e2e\customer-creation.spec.ts:15:7

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
  4  | test.describe('AW-05: Add New Customer & Scheme Enrollment', () => {
  5  | 
  6  |   test.beforeEach(async ({ page }) => {
  7  |     // Authenticate as Admin
  8  |     await page.goto('/login');
  9  |     await page.getByLabel(/email address/i).fill('admin1@gmail.com');
  10 |     await page.getByLabel(/password/i).fill('AdminPassword123!');
  11 |     await page.getByRole('button', { name: /sign in|login/i }).click();
> 12 |     await expect(page).toHaveURL('http://localhost:3000/');
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  13 |   });
  14 | 
  15 |   test('admin can register a new customer and atomically enroll them into 12-month scheme', async ({ page }) => {
  16 |     const testName = generateTestName();
  17 |     const testMobile = generateTestMobile();
  18 | 
  19 |     await page.goto('/customers/new');
  20 | 
  21 |     // Fill customer registration form
  22 |     await page.getByPlaceholder(/enter customer full name/i).fill(testName);
  23 |     await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
  24 |     await page.getByPlaceholder(/street name, house number/i).fill('45 Gold Palace Road');
  25 |     await page.getByPlaceholder(/dindigul/i).fill('Coimbatore');
  26 | 
  27 |     // Submit form
  28 |     await page.getByRole('button', { name: /save customer profile/i }).click();
  29 | 
  30 |     // Verify success enrollment view
  31 |     await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
  32 |     await expect(page.getByText(testName)).toBeVisible();
  33 |     await expect(page.getByText(/₹13,000/i)).toBeVisible();
  34 | 
  35 |     // Open Customer Passbook
  36 |     await page.getByRole('link', { name: /open customer passbook/i }).click();
  37 | 
  38 |     // Verify customer passbook loads cleanly with 12 installment slots
  39 |     await expect(page.getByRole('heading', { name: testName })).toBeVisible();
  40 |     await expect(page.getByText(/12-month savings scheme/i)).toBeVisible();
  41 |   });
  42 | });
  43 | 
```