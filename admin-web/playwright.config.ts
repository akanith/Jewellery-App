import { defineConfig, devices } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
if (supabaseUrl.includes('yjpbswsgtbmgageburmy.supabase.co')) {
  throw new Error(
    '[FATAL SAFETY GUARD] Playwright E2E configuration resolved to PRODUCTION Supabase URL (yjpbswsgtbmgageburmy.supabase.co). Playwright E2E execution aborted to prevent production database corruption.'
  );
}

/**
 * RAMYAS JEWELLER - Admin Web Isolated Playwright E2E Configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
