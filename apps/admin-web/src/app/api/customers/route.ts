

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();
    const status = searchParams.get('status')?.trim();

    const supabase = getSupabase();

    // Direct database read from public.customers
    const { data: tblData, error: tblErr } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (tblErr) {
      console.error('[API /api/customers GET] Database query error:', tblErr);
      return NextResponse.json({ error: tblErr.message }, { status: 500 });
    }

    let filtered = tblData || [];

    if (status && status !== 'ALL') {
      filtered = filtered.filter((c: any) => c.status === status);
    }

    if (search) {
      filtered = filtered.filter((c: any) => {
        const matchName = c.full_name?.toLowerCase().includes(search);
        const matchMob = c.mobile_number?.includes(search);
        const matchNum = c.customer_number?.toLowerCase().includes(search);
        return matchName || matchMob || matchNum;
      });
    }

    return NextResponse.json({ success: true, customers: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      mobileNumber,
      email,
      address,
      city,
      pincode,
      nomineeName,
      nomineeRelationship,
      nomineeMobile,
      monthlyAmount = 1000,
    } = body;

    if (!fullName || !mobileNumber) {
      return NextResponse.json({ error: 'Full name and mobile number are required.' }, { status: 400 });
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    const supabase = getSupabase();

    // Table creation using real UUIDs
    const customerId = crypto.randomUUID();
    const countRes = await supabase.from('customers').select('id', { count: 'exact', head: true });
    const count = (countRes.count || 0) + 1;
    const customerNumber = `RJ-2026-${String(count).padStart(3, '0')}`;

    const newCustomerPayload = {
      id: customerId,
      customer_number: customerNumber,
      full_name: fullName.trim(),
      mobile_number: cleanMobile,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || 'Dindigul',
      pincode: pincode?.trim() || '624001',
      nominee_name: nomineeName?.trim() || null,
      nominee_relationship: nomineeRelationship?.trim() || null,
      nominee_mobile: nomineeMobile?.trim() || null,
      status: 'ACTIVE',
    };

    const { data: insertedCustomer, error: custErr } = await supabase
      .from('customers')
      .insert(newCustomerPayload)
      .select('*')
      .single();

    if (custErr || !insertedCustomer) {
      console.error('[API /api/customers POST] Direct insert error:', custErr);
      return NextResponse.json({ error: custErr?.message || 'Failed to create customer record.' }, { status: 400 });
    }

    // Create customer scheme enrollment
    const schemeId = crypto.randomUUID();
    const schemeAccountNumber = `RJ-SCH-005${String(count).padStart(4, '0')}`;
    const startDate = new Date().toISOString().split('T')[0];
    const maturityDateObj = new Date();
    maturityDateObj.setFullYear(maturityDateObj.getFullYear() + 1);
    const maturityDate = maturityDateObj.toISOString().split('T')[0];

    const newSchemePayload = {
      id: schemeId,
      customer_id: customerId,
      scheme_plan_id: '431b72d3-a044-47c1-b39a-5e428652975f',
      scheme_account_number: schemeAccountNumber,
      monthly_amount: Number(monthlyAmount),
      total_installments: 12,
      paid_installments_count: 0,
      total_amount_paid: 0,
      start_date: startDate,
      maturity_date: maturityDate,
      status: 'ACTIVE',
    };

    const { data: insertedScheme } = await supabase
      .from('customer_schemes')
      .insert(newSchemePayload)
      .select('*')
      .single();

    // Create 12 installments
    const installmentsPayload = [];
    const baseDate = new Date();
    for (let i = 1; i <= 12; i++) {
      const dueDateObj = new Date(baseDate);
      dueDateObj.setMonth(dueDateObj.getMonth() + (i - 1));
      installmentsPayload.push({
        id: crypto.randomUUID(),
        customer_scheme_id: schemeId,
        installment_number: i,
        due_date: dueDateObj.toISOString().split('T')[0],
        expected_amount: Number(monthlyAmount),
        due_amount: Number(monthlyAmount),
        paid_amount: 0,
        status: 'PENDING',
      });
    }

    await supabase.from('installments').insert(installmentsPayload);

    return NextResponse.json({
      success: true,
      customer: insertedCustomer,
      scheme: insertedScheme || newSchemePayload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
