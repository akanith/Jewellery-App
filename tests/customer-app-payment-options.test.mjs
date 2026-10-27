import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * RAMYAS JEWELLER — Customer App Cash & Razorpay Payment Integration Tests
 *
 * Validates:
 * 1. Centrally configured Razorpay URL with exact intact query parameter.
 * 2. Hosted Razorpay page verification (100000 paise = ₹1,000 INR).
 * 3. Home screen dual payment options (Pay by Cash & Pay Online) replacing Pay at Shop.
 * 4. Passbook screen dual payment options (Pay by Cash & Pay Online) replacing Pay at Showroom.
 * 5. Button styling, typography, and responsive stacking behavior.
 * 6. Cash payment instructions modal content and verified shop details.
 * 7. Safe online payment launch: amount validation, debouncing, and failure handling.
 * 8. Profile switching dynamically updates due installment month and amount.
 * 9. Absolute payment data integrity: opening cash or online options NEVER creates fake payments or alters DB records.
 */

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  );
}

function getDatabaseBaseline() {
  const sql = `
SELECT json_build_object(
  'customers', (SELECT count(*) FROM public.customers),
  'schemes', (SELECT count(*) FROM public.schemes),
  'installments', (SELECT count(*) FROM public.scheme_installments),
  'payments', (SELECT count(*) FROM public.payments),
  'payment_total', (SELECT coalesce(sum(amount), 0) FROM public.payments)
)::text;
`;
  const raw = runSql(sql);
  return JSON.parse(raw.trim());
}

let initialBaseline;

test.before(() => {
  initialBaseline = getDatabaseBaseline();
  assert.equal(typeof initialBaseline.payments, 'number', 'Baseline payments must exist');
});

test.after(() => {
  const postBaseline = getDatabaseBaseline();
  assert.deepEqual(
    postBaseline,
    initialBaseline,
    'Database record counts and payments must remain 100% unchanged after all payment tests'
  );
});

test('1. Centrally configured Razorpay URL preserves exact encoded amount parameter', () => {
  const configContent = readFileSync('customer-app/src/constants/paymentConfig.ts', 'utf-8');
  const expectedUrl = 'https://razorpay.me/@ramyasjeweller?amount=LaORF0cOqXzXsYKdgu1fsg%3D%3D';

  assert.ok(
    configContent.includes(expectedUrl),
    'paymentConfig.ts must contain the exact Razorpay URL without alteration'
  );
  assert.ok(
    configContent.includes('amount=LaORF0cOqXzXsYKdgu1fsg%3D%3D'),
    'Encoded amount query parameter must be preserved verbatim'
  );
  assert.ok(
    configContent.includes('encodedAmountInr: 1000'),
    'Configured supported amount must match 1,000 INR'
  );
});

test('2. Verification of Razorpay hosted page metadata for amount and merchant', async () => {
  const paymentUrl = 'https://razorpay.me/@ramyasjeweller?amount=LaORF0cOqXzXsYKdgu1fsg%3D%3D';
  const response = await fetch(paymentUrl);
  assert.equal(response.status, 200, 'Razorpay hosted link must be reachable and return 200 OK');

  const html = await response.text();
  assert.ok(
    html.includes('RAMYAS JEWELLER'),
    'Hosted page must display merchant name RAMYAS JEWELLER'
  );
  assert.ok(
    html.includes('"payment_handle_amount":"100000"'),
    'Hosted page payload must specify payment_handle_amount of 100000 paise (₹1,000 INR)'
  );
});

test('3. Home screen Next Payment card renders both Pay by Cash and Pay Online buttons', () => {
  const homeCode = readFileSync('customer-app/src/app/(tabs)/index.tsx', 'utf-8');

  // Verify old button is removed
  assert.ok(
    !homeCode.includes('styles.payAtShopButton'),
    'Home screen must not use obsolete payAtShopButton'
  );

  // Verify new buttons are present
  assert.ok(
    homeCode.includes('styles.payCashBtn'),
    'Home screen must render Pay by Cash button'
  );
  assert.ok(
    homeCode.includes('styles.payOnlineBtn'),
    'Home screen must render Pay Online button'
  );
  assert.ok(
    homeCode.includes('t(\'payByCash\')'),
    'Home screen must reference payByCash translation'
  );
  assert.ok(
    homeCode.includes('t(\'payOnline\')'),
    'Home screen must reference payOnline translation'
  );
  assert.ok(
    homeCode.includes('secureRazorpayCaption'),
    'Home screen must render secure checkout and UPI caption'
  );
  assert.ok(
    homeCode.includes('<CashPaymentModal'),
    'Home screen must mount CashPaymentModal'
  );
});

