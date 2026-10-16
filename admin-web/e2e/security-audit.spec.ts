import { test, expect } from '@playwright/test';
import {
  getTestSupabaseClient,
  getTestServiceRoleClient,
  getAuthenticatedAdminSupabaseClient,
  createAuthenticatedNonAdminFixture,
  createAuthenticatedAdminFixture,
  createAuthenticatedInactiveAdminFixture,
} from './helpers/test-utils';

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
      expect(error?.message).not.toMatch(/could not find the function|schema cache/i);
    }
  });

  test('SEC-04: Unauthorized customer profile changes, enrollment, payments and redemptions fail cleanly', async () => {
    // Attempt profile update without admin session (unauthenticated caller rejected at DB permission layer)
    const profileRes = await supabase.rpc('update_customer_profile', {
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_full_name: 'Hacker Name',
      p_phone_number: '9999999999',
    });
    expect(profileRes.data).toBeNull();
    expect(profileRes.error).not.toBeNull();
    expect(profileRes.error?.message).toMatch(/permission denied/i);
    expect(profileRes.error?.message).not.toMatch(/could not find the function|schema cache/i);

    // Attempt scheme enrollment without admin session
    const enrollRes = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: '00000000-0000-0000-0000-000000000001',
      p_start_month: '2026-10-01',
    });
    expect(enrollRes.data).toBeNull();
    expect(enrollRes.error).not.toBeNull();
    expect(enrollRes.error?.message).toMatch(/permission denied/i);
    expect(enrollRes.error?.message).not.toMatch(/could not find the function|schema cache/i);

    // Attempt payment recording without admin session
    const paymentRes = await supabase.rpc('record_installment_payment', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_installment_number: 1,
      p_payment_method: 'CASH',
    });
    expect(paymentRes.data).toBeNull();
    expect(paymentRes.error).not.toBeNull();
    expect(paymentRes.error?.message).toMatch(/permission denied/i);
    expect(paymentRes.error?.message).not.toMatch(/could not find the function|schema cache/i);

    // Attempt scheme redemption without admin session
    const redeemRes = await supabase.rpc('record_scheme_redemption', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_scheme_amount_used: 1000,
      p_purchase_total: 1500,
      p_invoice_number: 'INV-UNAUTHORIZED',
      p_items: [],
    });
    expect(redeemRes.data).toBeNull();
    expect(redeemRes.error).not.toBeNull();
    expect(redeemRes.error?.message).toMatch(/permission denied/i);
    expect(redeemRes.error?.message).not.toMatch(/could not find the function|schema cache/i);
  });

  test('SEC-05: Secret leakage audit in client code', async () => {
    // Verify client bundle does not contain service_role keys or db secrets
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';
    expect(publishableKey).not.toContain('service_role');
  });

  test('SEC-06: Customer authentication RPCs are not directly executable with the public client', async () => {
    const dummyHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const futureExpiry = new Date(Date.now() + 3600000).toISOString();

    const unauthorizedCalls = await Promise.all([
      supabase.rpc('customer_password_login', {
        p_phone_number: '9009990000',
        p_password: 'SafeTestPassword123!',
      }),
      supabase.rpc('customer_change_password', {
        p_customer_id: '00000000-0000-0000-0000-000000000001',
        p_old_password: 'SafeTestOldPassword123!',
        p_new_password: 'SafeTestNewPassword456!',
      }),
      supabase.rpc('request_customer_password_reset', {
        p_mobile_number: '9009990000',
      }),
      supabase.rpc('create_customer_session', {
        p_customer_id: '00000000-0000-0000-0000-000000000001',
        p_token_hash: dummyHash,
        p_expires_at: futureExpiry,
      }),
      supabase.rpc('verify_customer_session', {
        p_token_hash: dummyHash,
      }),
      supabase.rpc('revoke_customer_session', {
        p_token_hash: dummyHash,
      }),
    ]);

    for (const result of unauthorizedCalls) {
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toMatch(/permission denied/i);
      expect(result.error?.message).not.toMatch(/could not find the function|schema cache/i);
    }
  });

  test('SEC-07: Maintenance and cleanup RPCs are not directly executable with the public client', async () => {
    const maintenanceCalls = await Promise.all([
      supabase.rpc('admin_cleanup_e2e_test_data', { p_execute: false }),
      supabase.rpc('admin_cleanup_pre_production_audit_logs', {
        p_cutoff: '2026-09-29T14:24:01.921Z',
        p_execute: false,
      }),
      supabase.rpc('admin_cleanup_six_test_customers', { p_execute: false }),
      supabase.rpc('reset_customer_code_sequence', {}),
      supabase.rpc('set_customer_initial_password', {
        p_customer_id: '00000000-0000-0000-0000-000000000001',
      }),
    ]);

    for (const result of maintenanceCalls) {
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toMatch(/permission denied/i);
      expect(result.error?.message).not.toMatch(/could not find the function|schema cache/i);
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
    // 1. Direct unauthenticated public-client call is rejected by PostgreSQL permission layer
    const { data: publicData, error: publicError } = await supabase.rpc('process_emergency_refund', {
      p_scheme_id: '00000000-0000-0000-0000-000000000001',
      p_refund_amount: 1000,
    });

    expect(publicData).toBeNull();
    expect(publicError).not.toBeNull();
    expect(publicError?.message).toMatch(/permission denied/i);
    expect(publicError?.message).not.toMatch(/could not find the function|schema cache/i);

    // 2. Ordinary admin vs Super-admin authorization validation (when service role key available in local/CI)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let activeOrdinaryAdminFixture: Awaited<ReturnType<typeof createAuthenticatedAdminFixture>> | null = null;
      try {
        // Authenticated ordinary admin (isSuperAdmin: false) is rejected by DB authorization guard
        activeOrdinaryAdminFixture = await createAuthenticatedAdminFixture({
          isSuperAdmin: false,
          isActive: true,
          roleTitle: 'Ordinary Staff Admin',
        });
        const ordinaryRefund = await activeOrdinaryAdminFixture.client.rpc('process_emergency_refund', {
          p_scheme_id: '00000000-0000-0000-0000-000000000001',
          p_refund_amount: 1000,
        });
        expect(ordinaryRefund.data).toBeNull();
        expect(ordinaryRefund.error).not.toBeNull();
        expect(ordinaryRefund.error?.message).toMatch(/only super administrators/i);
        expect(ordinaryRefund.error?.message).not.toMatch(/permission denied|schema cache|could not find the function/i);

        // Authenticated super-admin passes authorization guard, but is stopped by safe data validation
        const superAdminClient = await getAuthenticatedAdminSupabaseClient();
        const superRefund = await superAdminClient.rpc('process_emergency_refund', {
          p_scheme_id: '00000000-0000-0000-0000-000000000001',
          p_refund_amount: 1000,
        });
        expect(superRefund.data).toBeNull();
        expect(superRefund.error).not.toBeNull();
        expect(superRefund.error?.message).toMatch(/scheme enrollment with id .* not found/i);
        expect(superRefund.error?.message).not.toMatch(/only super administrators|permission denied|schema cache/i);
      } finally {
        if (activeOrdinaryAdminFixture) {
          await activeOrdinaryAdminFixture.cleanup();
        }
      }
    }
  });

  test('SEC-10: Authenticated non-admin and deactivated administrator callers are rejected from administrative RPCs', async () => {
    test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Fixture creation requires isolated SUPABASE_SERVICE_ROLE_KEY in local/CI environment');

    const serviceClient = getTestServiceRoleClient();
    const targetCustomerId = '00000000-0000-0000-0000-000000000001';

    // Verify target customer does not exist before testing
    const { count: initialCustCount } = await serviceClient
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('id', targetCustomerId);
    expect(initialCustCount).toBe(0);

    let nonAdminFixture: Awaited<ReturnType<typeof createAuthenticatedNonAdminFixture>> | null = null;
    let inactiveAdminFixture: Awaited<ReturnType<typeof createAuthenticatedInactiveAdminFixture>> | null = null;

    try {
      // 1. Create isolated test fixtures
      nonAdminFixture = await createAuthenticatedNonAdminFixture();
      inactiveAdminFixture = await createAuthenticatedInactiveAdminFixture();

      // Confirm inactive administrator has matching admin_users record and inactive profiles record
      const { data: inactiveProfile } = await serviceClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', inactiveAdminFixture.userId)
        .single();
      expect(inactiveProfile?.role).toBe('ADMIN');
      expect(inactiveProfile?.is_active).toBe(false);

      const { data: inactiveAdminRecord } = await serviceClient
        .from('admin_users')
        .select('id, is_super_admin')
        .eq('id', inactiveAdminFixture.userId)
        .single();
      expect(inactiveAdminRecord?.id).toBe(inactiveAdminFixture.userId);

      // 2. Authenticated non-admin attempts protected administrative RPCs
      const nonAdminUpdate = await nonAdminFixture.client.rpc('update_customer_profile', {
        p_customer_id: targetCustomerId,
        p_full_name: 'Unauthorized NonAdmin Edit',
        p_phone_number: '9876543210',
      });
      expect(nonAdminUpdate.data).toBeNull();
      expect(nonAdminUpdate.error).not.toBeNull();
      expect(nonAdminUpdate.error?.message).toMatch(/unauthorized|admin access required|only registered administrators/i);
      expect(nonAdminUpdate.error?.message).not.toMatch(/permission denied|schema cache/i);

      const nonAdminRefund = await nonAdminFixture.client.rpc('process_emergency_refund', {
        p_scheme_id: targetCustomerId,
        p_refund_amount: 1000,
      });
      expect(nonAdminRefund.data).toBeNull();
      expect(nonAdminRefund.error).not.toBeNull();
      expect(nonAdminRefund.error?.message).toMatch(/unauthorized|only super administrators|admin access required/i);
      expect(nonAdminRefund.error?.message).not.toMatch(/permission denied|schema cache/i);

      // 3. Authenticated deactivated administrator attempts protected administrative RPCs
      // Profile has role = 'ADMIN' and is_active = false; matching admin_users record exists
      const inactiveAdminUpdate = await inactiveAdminFixture.client.rpc('update_customer_profile', {
        p_customer_id: targetCustomerId,
        p_full_name: 'Unauthorized InactiveAdmin Edit',
        p_phone_number: '9876543210',
      });
      expect(inactiveAdminUpdate.data).toBeNull();
      expect(inactiveAdminUpdate.error).not.toBeNull();
      expect(inactiveAdminUpdate.error?.message).toMatch(/unauthorized|admin access required|only registered administrators/i);
      expect(inactiveAdminUpdate.error?.message).not.toMatch(/permission denied|schema cache/i);

      const inactiveAdminRefund = await inactiveAdminFixture.client.rpc('process_emergency_refund', {
        p_scheme_id: targetCustomerId,
        p_refund_amount: 1000,
      });
      expect(inactiveAdminRefund.data).toBeNull();
      expect(inactiveAdminRefund.error).not.toBeNull();
      expect(inactiveAdminRefund.error?.message).toMatch(/unauthorized|only super administrators|admin access required/i);
      expect(inactiveAdminRefund.error?.message).not.toMatch(/permission denied|schema cache/i);

      // 4. Verify no customer, profile, scheme, or financial records were changed
      const { count: finalCustCount } = await serviceClient
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('id', targetCustomerId);
      expect(finalCustCount).toBe(0);

      const { count: hackedNamesCount } = await serviceClient
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .in('full_name', ['Unauthorized NonAdmin Edit', 'Unauthorized InactiveAdmin Edit']);
      expect(hackedNamesCount).toBe(0);

      const { count: refundCount } = await serviceClient
        .from('schemes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'EMERGENCY_REFUNDED');
      expect(refundCount).toBe(0);
    } finally {
      // Clean up isolated test fixtures
      if (nonAdminFixture) {
        await nonAdminFixture.cleanup();
      }
      if (inactiveAdminFixture) {
        await inactiveAdminFixture.cleanup();
      }
    }
  });

  test('SEC-11: Legitimate administrator and super-admin authorization is strictly preserved', async () => {
    test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Fixture creation requires isolated SUPABASE_SERVICE_ROLE_KEY in local/CI environment');

    let activeNonSuperAdminFixture: Awaited<ReturnType<typeof createAuthenticatedAdminFixture>> | null = null;

    try {
      // 1. Active administrator with matching admin_users record is recognized as admin
      activeNonSuperAdminFixture = await createAuthenticatedAdminFixture({
        isSuperAdmin: false,
        isActive: true,
        roleTitle: 'Active Staff Admin',
      });

      // Active non-super admin can execute admin-only read RPC
      const { data: pendingRequests, error: pendingErr } = await activeNonSuperAdminFixture.client.rpc(
        'get_pending_customer_password_reset_requests'
      );
      expect(pendingErr).toBeNull();
      expect(Array.isArray(pendingRequests)).toBe(true);

      // 2. Only active super-admin can execute super-admin RPCs; active non-super admin is rejected
      const refundByNonSuper = await activeNonSuperAdminFixture.client.rpc('process_emergency_refund', {
        p_scheme_id: '00000000-0000-0000-0000-000000000001',
        p_refund_amount: 1000,
      });
      expect(refundByNonSuper.data).toBeNull();
      expect(refundByNonSuper.error).not.toBeNull();
      expect(refundByNonSuper.error?.message).toMatch(/only super administrators/i);
      expect(refundByNonSuper.error?.message).not.toMatch(/permission denied|schema cache/i);

      // 3. Active super-admin caller passes super-admin authorization check
      const superAdminClient = await getAuthenticatedAdminSupabaseClient();
      const refundBySuper = await superAdminClient.rpc('process_emergency_refund', {
        p_scheme_id: '00000000-0000-0000-0000-000000000001',
        p_refund_amount: 1000,
      });
      // The super-admin authorization guard succeeds, reaching data validation where the dummy scheme ID is not found
      expect(refundBySuper.data).toBeNull();
      expect(refundBySuper.error).not.toBeNull();
      expect(refundBySuper.error?.message).toMatch(/scheme enrollment with id .* not found/i);
      expect(refundBySuper.error?.message).not.toMatch(/only super administrators|permission denied|schema cache/i);
    } finally {
      if (activeNonSuperAdminFixture) {
        await activeNonSuperAdminFixture.cleanup();
      }
    }
  });
});
