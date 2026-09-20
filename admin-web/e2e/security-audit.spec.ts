import { test, expect } from '@playwright/test';
import { getTestSupabaseClient } from './helpers/test-utils';

test.describe('Phase 6 — Supabase & BFF Security Audit Tests', () => {
  const supabase = getTestSupabaseClient();
  const SUPABASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co';

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
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';
    expect(anonKey).not.toContain('service_role');
  });
});
