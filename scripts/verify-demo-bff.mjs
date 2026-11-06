import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const BFF_URL = 'http://127.0.0.1:54321/functions/v1/customer-bff';

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  );
}

function createSessionForCustomer(customerId, rootId = customerId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  
  const sql = `
    SELECT public.create_customer_session(
      '${customerId}'::uuid,
      '${tokenHash}',
      (now() + INTERVAL '30 days')::timestamptz,
      '${rootId}'::uuid
    );
  `;
  runSql(sql);
  return rawToken;
}

async function verifyCustomer(name, customerId, rootId) {
  const token = createSessionForCustomer(customerId, rootId);

  const dashRes = await fetch(`${BFF_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dashJson = await dashRes.json();

  const passRes = await fetch(`${BFF_URL}/passbook`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const passJson = await passRes.json();

  console.log(`\n========================================`);
  console.log(`VERIFICATION: ${name} (${customerId})`);
  console.log(`========================================`);
  console.log(`HTTP Status: Dashboard=${dashRes.status}, Passbook=${passRes.status}`);
  console.log(`Dashboard customerName:`, dashJson.data?.customerName, `(Code: ${dashJson.data?.customerCode})`);
  console.log(`Dashboard schemeId:`, dashJson.data?.scheme?.schemeId);
  console.log(`Dashboard monthlyAmount:`, dashJson.data?.scheme?.monthlyInstallmentAmount);
  console.log(`Dashboard paidCount:`, dashJson.data?.scheme?.paidInstallments, `/`, dashJson.data?.scheme?.totalInstallments);
  console.log(`Dashboard currentInstallment:`, dashJson.data?.currentInstallment);
  console.log(`Dashboard onlinePaymentConfigured:`, dashJson.data?.onlinePaymentConfigured);
  console.log(`Passbook schemeId:`, passJson.data?.schemeId);
  console.log(`Passbook totalInstallments:`, passJson.data?.installments?.length);
  console.log(`Passbook onlinePaymentConfigured:`, passJson.data?.onlinePaymentConfigured);
  if (passJson.data?.installments?.length > 0) {
    const first = passJson.data.installments[0];
    const last = passJson.data.installments[passJson.data.installments.length - 1];
    console.log(`First installment: #${first.installmentNumber} (${first.calendarMonth}), Due: ${first.dueDateFormatted}, Amount: ₹${first.installmentAmount}, Status: ${first.status}`);
    console.log(`Last installment: #${last.installmentNumber} (${last.calendarMonth}), Due: ${last.dueDateFormatted}, Amount: ₹${last.installmentAmount}, Status: ${last.status}`);
  }
}

async function run() {
  await verifyCustomer(
    'Demo Primary Customer (RJ2026-DEMO-001)',
    'dd000000-0000-0000-0000-000000000001',
    'dd000000-0000-0000-0000-000000000001'
  );

  await verifyCustomer(
    'Demo Family Member (RJ2026-DEMO-002)',
    'dd000000-0000-0000-0000-000000000002',
    'dd000000-0000-0000-0000-000000000001' // Shared phone family root
  );

  await verifyCustomer(
    'Demo Solo Customer (RJ2026-DEMO-003)',
    'dd000000-0000-0000-0000-000000000003',
    'dd000000-0000-0000-0000-000000000003'
  );
}

run().catch(console.error);
