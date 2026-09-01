import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}

function normalizeMobile(raw: string): string {
  let clean = String(raw || '').replace(/\D/g, '');
  if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
  else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);
  return clean;
}

function isValidMobile(clean: string): boolean {
  return /^[6-9]\d{9}$/.test(clean);
}

// Pure PostgreSQL database resolution by mobile number
async function resolveCustomerData(mobile: string) {
  const cleanMobile = normalizeMobile(mobile);

  if (!cleanMobile || !isValidMobile(cleanMobile)) {
    return {
      success: false,
      code: 'INVALID_MOBILE',
      message: 'Enter a valid 10-digit mobile number.',
      status: 400,
    };
  }

  try {
    const client = createClient(url, anonKey);

    // 1. Direct database lookup in public.customers
    const { data: dbCust, error: custErr } = await client
      .from('customers')
      .select('id, full_name, mobile_number, customer_number, status')
      .eq('mobile_number', cleanMobile)
      .maybeSingle();

    if (custErr) {
      console.error('[CustomerAPI] DB lookup error:', custErr.message);
      return {
        success: false,
        code: 'SERVER_ERROR',
        message: 'Unable to connect. Please try again.',
        status: 500,
      };
    }

    if (!dbCust) {
      return {
        success: false,
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found. Please contact Ramyas Jeweller.',
        status: 404,
      };
    }

    // 2. Query active scheme for resolved customer
    const { data: schemeRow } = await client
      .from('customer_schemes')
      .select('*, scheme_plans(title)')
      .eq('customer_id', dbCust.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .maybeSingle();

    let installments: any[] = [];
    if (schemeRow) {
      const { data: instRows } = await client
        .from('installments')
        .select('*')
        .eq('customer_scheme_id', schemeRow.id)
        .order('installment_number', { ascending: true });

      installments = instRows || [];
    }

    const schemeObj = schemeRow
      ? {
          ...schemeRow,
          scheme_plan_title: schemeRow.scheme_plans?.title || 'Diwali Savings Scheme',
        }
      : null;

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      success: true,
      status: 200,
      customer: {
        id: dbCust.id,
        full_name: dbCust.full_name,
        mobile_number: dbCust.mobile_number,
        customer_number: dbCust.customer_number || dbCust.id,
        status: dbCust.status || 'ACTIVE',
      },
      session: {
        token: `c_sess_${dbCust.id}_${Date.now()}`,
        customerId: dbCust.id,
        customerNumber: dbCust.customer_number || dbCust.id,
        fullName: dbCust.full_name || 'Valued Customer',
        mobileNumber: dbCust.mobile_number,
        issuedAt,
        expiresAt,
      },
      scheme: schemeObj,
      installments,
    };
  } catch (err: any) {
    console.error('[CustomerAPI] Resolution exception:', err?.message);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: 'Unable to connect. Please try again.',
      status: 500,
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile') || '';
  const data = await resolveCustomerData(mobile);
  return NextResponse.json(data, {
    status: data.status || (data.success ? 200 : 400),
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawMobile = body.mobile_number || body.mobile || '';
    const data = await resolveCustomerData(rawMobile);
    return NextResponse.json(data, {
      status: data.status || (data.success ? 200 : 400),
      headers: corsHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        code: 'SERVER_ERROR',
        message: 'Unable to connect. Please try again.',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
