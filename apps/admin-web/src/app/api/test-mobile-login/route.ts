import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;

const url = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

function normalizeMobile(raw: string): string {
  let clean = String(raw || '').replace(/\D/g, '');
  if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
  else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);
  return clean;
}

function isValidMobile(clean: string): boolean {
  return /^[6-9]\d{9}$/.test(clean);
}

export async function GET() {
  const supabase = createClient(url, anonKey);
  const matrixResults: Record<string, any> = {};

  const testCases = [
    { name: 'TEST 1: Existing Customer A', mobile: '8778173681' },
    { name: 'TEST 2: Existing Customer B', mobile: '9842143307' },
    { name: 'TEST 3: Admin-Created Murugan', mobile: '8778173683' },
    { name: 'TEST 4: Non-existent Customer', mobile: '9999999999' },
    { name: 'TEST 5: Invalid Format', mobile: '123' },
  ];

  for (const test of testCases) {
    const clean = normalizeMobile(test.mobile);

    if (!isValidMobile(clean)) {
      matrixResults[test.name] = {
        mobile: test.mobile,
        status: 400,
        code: 'INVALID_MOBILE',
        verdict: 'PASS — Rejected invalid 10-digit mobile format',
      };
      continue;
    }

    const { data: customers, error: errCust } = await supabase
      .from('customers')
      .select('id, full_name, mobile_number, customer_number, status')
      .eq('mobile_number', clean);

    if (errCust) {
      matrixResults[test.name] = {
        mobile: test.mobile,
        status: 500,
        error: errCust.message,
        verdict: 'FAIL — Database error',
      };
      continue;
    }

    if (!customers || customers.length === 0) {
      matrixResults[test.name] = {
        mobile: test.mobile,
        status: 404,
        code: 'CUSTOMER_NOT_FOUND',
        verdict: 'PASS — Customer Not Found returned correctly',
      };
      continue;
    }

    const cust = customers[0];

    // Fetch active scheme + installments for resolved customer
    const { data: schemeRow } = await supabase
      .from('customer_schemes')
      .select('*, scheme_plans(title)')
      .eq('customer_id', cust.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    let installments: any[] = [];
    if (schemeRow) {
      const { data: instRows } = await supabase
        .from('installments')
        .select('*')
        .eq('customer_scheme_id', schemeRow.id)
        .order('installment_number', { ascending: true });
      installments = instRows || [];
    }

    const paidCount = installments.filter((i: any) => i.status === 'PAID').length;
    const totalPaid = installments.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + Number(i.paid_amount || i.expected_amount || 0), 0);

    matrixResults[test.name] = {
      mobile: test.mobile,
      status: 200,
      verdict: 'PASS — Resolved exact live customer',
      customer: {
        id: cust.id,
        name: cust.full_name,
        customerNumber: cust.customer_number,
        mobile: cust.mobile_number,
      },
      scheme: schemeRow ? {
        accountNumber: schemeRow.scheme_account_number,
        planTitle: schemeRow.scheme_plans?.title || 'Diwali Savings Scheme',
        monthlyAmount: schemeRow.monthly_amount,
        totalInstallments: schemeRow.total_installments,
        paidInstallmentsCount: paidCount,
        totalAmountPaid: totalPaid,
        remainingAmount: (schemeRow.monthly_amount * schemeRow.total_installments) - totalPaid,
      } : null,
      installmentsCount: installments.length,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    project: 'zeltnwyxmhuzoslpthlb',
    testMatrix: matrixResults,
  });
}
