import { test, expect } from '@playwright/test';
import {
  getTestSupabaseClient,
  getAuthenticatedAdminSupabaseClient,
  getE2EAdminCredentials,
  loginAsAdmin,
  generateTestMobile,
  generateTestName,
  deleteTestCustomer,
  deleteTestCustomers,
} from './helpers/test-utils';

test.describe('AW-10: Customer Code Sequence Tests (RJ2026-###)', () => {

  test('SEQ-01: New customer receives sequential code in RJ2026-### format and creates all related entities', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    let customerId: string | null = null;

    try {
      // 1. Authenticate as Admin
      await loginAsAdmin(page);
      await page.goto('/customers/new');

      // 2. Fill customer registration form
      await page.getByPlaceholder(/enter customer full name/i).fill(testName);
      await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
      await page.getByRole('button', { name: /save customer profile/i }).click();

      // 3. Verify success page displays sequential customer code matching RJ2026-###
      await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
      await expect(page.getByText(new RegExp(`RJ${new Date().getFullYear()}-\\d{3,}`, 'i'))).toBeVisible();

      // 4. Navigate to detail page
      await page.getByRole('link', { name: /open customer passbook/i }).click();
      await page.waitForURL(/\/customers\/[a-f0-9-]+/i);
      customerId = page.url().split('/customers/')[1];

      // 5. Query Supabase directly to verify all created entities using authenticated admin client
      const supabase = await getAuthenticatedAdminSupabaseClient();

      // Verify Customer record & code format
      const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
      expect(customer).not.toBeNull();
      expect(customer.customer_code).toMatch(/^RJ\d{4}-\d{3,}$/);

      // Verify Profile record
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', customerId).single();
      expect(profile).not.toBeNull();
      expect(profile.role).toBe('CUSTOMER');

      // Verify Scheme record
      const { data: schemes } = await supabase.from('schemes').select('*').eq('customer_id', customerId);
      expect(schemes).not.toBeNull();
      expect(schemes!.length).toBe(1);
      const scheme = schemes![0];

      // Verify 12 Installments
      const { data: installments } = await supabase
        .from('scheme_installments')
        .select('*')
        .eq('scheme_id', scheme.id);
      expect(installments?.length).toBe(12);

      // Verify Scheme Bonus
      const { data: bonuses } = await supabase.from('scheme_bonuses').select('*').eq('scheme_id', scheme.id);
      expect(bonuses?.length).toBe(1);

      // Verify Notification
      const { data: notifications } = await supabase.from('notifications').select('*').eq('customer_id', customerId);
      expect(notifications?.length).toBeGreaterThan(0);

      // Verify Audit Log Record
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', customerId)
        .eq('action', 'CREATE');
      expect(auditLogs?.length).toBeGreaterThan(0);
    } finally {
      if (customerId) {
        await deleteTestCustomer(customerId);
      }
    }
  });

  test('SEQ-02: Two customers created sequentially receive incremented numbers', async () => {
    const name1 = generateTestName();
    const mobile1 = generateTestMobile();
    const name2 = generateTestName();
    const mobile2 = generateTestMobile();
    const createdIds: string[] = [];

    try {
      const supabase = await getAuthenticatedAdminSupabaseClient();

      // Create Customer 1 via RPC
      const { data: data1, error: err1 } = await supabase.rpc('create_customer_with_scheme', {
        p_full_name: name1,
        p_phone_number: mobile1,
        p_city: 'Coimbatore',
        p_enroll_scheme: true,
      });
      expect(err1).toBeNull();
      if (data1?.customer_id) createdIds.push(data1.customer_id);
      const code1 = data1.customer_code as string;
      expect(code1).toMatch(/^RJ\d{4}-\d{3,}$/);

      // Create Customer 2 via RPC
      const { data: data2, error: err2 } = await supabase.rpc('create_customer_with_scheme', {
        p_full_name: name2,
        p_phone_number: mobile2,
        p_city: 'Coimbatore',
        p_enroll_scheme: true,
      });
      expect(err2).toBeNull();
      if (data2?.customer_id) createdIds.push(data2.customer_id);
      const code2 = data2.customer_code as string;
      expect(code2).toMatch(/^RJ\d{4}-\d{3,}$/);

      // Numbers must be different and strictly increasing
      expect(code1).not.toBe(code2);
      const num1 = parseInt(code1.split('-')[1], 10);
      const num2 = parseInt(code2.split('-')[1], 10);
      expect(num2).toBeGreaterThan(num1);
    } finally {
      await deleteTestCustomers(createdIds);
    }
  });

  test('SEQ-03: Concurrent customer creation produces unique sequence codes', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const createdIds: string[] = [];

    try {
      // Spawn 5 concurrent RPC calls with authenticated admin context
      const requests = Array.from({ length: 5 }, (_, i) =>
        supabase.rpc('create_customer_with_scheme', {
          p_full_name: `Concurrent Test User ${Date.now()}_${i}`,
          p_phone_number: generateTestMobile(),
          p_city: 'Coimbatore',
          p_enroll_scheme: true,
        })
      );

      const results = await Promise.all(requests);
      const codes: string[] = [];

      for (const res of results) {
        expect(res.error).toBeNull();
        expect(res.data?.customer_code).toBeDefined();
        if (res.data?.customer_id) {
          createdIds.push(res.data.customer_id);
        }
        if (res.data?.customer_code) {
          codes.push(res.data.customer_code);
        }
      }

      // Verify all 5 codes are unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(5);
    } finally {
      await deleteTestCustomers(createdIds);
    }
  });

  test('SEQ-04: Existing customer codes in database remain unchanged', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();

    // Query customers with old format RJ-2026-
    const { data: existingOldCustomers, error } = await supabase
      .from('customers')
      .select('customer_code')
      .like('customer_code', 'RJ-2026-%');

    // Existing old-format customers must still exist and remain untouched
    expect(error).toBeNull();
    expect(existingOldCustomers).not.toBeNull();
    expect(existingOldCustomers?.length).toBeGreaterThan(0);
    for (const c of existingOldCustomers!) {
      expect(c.customer_code).toMatch(/^RJ-2026-[A-F0-9]{6}$/);
    }
  });

  test('SEQ-05: Customer deletion does NOT cause sequence number to be reused', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    let nextCustomerId: string | null = null;

    try {
      // 1. Create a customer
      const tempName = generateTestName();
      const tempMobile = generateTestMobile();
      const { data: tempCust, error: createErr } = await supabase.rpc('create_customer_with_scheme', {
        p_full_name: tempName,
        p_phone_number: tempMobile,
        p_city: 'Coimbatore',
        p_enroll_scheme: false, // No payments/schemes so it can be safely deleted
      });
      expect(createErr).toBeNull();
      const deletedCode = tempCust.customer_code as string;
      const deletedNum = parseInt(deletedCode.split('-')[1], 10);

      // 2. Delete the customer
      const { data: delResult, error: delErr } = await supabase.rpc('delete_customer_account', {
        p_customer_id: tempCust.customer_id,
      });
      expect(delErr).toBeNull();
      expect(delResult?.success).toBe(true);

      // 3. Create next customer
      const nextName = generateTestName();
      const nextMobile = generateTestMobile();
      const { data: nextCust, error: nextErr } = await supabase.rpc('create_customer_with_scheme', {
        p_full_name: nextName,
        p_phone_number: nextMobile,
        p_city: 'Coimbatore',
        p_enroll_scheme: false,
      });
      expect(nextErr).toBeNull();
      nextCustomerId = nextCust.customer_id as string;
      const nextCode = nextCust.customer_code as string;
      const nextNum = parseInt(nextCode.split('-')[1], 10);

      // 4. Verify deleted number was NOT reused
      expect(nextCode).not.toBe(deletedCode);
      expect(nextNum).toBeGreaterThan(deletedNum);
    } finally {
      if (nextCustomerId) {
        await deleteTestCustomer(nextCustomerId);
      }
    }
  });
});

