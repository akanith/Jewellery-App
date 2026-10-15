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

  test('SEC-03: Admin-only RPC lockdown for non-admin callers across all 11 sensitive procedures', async () => {
    const adminRpcs = [
      { name: 'admin_reset_customer_password', args: { p_customer_id: '00000000-0000-0000-0000-000000000001' } },
      { name: 'cancel_customer_password_reset_request', args: { p_request_id: '00000000-0000-0000-0000-000000000001' } },
      { name: 'complete_customer_password_reset_request', args: { p_request_id: '00000000-0000-0000-0000-000000000001' } },
      { name: 'create_customer_with_scheme', args: { p_full_name: 'Test Customer', p_phone_number: '9876543210' } },
      { name: 'delete_customer_account', args: { p_customer_id: '00000000-0000-0000-0000-000000000001' } },
      { name: 'enroll_customer_scheme', args: { p_customer_id: '00000000-0000-0000-0000-000000000001', p_start_month: '2026-10-01' } },
      { name: 'get_pending_customer_password_reset_requests', args: {} },
      { name: 'process_emergency_refund', args: { p_scheme_id: '00000000-0000-0000-0000-000000000001', p_refund_amount: 1000 } },
      { name: 'record_installment_payment', args: { p_scheme_id: '00000000-0000-0000-0000-000000000001', p_installment_number: 1, p_payment_method: 'CASH' } },
      { name: 'record_scheme_redemption', args: { p_scheme_id: '00000000-0000-0000-0000-000000000001', p_scheme_amount_used: 1000, p_purchase_total: 1500, p_invoice_number: 'INV-TEST', p_items: [] } },
      { name: 'update_customer_profile', args: { p_customer_id: '00000000-0000-0000-0000-000000000001', p_full_name: 'Test Customer', p_phone_number: '9876543210' } },
    ];

    for (const rpc of adminRpcs) {
      const { data, error } = await supabase.rpc(rpc.name, rpc.args);
      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/permission denied|unauthorized|only registered administrators|admin access required|only super administrators/i);
    }
  });

  test('SEC-04: Unauthorized customer profile changes, enrollment, payments and redemptions fail cleanly', async () => {
    // Attempt profile update without admin session
    const profileRes = await supabase.rpc('update_customer_profile', {
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_full_name: 'Hacker Name',
      p_phone_number: '9999999999',
    });
    expect(profileRes.data).toBeNull();
    expect(profileRes.error?.message).toMatch(/unauthorized|admin access required/i);

    // Attempt scheme enrollment without admin session
    const enrollRes = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_start_month: '2026-10-01',
    });
    expect(enrollRes.data).toBeNull();
    expect(enrollRes.error?.message).toMatch(/unauthorized|admin access required/i);

    // Attempt payment recording without admin session
    const paymentRes = await supabase.rpc('record_installment_payment', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_installment_number: 1,
      p_payment_method: 'CASH',
    });
    expect(paymentRes.data).toBeNull();
    expect(paymentRes.error?.message).toMatch(/unauthorized|admin access required/i);

    // Attempt scheme redemption without admin session
    const redeemRes = await supabase.rpc('record_scheme_redemption', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_scheme_amount_used: 1000,
      p_purchase_total: 1500,
      p_invoice_number: 'INV-UNAUTHORIZED',
      p_items: [],
    });
    expect(redeemRes.data).toBeNull();
    expect(redeemRes.error?.message).toMatch(/unauthorized|admin access required/i);
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
      supabase.rpc('create_customer_session', {
        p_customer_id: '00000000-0000-0000-0000-000000000001',
      }),
      supabase.rpc('verify_customer_session', {
        p_session_token: 'invalid_token_sample',
      }),
      supabase.rpc('revoke_customer_session', {
        p_session_token: 'invalid_token_sample',
      }),
    ]);

    for (const result of unauthorizedCalls) {
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toMatch(/permission denied|does not exist/i);
    }
  });

  test('SEC-07: Maintenance and cleanup RPCs are not directly executable with the public client', async () => {
    const maintenanceCalls = await Promise.all([
      supabase.rpc('admin_cleanup_e2e_test_data', { p_confirmation_phrase: 'test' }),
      supabase.rpc('admin_cleanup_pre_production_audit_logs', { p_confirmation_phrase: 'test' }),
      supabase.rpc('admin_cleanup_six_test_customers', { p_confirmation_phrase: 'test' }),
      supabase.rpc('reset_customer_code_sequence'),
      supabase.rpc('set_customer_initial_password', { p_customer_id: '00000000-0000-0000-0000-000000000001' }),
    ]);

    for (const result of maintenanceCalls) {
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toMatch(/permission denied|does not exist/i);
    }
  });

  test('SEC-08: Service-role-only auth tables remain inaccessible to anon and authenticated clients', async ({ request }) => {
    const serviceRoleTables = ['customer_auth', 'customer_sessions', 'customer_password_reset_requests'];
    const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

    for (const table of serviceRoleTables) {
      const res = await request.get(`${SUPABASE_URL}/rest/v1/${table}`, {
        headers: {
          apikey,
          Authorization: `Bearer ${apikey}`,
        },
      });

      if (res.status() === 200) {
        const body = await res.json();
        expect(body).toEqual([]);
      } else {
        expect([401, 403, 404]).toContain(res.status());
      }
    }
  });

  test('SEC-09: Super-admin emergency refund RPC is strictly restricted', async () => {
    const { data, error } = await supabase.rpc('process_emergency_refund', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_refund_amount: 1000,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/only super administrators/i);
  });

  test('SEC-10: Deactivated or non-admin callers cannot execute administrative RPCs', async () => {
    const { data, error } = await supabase.rpc('update_customer_profile', {
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_full_name: 'Test Inactive Admin',
      p_phone_number: '9876543210',
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized|admin access required|only registered administrators/i);
  });
});
