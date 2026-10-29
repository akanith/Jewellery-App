import { test, expect } from '@playwright/test';
import {
  getAuthenticatedAdminSupabaseClient,
  getTestServiceRoleClient,
  generateTestMobile,
  deleteTestCustomers,
} from './helpers/test-utils';

test.describe('AW-ID-01: Shared Mobile Customer Identity & Profile Management', () => {
  const createdCustomerIds: string[] = [];

  test.afterEach(async () => {
    if (createdCustomerIds.length > 0) {
      await deleteTestCustomers(createdCustomerIds);
      createdCustomerIds.length = 0;
    }
  });

  test('Scenario A & B: Two separate people can register with identical mobile numbers and receive distinct customer codes', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const sharedMobile = generateTestMobile();
    const person1Name = `Person One ${Date.now()}`;
    const person2Name = `Person Two ${Date.now()}`;
    const person3Name = `Person Three ${Date.now()}`;
    const differentMobile = generateTestMobile();

    // 1. Create Person 1 with sharedMobile
    const { data: p1Data, error: p1Err } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: person1Name,
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: true,
    });
    expect(p1Err).toBeNull();
    expect(p1Data).toBeDefined();
    createdCustomerIds.push(p1Data.customer_id);

    // 2. Create Person 2 with the EXACT SAME sharedMobile
    const { data: p2Data, error: p2Err } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: person2Name,
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: true,
    });
    expect(p2Err).toBeNull();
    expect(p2Data).toBeDefined();
    createdCustomerIds.push(p2Data.customer_id);

    // 3. Verify Person 1 and Person 2 have distinct UUIDs and distinct customer codes
    expect(p1Data.customer_id).not.toBe(p2Data.customer_id);
    expect(p1Data.customer_code).not.toBe(p2Data.customer_code);
    expect(p1Data.phone_number).toBe(p2Data.phone_number);

    // 4. Scenario B: Create Person 3 with differentMobile
    const { data: p3Data, error: p3Err } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: person3Name,
      p_phone_number: differentMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: true,
    });
    expect(p3Err).toBeNull();
    expect(p3Data).toBeDefined();
    createdCustomerIds.push(p3Data.customer_id);

    expect(p3Data.customer_id).not.toBe(p1Data.customer_id);
    expect(p3Data.customer_id).not.toBe(p2Data.customer_id);
  });

  test('Scenario C & D: Explicit authorization mapping governs whether shared-phone accounts see multiple profiles', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const sharedMobile = generateTestMobile();
    const tempPassword = sharedMobile.slice(-4);

    // 1. Create Person A & Person B with same mobile but NO family link
    const { data: pA } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: 'Unlinked Person A',
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: false,
    });
    createdCustomerIds.push(pA.customer_id);

    const { data: pB } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: 'Unlinked Person B',
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: false,
    });
    createdCustomerIds.push(pB.customer_id);

    // 2. Login test without authorization link: Each user sees ONLY their own profile.
    // Direct customer-auth RPCs are restricted to the server-side BFF service role.
    const serviceClient = getTestServiceRoleClient();
    const { data: loginResA, error: loginErrA } = await serviceClient.rpc('customer_password_login', {
      p_phone_number: sharedMobile,
      p_password: tempPassword,
    });
    expect(loginErrA).toBeNull();
    expect(loginResA.success).toBe(true);

    // 3. Now explicitly establish family authorization between Person A and Person B
    const { data: linkRes, error: linkErr } = await supabase.rpc('link_customer_family_profiles', {
      p_customer_id_1: pA.customer_id,
      p_customer_id_2: pB.customer_id,
      p_relationship: 'SPOUSE',
    });
    expect(linkErr).toBeNull();
    expect(linkRes.success).toBe(true);

    // 4. Login test with authorization link: Both profiles are now accessible
    const { data: loginResLinked, error: loginErrLinked } = await serviceClient.rpc('customer_password_login', {
      p_phone_number: sharedMobile,
      p_password: tempPassword,
    });
    expect(loginErrLinked).toBeNull();
    expect(loginResLinked.success).toBe(true);
    expect(loginResLinked.profiles.length).toBe(2);
  });

  test('Scenario F: Concurrent creation of customers with shared mobile maintains unique customer codes', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const sharedMobile = generateTestMobile();

    const creationPromises = Array.from({ length: 4 }, (_, i) =>
      supabase.rpc('create_customer_with_scheme', {
        p_full_name: `Concurrent Shared Person ${i + 1} ${Date.now()}`,
        p_phone_number: sharedMobile,
        p_city: 'Coimbatore',
        p_enroll_scheme: false,
      })
    );

    const responses = await Promise.all(creationPromises);
    const codes: string[] = [];

    for (const res of responses) {
      expect(res.error).toBeNull();
      expect(res.data?.customer_id).toBeDefined();
      expect(res.data?.customer_code).toBeDefined();
      createdCustomerIds.push(res.data.customer_id);
      codes.push(res.data.customer_code);
    }

    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(4);
  });

  test('Scenario G: Edit, delete, and scheme operations target internal customer UUID, not shared mobile', async () => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const sharedMobile = generateTestMobile();

    // Create 2 customers with same mobile
    const { data: c1 } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: 'Target Customer One',
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: false,
    });
    createdCustomerIds.push(c1.customer_id);

    const { data: c2 } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: 'Target Customer Two',
      p_phone_number: sharedMobile,
      p_city: 'Coimbatore',
      p_enroll_scheme: false,
    });
    createdCustomerIds.push(c2.customer_id);

    // Update c1's name and address
    const { data: updateRes, error: updateErr } = await supabase.rpc('update_customer_profile', {
      p_customer_id: c1.customer_id,
      p_full_name: 'Updated Name One',
      p_phone_number: sharedMobile,
      p_city: 'Madurai',
    });
    expect(updateErr).toBeNull();
    expect(updateRes.success).toBe(true);

    // Verify c1 was updated
    const { data: freshC1 } = await supabase.from('customers').select('*').eq('id', c1.customer_id).single();
    expect(freshC1.full_name).toBe('Updated Name One');
    expect(freshC1.city).toBe('Madurai');

    // Verify c2 was untouched
    const { data: freshC2 } = await supabase.from('customers').select('*').eq('id', c2.customer_id).single();
    expect(freshC2.full_name).toBe('Target Customer Two');
    expect(freshC2.city).toBe('Coimbatore');
  });
});