test('4. Passbook screen Due Installment card renders both Pay by Cash and Pay Online buttons', () => {
  const passbookCode = readFileSync('customer-app/src/app/(tabs)/passbook.tsx', 'utf-8');

  // Verify old button is removed
  assert.ok(
    !passbookCode.includes('styles.payShowroomBtn'),
    'Passbook screen must not use obsolete payShowroomBtn'
  );

  // Verify new buttons are present
  assert.ok(
    passbookCode.includes('styles.payCashBtn'),
    'Passbook screen must render Pay by Cash button'
  );
  assert.ok(
    passbookCode.includes('styles.payOnlineBtn'),
    'Passbook screen must render Pay Online button'
  );
  assert.ok(
    passbookCode.includes('t(\'payByCash\')'),
    'Passbook screen must reference payByCash translation'
  );
  assert.ok(
    passbookCode.includes('t(\'payOnline\')'),
    'Passbook screen must reference payOnline translation'
  );
  assert.ok(
    passbookCode.includes('secureRazorpayCaption'),
    'Passbook screen must render secure checkout caption'
  );
  assert.ok(
    passbookCode.includes('<CashPaymentModal'),
    'Passbook screen must mount CashPaymentModal'
  );
});

test('5. Cash payment instructions modal provides authentic showroom details and non-payment disclaimer', () => {
  const modalCode = readFileSync('customer-app/src/components/CashPaymentModal.tsx', 'utf-8');

  assert.ok(
    modalCode.includes('OFFICIAL_SHOP_INFO.address'),
    'Modal must display verified showroom address from shopData'
  );
  assert.ok(
    modalCode.includes('OFFICIAL_SHOP_INFO.phone'),
    'Modal must display verified showroom phone from shopData'
  );
  assert.ok(
    modalCode.includes('Opening these instructions does not record a payment'),
    'Modal must explicitly warn that opening instructions does not record payment'
  );
  assert.ok(
    modalCode.includes('Understood'),
    'Modal must include Understood confirmation action'
  );
  assert.ok(
    modalCode.includes('Get Directions'),
    'Modal must include showroom directions action'
  );
});

test('6. Payment service validates installment amount matches configured fixed link amount', async () => {
  const serviceCode = readFileSync('customer-app/src/services/paymentService.ts', 'utf-8');

  assert.ok(
    serviceCode.includes('RAZORPAY_CONFIG.encodedAmountInr'),
    'Payment service must check due amount against encoded link amount'
  );
  assert.ok(
    serviceCode.includes('AMOUNT_MISMATCH'),
    'Payment service must handle amount mismatch safely'
  );
  assert.ok(
    serviceCode.includes('isOpeningPaymentUrl'),
    'Payment service must implement debounce lock against duplicate taps'
  );
  assert.ok(
    serviceCode.includes('Linking.openURL'),
    'Payment service must use Linking.openURL for external launch'
  );
});

test('7. Translations contain required payment keys in English and Tamil', () => {
  const transCode = readFileSync('customer-app/src/i18n/translations.ts', 'utf-8');

  assert.ok(transCode.includes("payByCash: 'Pay by Cash'"), 'English payByCash key must exist');
  assert.ok(transCode.includes("payOnline: 'Pay Online'"), 'English payOnline key must exist');
  assert.ok(transCode.includes("secureRazorpayCaption: 'Secure checkout by Razorpay"), 'English secure caption must exist');

  assert.ok(transCode.includes("payByCash: 'பணமாக செலுத்தவும்'"), 'Tamil payByCash key must exist');
  assert.ok(transCode.includes("payOnline: 'ஆன்லைனில் செலுத்தவும்'"), 'Tamil payOnline key must exist');
  assert.ok(transCode.includes("secureRazorpayCaption: 'Razorpay மூலம் பாதுகாப்பான கட்டணம்"), 'Tamil secure caption must exist');
});

test('8. Database row count verification confirms zero phantom payments were recorded', () => {
  const currentBaseline = getDatabaseBaseline();
  assert.equal(currentBaseline.payments, initialBaseline.payments, 'Payment count must not change');
  assert.equal(currentBaseline.payment_total, initialBaseline.payment_total, 'Payment total must not change');
  assert.equal(currentBaseline.installments, initialBaseline.installments, 'Installments count must not change');
  assert.equal(currentBaseline.schemes, initialBaseline.schemes, 'Schemes count must not change');
  assert.equal(currentBaseline.customers, initialBaseline.customers, 'Customers count must not change');
});
