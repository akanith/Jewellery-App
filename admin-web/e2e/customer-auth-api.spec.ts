import { test, expect } from '@playwright/test';
import { getTestServiceRoleClient } from './helpers/test-utils';

test.describe('Phase 5 — Customer Authentication & Password API Tests', () => {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const BFF_URL = process.env.NEXT_PUBLIC_BFF_BASE_URL || `${SUPABASE_URL}/functions/v1/customer-bff`;

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
    // Direct customer-auth RPCs are restricted to the server-side BFF service role.
    // Use service role only within this isolated local E2E runner.
    const testServiceClient = getTestServiceRoleClient();
    const { data, error } = await testServiceClient.rpc('customer_password_login', {
      p_phone_number: '8778173682',
      p_password: 'WrongPassword999!',
    });

    expect(data.success).toBe(false);
    expect(['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED']).toContain(data.error);
  });
});
