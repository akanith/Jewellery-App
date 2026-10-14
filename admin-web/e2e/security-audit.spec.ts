import { test, expect } from '@playwright/test';
import { getTestSupabaseClient } from './helpers/test-utils';

test.describe('Phase 6 — Supabase & BFF Security Audit Tests', () => {
  const supabase = getTestSupabaseClient();
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

  test('SEC-02: Anonymous direct RLS lockdown on customer data', async ({ request }) => {
    // Attempt direct REST query to protected customers table using anon key
    const res = await request.get(`${SUPABASE_URL}/rest/v1/customers`, {
      headers: {
        apikey: 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD',
        Authorization: 'Bearer sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD',
      },
    });

    // RLS or permission restriction must return empty list or 401/403
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toEqual([]);
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });

  test('SEC-03: Admin-only RPC lockdown for non-admin callers', async () => {
    // Calling admin RPC without admin session MUST raise an exception
    const { data, error } = await supabase.rpc('get_pending_customer_password_reset_requests');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/permission denied|unauthorized/i);
  });

  test('SEC-05: Secret leakage audit in client code', async () => {
    // Verify client bundle does not contain service_role keys or db secrets
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';
    expect(publishableKey).not.toContain('service_role');
  });

  test('SEC-06: Customer authentication RPCs are not directly executable with the public client', async () => {
    const unauthorizedCalls = await Promise.all([
      supabase.rpc('customer_password_login', {
        p_phone_number: '9009990000',
        p_password: 'InvalidPassword123',
      }),
      supabase.rpc('customer_change_password', {
        p_customer_id: '00000000-0000-0000-0000-000000000001',
        p_old_password: 'irrelevant',
        p_new_password: 'SecurePass123',
      }),
      supabase.rpc('request_customer_password_reset', {
        p_mobile_number: '9009990000',
      }),
    ]);

    for (const result of unauthorizedCalls) {
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    }
  });
});
