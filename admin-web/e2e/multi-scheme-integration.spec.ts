import { test, expect } from '@playwright/test';
import {
  getAuthenticatedAdminSupabaseClient,
  generateTestMobile,
  generateTestName,
  deleteTestCustomer,
  cancelTestSchemeForTesting,
} from './helpers/test-utils';

test.describe('AW-MS-01: Multi-Scheme Five-Slot Architecture & Record Installment E2E', () => {
  let createdCustomerId: string | null = null;

  test.afterEach(async () => {
    if (createdCustomerId) {
      await deleteTestCustomer(createdCustomerId);
      createdCustomerId = null;
    }
  });

  test('validates 5-slot allocation, lowest-free-slot recovery, 6th-enrollment rejection, and payment isolation', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    const now = new Date();
    const startMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. Create fresh customer with initial scheme (Slot #1)
    const { data: createData, error: createErr } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: testName,
      p_phone_number: testMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: true,
      p_start_month: startMonthStr,
    });

    expect(createErr).toBeNull();
    expect(createData).toBeDefined();
    createdCustomerId = createData.customer_id;
    const scheme1Id = createData.scheme_id;

    // Verify Scheme 1 has slot_number = 1
    const { data: s1Data, error: s1Err } = await supabase
      .from('schemes')
      .select('id, slot_number, status')
      .eq('id', scheme1Id)
      .single();
    expect(s1Err).toBeNull();
    expect(s1Data!.slot_number).toBe(1);

    // 2. Enroll Second Scheme (Should allocate Slot #2)
    const { data: s2EnrollData, error: s2EnrollErr } = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
      p_notes: 'Enrolled scheme #2',
    });
    expect(s2EnrollErr).toBeNull();
    expect(s2EnrollData.slot_number).toBe(2);
    const scheme2Id = s2EnrollData.scheme_id;

    // 3. Enroll Schemes in Slots 3, 4, 5
    const slot3Res = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(slot3Res.error).toBeNull();
    expect(slot3Res.data.slot_number).toBe(3);
    const scheme3Id = slot3Res.data.scheme_id;

    const slot4Res = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(slot4Res.error).toBeNull();
    expect(slot4Res.data.slot_number).toBe(4);

    const slot5Res = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(slot5Res.error).toBeNull();
    expect(slot5Res.data.slot_number).toBe(5);

    // 4. Attempt to enroll 6th open scheme (MUST be rejected)
    const slot6Res = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(slot6Res.error).not.toBeNull();
    expect(slot6Res.error?.message).toMatch(/maximum 5 active schemes/i);

    // 5. Lowest-Free-Slot Recovery: Cancel Scheme in Slot #3
    // 5a. Authorization Behavior: Verify authenticated admin is forbidden from direct table UPDATE on public.schemes (RLS Defense-in-Depth)
    const { error: directUpdateErr } = await supabase
      .from('schemes')
      .update({ status: 'CANCELLED' })
      .eq('id', scheme3Id);
    expect(directUpdateErr).not.toBeNull();
    expect(directUpdateErr?.code).toBe('42501');

    // 5b. Transition Scheme #3 to CANCELLED via trusted test-fixture helper (isolated test environment only)
    await cancelTestSchemeForTesting(scheme3Id);

    // 5c. Verify Scheme #3 is now CANCELLED in DB and retains its original slot_number (3)
    const { data: s3CancelledData, error: s3CancelledErr } = await supabase
      .from('schemes')
      .select('id, slot_number, status')
      .eq('id', scheme3Id)
      .single();
    expect(s3CancelledErr).toBeNull();
    expect(s3CancelledData!.status).toBe('CANCELLED');
    expect(s3CancelledData!.slot_number).toBe(3);

    // 5d. Re-enroll: Must reclaim freed lowest Slot #3!
    const reclaimedRes = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(reclaimedRes.error).toBeNull();
    expect(reclaimedRes.data.slot_number).toBe(3);
    expect(reclaimedRes.data.scheme_id).not.toBe(scheme3Id);

    // 5e. Re-verify 6th-enrollment rejection (all 5 slots are now occupied again: 1, 2, 4, 5, and reclaimed 3)
    const slot6RetryRes = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: createdCustomerId,
      p_start_month: startMonthStr,
    });
    expect(slot6RetryRes.error).not.toBeNull();
    expect(slot6RetryRes.error?.message).toMatch(/maximum 5 active schemes/i);

    // 6. Record Installment Payment against Scheme 2 (Slot #2)
    const { data: payData, error: payErr } = await supabase.rpc('record_installment_payment', {
      p_scheme_id: scheme2Id,
      p_installment_number: 1,
      p_payment_method: 'CASH',
      p_transaction_reference: 'E2E-LOCAL-001',
    });
    expect(payErr).toBeNull();
    expect(payData.receipt_number).toMatch(/RJ-RCP-/);

    // 7. Verify Passbook & Payment Isolation (Zero Cross-Contamination)
    const { data: s2Inst1 } = await supabase
      .from('scheme_installments')
      .select('status, paid_amount')
      .eq('scheme_id', scheme2Id)
      .eq('installment_number', 1)
      .single();
    expect(s2Inst1!.status).toBe('PAID');
    expect(Number(s2Inst1!.paid_amount)).toBe(1000);

    const { data: s1Inst1 } = await supabase
      .from('scheme_installments')
      .select('status, paid_amount')
      .eq('scheme_id', scheme1Id)
      .eq('installment_number', 1)
      .single();
    expect(s1Inst1!.status).toBe('PENDING');
    expect(Number(s1Inst1!.paid_amount)).toBe(0);

    // Verify Scheme 2 has 1 payment and Scheme 1 has 0 payments
    const { data: s2Pays } = await supabase.from('payments').select('id').eq('scheme_id', scheme2Id);
    const { data: s1Pays } = await supabase.from('payments').select('id').eq('scheme_id', scheme1Id);
    expect(s2Pays!.length).toBe(1);
    expect(s1Pays!.length).toBe(0);
  });
});
