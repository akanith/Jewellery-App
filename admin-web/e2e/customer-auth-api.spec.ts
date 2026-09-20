import { test, expect } from '@playwright/test';
import { getTestSupabaseClient, generateTestMobile, generateTestName } from './helpers/test-utils';

test.describe('Phase 5 — Customer Authentication & Password API Tests', () => {
  const supabase = getTestSupabaseClient();
  const BFF_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff';

  test('CA-07 & CA-08: Forgot password request returns generic anti-enumeration response', async ({ request }) => {
    // Registered mobile test
    const res1 = await request.post(`${BFF_URL}/auth/forgot-password`, {
      data: { mobileNumber: '8778173682' },
    });
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();
    expect(body1.success).toBe(true);
    expect(body1.message).toContain('If the mobile number is registered');

    // Unregistered mobile test
    const res2 = await request.post(`${BFF_URL}/auth/forgot-password`, {
      data: { mobileNumber: '9009990000' },
    });
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();
    // Responses MUST be identical to prevent account enumeration
    expect(body2.message).toBe(body1.message);
  });

  test('CA-01 & CA-02: Customer password login validation', async () => {
    // Valid mobile with invalid password
    const { data, error } = await supabase.rpc('customer_password_login', {
      p_phone_number: '8778173682',
      p_password: 'WrongPassword999!',
    });

    expect(data.success).toBe(false);
    expect(['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED']).toContain(data.error);
  });
});
