import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    let targetCustomer: any = null;

    // 1. Direct table lookup by UUID, customer_number, or mobile_number
    const isMobile = /^[6-9]\d{9}$/.test(id.replace(/\D/g, ''));
    if (isMobile) {
      const cleanMob = id.replace(/\D/g, '').slice(-10);
      const { data: custByMob } = await supabase
        .from('customers')
        .select('*')
        .eq('mobile_number', cleanMob)
        .maybeSingle();

      if (custByMob) {
        targetCustomer = custByMob;
      } else {
        const custRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_by_mobile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ p_mobile: cleanMob }),
          cache: 'no-store',
        }).then(r => r.json());

        if (Array.isArray(custRes) && custRes.length > 0) {
          targetCustomer = custRes[0];
        }
      }
    } else {
      const { data: custById } = await supabase
        .from('customers')
        .select('*')
        .or(`id.eq.${id},customer_number.eq.${id}`)
        .maybeSingle();

      if (custById) {
        targetCustomer = custById;
      } else {
        // Check if ID matches a customer_scheme ID
        const { data: schemeRow } = await supabase
          .from('customer_schemes')
          .select('customer_id')
          .eq('id', id)
          .maybeSingle();

        if (schemeRow?.customer_id) {
          const { data: linkedCust } = await supabase
            .from('customers')
            .select('*')
            .eq('id', schemeRow.customer_id)
            .single();
          targetCustomer = linkedCust;
        }
      }
    }

    if (!targetCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 3. Fetch scheme and installments using live RPC get_customer_scheme_data
    const schemeRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_scheme_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ p_customer_id: targetCustomer.id, p_mobile: targetCustomer.mobile_number }),
      cache: 'no-store',
    }).then(r => r.json());

    return NextResponse.json({
      success: true,
      customer: targetCustomer,
      scheme: schemeRes?.scheme || null,
      installments: schemeRes?.installments || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
