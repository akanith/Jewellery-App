import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { buildPassbookHtml } from '../customer-app/src/services/passbookHtmlBuilder.ts';

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';
const DEMO_PHONE = '9800033333';
const DEMO_PASSWORD = 'PassbookDemo@2026';
const DEMO_CUST_ID = 'dd000000-0000-0000-0000-000000000012';
const DEMO_SCHEME_ID = 'ee000000-0000-0000-0000-000000000012';

console.log('--- STARTING DEMO ACCOUNT VERIFICATION ---');

// 1. Check database records
const dbStats = JSON.parse(
  execSync(
    `docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -t -q -c "SELECT json_build_object('cust', (SELECT count(*) FROM public.customers WHERE id = '${DEMO_CUST_ID}'), 'schemes', (SELECT count(*) FROM public.schemes WHERE id = '${DEMO_SCHEME_ID}'), 'installments', (SELECT count(*) FROM public.scheme_installments WHERE scheme_id = '${DEMO_SCHEME_ID}' AND status = 'PAID'), 'payments', (SELECT count(*) FROM public.payments WHERE scheme_id = '${DEMO_SCHEME_ID}' AND payment_status = 'SUCCESS'))::text;"`,
    { encoding: 'utf-8' }
  ).trim()
);

console.log('Database verification stats:', dbStats);
assert.equal(dbStats.cust, 1, 'Customer record must exist');
assert.equal(dbStats.schemes, 1, 'Scheme record must exist');
assert.equal(dbStats.installments, 12, 'Must have 12 paid installments');
assert.equal(dbStats.payments, 12, 'Must have 12 successful canonical payments');

// 2. Authenticate through Customer BFF
const loginRes = await fetch(`${BFF_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mobileNumber: DEMO_PHONE,
    password: DEMO_PASSWORD,
  }),
});

assert.equal(loginRes.status, 200, 'Login must succeed with 200 OK');
const loginData = await loginRes.json();
assert.equal(loginData.success, true);
assert.ok(loginData.token, 'Must return session token');
const token = loginData.token;
console.log('✔ 1. Login via Customer BFF succeeded');

// 3. Fetch Passbook via Customer BFF
const passbookRes = await fetch(`${BFF_URL}/passbook?schemeId=${DEMO_SCHEME_ID}`, {
  headers: { Authorization: `Bearer ${token}` },
});

assert.equal(passbookRes.status, 200, 'Passbook fetch must succeed with 200 OK');
const passbookData = await passbookRes.json();
assert.equal(passbookData.success, true);
assert.equal(passbookData.data.installments.length, 12, 'Must return exactly 12 installments');
assert.equal(
  passbookData.data.installments.filter((i) => i.status === 'PAID').length,
  12,
  'All 12 installments must have status PAID'
);
console.log('✔ 2. Passbook endpoint returns 12/12 verified paid installments');

// 4. Fetch Passbook Export Data via Customer BFF
const exportRes = await fetch(`${BFF_URL}/passbook/export?schemeId=${DEMO_SCHEME_ID}`, {
  headers: { Authorization: `Bearer ${token}` },
});

assert.equal(exportRes.status, 200, 'Passbook export endpoint must allow 12/12 completed scheme');
const exportData = await exportRes.json();
assert.equal(exportData.success, true);
assert.equal(exportData.data.scheme.schemeId, DEMO_SCHEME_ID);
assert.equal(exportData.data.scheme.totalInstallments, 12);
assert.equal(exportData.data.scheme.paidInstallments, 12);
assert.equal(exportData.data.scheme.totalPaidAmount, 12000);
assert.equal(exportData.data.scheme.bonusAmount, 1000);
assert.equal(exportData.data.scheme.maturityAmount, 13000);
assert.equal(exportData.data.installments.length, 12);
console.log('✔ 3. Passbook export endpoint allowed with 200 and verified ledger data');

// 5. Test Passbook HTML generation with synthetic demo marker
const htmlEn = buildPassbookHtml(exportData.data, 'en');
assert.ok(htmlEn.includes('SYNTHETIC DEMO TEST DATA'), 'Must include synthetic demo warning banner');
assert.ok(htmlEn.includes('DEMO — COMPLETED PASSBOOK TEST'), 'Must include customer name');
assert.ok(htmlEn.includes('RJ-SCH-DEMO-COMPL'), 'Must include scheme code');
assert.ok(htmlEn.includes('DEMO-REC-COMP-12'), 'Must include receipt number');
console.log('✔ 4. HTML generation includes prominent synthetic demo notice in English');

const htmlTa = buildPassbookHtml(exportData.data, 'ta');
assert.ok(htmlTa.includes('மாதிரி டெமோ சோதனை தரவு'), 'Must include Tamil synthetic demo warning');
assert.ok(htmlTa.includes('Noto Sans Tamil'), 'Must include Noto Sans Tamil font');
console.log('✔ 5. HTML generation includes Tamil synthetic demo notice and Noto Sans Tamil');

// 6. Test that an incomplete scheme is rejected
const foreignRes = await fetch(`${BFF_URL}/passbook/export?schemeId=ee000000-0000-0000-0000-000000000001`, {
  headers: { Authorization: `Bearer ${token}` },
});
assert.equal(foreignRes.status, 404, 'Foreign scheme access must be denied with 404');
console.log('✔ 6. Foreign scheme access correctly denied with 404');

console.log('--- ALL DEMO ACCOUNT CHECKS PASSED SUCCESSFULLY ---');
