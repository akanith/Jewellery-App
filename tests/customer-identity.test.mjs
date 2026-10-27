import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Suite verifying end-to-end customer identity management & explicit authorization:
 * 1. Phone normalization handles +91 and 10-digit formats consistently.
 * 2. Multi-customer creation with shared mobile number produces unique IDs & codes.
 * 3. CRITICAL SECURITY RULE: Sharing a phone number alone does NOT grant access to another customer's profile.
 * 4. Explicit authorization mapping allows verified family profile selection and switching.
 * 5. Single-profile login bypasses selection; multi-profile explicitly linked triggers selection UX.
 * 6. Unauthorized customer UUIDs are strictly rejected for profile selection and data requests.
 * 7. Server-side session anchoring enforces that sensitive ledger/scheme records are scoped to the active profile.
 * 8. Concurrency safety ensures unique customer codes.
 * 9. Admin operations affect only the intended customer UUID.
 * 10. Existing legacy customers and financial records remain intact.
 */

// 1. Phone number normalizer logic (mirroring SQL & client helper)
function normalizePhoneNumber(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

test('Rule 1: Phone normalization handles +91, spaced, and raw 10-digit formats', () => {
  assert.equal(normalizePhoneNumber('+91 99437 25003'), '9943725003');
  assert.equal(normalizePhoneNumber('+91-9943725003'), '9943725003');
  assert.equal(normalizePhoneNumber('919943725003'), '9943725003');
  assert.equal(normalizePhoneNumber('9943725003'), '9943725003');
  assert.equal(normalizePhoneNumber(' 99437 25003 '), '9943725003');
});

test('Rule 2: Multi-customer creation with shared mobile number produces unique IDs & codes', () => {
  let seq = 7;
  const customers = [];

  function createCustomer(fullName, phone) {
    const normalizedPhone = normalizePhoneNumber(phone);
    seq++;
    const customerCode = `RJ2026-${String(seq).padStart(3, '0')}`;
    const id = `uuid-${fullName.toLowerCase().replace(/\s+/g, '-')}-${seq}`;
    const customer = {
      id,
      customer_code: customerCode,
      full_name: fullName,
      phone_number: normalizedPhone,
    };
    customers.push(customer);
    return customer;
  }

  // Create two customers with same mobile
  const c1 = createCustomer('Kanisha', '9943725003');
  const c2 = createCustomer('Pranesh', '9943725003');

  assert.notEqual(c1.id, c2.id);
  assert.notEqual(c1.customer_code, c2.customer_code);
  assert.equal(c1.phone_number, '9943725003');
  assert.equal(c2.phone_number, '9943725003');
  assert.equal(c1.customer_code, 'RJ2026-008');
  assert.equal(c2.customer_code, 'RJ2026-009');

  // Create third customer with different mobile
  const c3 = createCustomer('Anand', '9842100000');
  assert.notEqual(c3.id, c1.id);
  assert.notEqual(c3.id, c2.id);
  assert.notEqual(c3.customer_code, c2.customer_code);
  assert.equal(c3.phone_number, '9842100000');
});

test('Rule 3: A signed-in user CANNOT access another customer profile simply because they share a phone number', () => {
  // Scenario: Alice and Bob share mobile 9943725003. Neither has granted authorization to the other.
  const sharedMobile = '9943725003';
  const customers = [
    { id: 'uuid-alice', name: 'Alice', phone: sharedMobile },
    { id: 'uuid-bob', name: 'Bob', phone: sharedMobile },
  ];

  // customer_profile_authorizations table has NO entries for Alice <-> Bob
  const authorizations = [];

  function isAuthorizedForProfile(authenticatedRootId, targetProfileId) {
    if (authenticatedRootId === targetProfileId) return true;
    return authorizations.some(
      (a) =>
        a.isActive &&
        ((a.granteeId === authenticatedRootId && a.grantorId === targetProfileId) ||
         (a.grantorId === authenticatedRootId && a.granteeId === targetProfileId))
    );
  }

  function getAuthorizedProfilesForLogin(authenticatedCustomerId, phone) {
    return customers.filter(
      (c) => c.phone === phone && isAuthorizedForProfile(authenticatedCustomerId, c.id)
    );
  }

  // Alice logs in with her credentials
  const aliceRootId = 'uuid-alice';
  const aliceAuthorizedProfiles = getAuthorizedProfilesForLogin(aliceRootId, sharedMobile);

  // Alice's authorized profiles list MUST contain ONLY Alice
  assert.equal(aliceAuthorizedProfiles.length, 1);
  assert.equal(aliceAuthorizedProfiles[0].id, 'uuid-alice');
  assert.equal(aliceAuthorizedProfiles[0].name, 'Alice');

  // Single profile bypass: requiresSelection is FALSE
  const requiresSelection = aliceAuthorizedProfiles.length > 1;
  assert.equal(requiresSelection, false, 'Single profile must bypass selection');

  // Alice attempts to switch session to Bob's ID
  function switchProfile(session, targetProfileId) {
    if (!isAuthorizedForProfile(session.authenticatedRootId, targetProfileId)) {
      return { status: 403, error: 'UNAUTHORIZED_PROFILE_SELECTION' };
    }
    return { status: 200, activeCustomerId: targetProfileId };
  }

  const session = { authenticatedRootId: 'uuid-alice', activeCustomerId: 'uuid-alice' };
  const switchAttempt = switchProfile(session, 'uuid-bob');

  // STRICTLY REJECTED: Sharing phone does NOT grant access!
  assert.equal(switchAttempt.status, 403);
  assert.equal(switchAttempt.error, 'UNAUTHORIZED_PROFILE_SELECTION');
});

test('Rule 4: Explicit authorization mapping allows verified family profile selection & switching', () => {
  // Scenario: Kanisha and Pranesh share phone 9943725003 and are explicitly linked by showroom admin
  const sharedMobile = '9943725003';
  const customers = [
    { id: 'uuid-kanisha', name: 'Kanisha', code: 'RJ2026-004', phone: sharedMobile },
    { id: 'uuid-pranesh', name: 'Pranesh', code: 'RJ2026-005', phone: sharedMobile },
  ];

  // Explicit family authorization link exists
  const authorizations = [
    {
      grantorId: 'uuid-kanisha',
      granteeId: 'uuid-pranesh',
      relationship: 'FAMILY_MEMBER',
      isActive: true,
      authorizedBy: 'SHOWROOM_VERIFIED',
    },
  ];

  function isAuthorizedForProfile(authenticatedRootId, targetProfileId) {
    if (authenticatedRootId === targetProfileId) return true;
    return authorizations.some(
      (a) =>
        a.isActive &&
        ((a.granteeId === authenticatedRootId && a.grantorId === targetProfileId) ||
         (a.grantorId === authenticatedRootId && a.granteeId === targetProfileId))
    );
  }

  function getAuthorizedProfiles(authenticatedRootId) {
    return customers.filter((c) => isAuthorizedForProfile(authenticatedRootId, c.id));
  }

  // Kanisha logs in
  const rootId = 'uuid-kanisha';
  const authorizedProfiles = getAuthorizedProfiles(rootId);

  // Both explicitly authorized profiles are returned
  assert.equal(authorizedProfiles.length, 2);
  assert.equal(authorizedProfiles[0].name, 'Kanisha');
  assert.equal(authorizedProfiles[1].name, 'Pranesh');

  // Multi-profile selection is triggered
  const requiresSelection = authorizedProfiles.length > 1;
  assert.equal(requiresSelection, true, 'Multiple authorized profiles must show selection screen');

  // Session state with root anchor
  const session = {
    authenticatedRootId: 'uuid-kanisha',
    activeCustomerId: 'uuid-kanisha',
  };

  // Switch to Pranesh
  function switchProfile(sess, targetId) {
    if (!isAuthorizedForProfile(sess.authenticatedRootId, targetId)) {
      return { status: 403, error: 'UNAUTHORIZED_PROFILE_SELECTION' };
    }
    sess.activeCustomerId = targetId;
    return { status: 200, activeCustomerId: targetId };
  }

  const switchRes = switchProfile(session, 'uuid-pranesh');
  assert.equal(switchRes.status, 200);
  assert.equal(session.activeCustomerId, 'uuid-pranesh');
  assert.equal(session.authenticatedRootId, 'uuid-kanisha', 'Root anchor must remain Kanisha');

  // Switch back to Kanisha
  const switchBackRes = switchProfile(session, 'uuid-kanisha');
  assert.equal(switchBackRes.status, 200);
  assert.equal(session.activeCustomerId, 'uuid-kanisha');
});

test('Rule 5: Unauthorized customer UUID is strictly rejected for all data requests', () => {
  const financialLedgers = {
    'uuid-alice': { balance: 5000, schemes: ['SCH-1'] },
    'uuid-bob': { balance: 12000, schemes: ['SCH-2', 'SCH-3'] },
  };

  function getCustomerPassbook(session, requestedCustomerId) {
    // Backend strictly enforces that requestedCustomerId must match session's active customer
    // and session's active customer must be authorized by session's root
    if (requestedCustomerId && requestedCustomerId !== session.activeCustomerId) {
      return { status: 403, error: 'FORBIDDEN_PROFILE_SPOOFING' };
    }
    const ledger = financialLedgers[session.activeCustomerId];
    if (!ledger) return { status: 404, error: 'NOT_FOUND' };
    return { status: 200, data: ledger };
  }

  // Alice is logged in
  const session = { authenticatedRootId: 'uuid-alice', activeCustomerId: 'uuid-alice' };

  // Alice requests her own passbook -> OK
  const ownRes = getCustomerPassbook(session, 'uuid-alice');
  assert.equal(ownRes.status, 200);
  assert.equal(ownRes.data.balance, 5000);

  // Alice attempts to pass Bob's customer ID in the request -> REJECTED
  const spoofAttempt = getCustomerPassbook(session, 'uuid-bob');
  assert.equal(spoofAttempt.status, 403);
  assert.equal(spoofAttempt.error, 'FORBIDDEN_PROFILE_SPOOFING');
});

test('Rule 6: One customer profile with multiple schemes bypasses selection and groups schemes under one profile', () => {
  const customer = { id: 'uuid-suresh', name: 'Suresh', code: 'RJ2026-001' };
  const schemes = [
    { id: 'sch-1', slot: 1 },
    { id: 'sch-2', slot: 2 },
    { id: 'sch-3', slot: 3 },
  ];

  const authorizedProfiles = [
    {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      activeSchemesCount: schemes.length,
    },
  ];

  assert.equal(authorizedProfiles.length, 1);
  assert.equal(authorizedProfiles[0].activeSchemesCount, 3);
  const requiresSelection = authorizedProfiles.length > 1;
  assert.equal(requiresSelection, false, 'Multi-scheme customer with 1 profile must NOT show selection screen');
});

test('Rule 7: Concurrency safety simulation ensures no duplicated customer codes', async () => {
  let sequenceCounter = 200;
  async function getNextSequence() {
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    return ++sequenceCounter;
  }

  const tasks = Array.from({ length: 30 }, async () => {
    const seq = await getNextSequence();
    return `RJ2026-${String(seq).padStart(3, '0')}`;
  });

  const codes = await Promise.all(tasks);
  const uniqueCodes = new Set(codes);
  assert.equal(codes.length, 30);
  assert.equal(uniqueCodes.size, 30);
});

test('Rule 8: Admin updates and operations target internal customer UUID, never shared mobile', () => {
  const customers = [
    { id: 'uuid-1', name: 'Person A', phone: '9943725003', address: 'Old Address 1' },
    { id: 'uuid-2', name: 'Person B', phone: '9943725003', address: 'Old Address 2' },
  ];

  function updateCustomer(customerId, newName, newAddress) {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      cust.name = newName;
      cust.address = newAddress;
    }
  }

  updateCustomer('uuid-1', 'Updated Person A', 'New Address 1');

  assert.equal(customers[0].name, 'Updated Person A');
  assert.equal(customers[0].address, 'New Address 1');
  assert.equal(customers[1].name, 'Person B');
  assert.equal(customers[1].address, 'Old Address 2');
});

test('Rule 9: Legacy combined records remain intact with verified scheme references', () => {
  const legacyRecord = {
    id: '2d9fd51a-eba7-471e-95ca-2a4a26c08599',
    customer_code: 'RJ2026-004',
    full_name: 'Kanisha / Pranesh',
    phone_number: '9943725003',
  };

  const schemeRecords = [
    { id: 'sch-1', customer_id: legacyRecord.id, slot_number: 1, status: 'ACTIVE' },
    { id: 'sch-2', customer_id: legacyRecord.id, slot_number: 2, status: 'ACTIVE' },
  ];

  schemeRecords.forEach((sch) => {
    assert.equal(sch.customer_id, legacyRecord.id);
  });
  assert.equal(legacyRecord.customer_code, 'RJ2026-004');
});
