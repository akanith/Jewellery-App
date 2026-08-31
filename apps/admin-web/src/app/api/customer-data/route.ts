import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

  const results: any = {};

  // Test 1: Anith (8778173681)
  try {
    const client = createClient(url, anonKey);
    const { data: authData } = await client.auth.signInWithPassword({
      email: '8778173681@customer.ramyas.local',
      password: 'AnithPassword@2026',
    });

    if (authData?.session) {
      const token = authData.session.access_token;
      const authedSupabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      // Update profile mobile_number
      await authedSupabase.from('profiles').update({ mobile_number: '8778173681' }).eq('id', authData.user.id);

      // Call RPC get_current_customer_id
      const { data: custId } = await authedSupabase.rpc('get_current_customer_id');

      // Fetch customer
      const { data: customer } = await authedSupabase.from('customers').select('*').eq('mobile_number', '8778173681').maybeSingle();

      // Fetch active scheme
      const { data: scheme } = await authedSupabase.from('customer_schemes').select('*').eq('status', 'ACTIVE').maybeSingle();

      let installments: any[] = [];
      if (scheme) {
        const { data: instData } = await authedSupabase.from('installments').select('*').eq('customer_scheme_id', scheme.id).order('installment_number', { ascending: true });
        installments = instData || [];
      }

      results['8778173681'] = {
        user_id: authData.user.id,
        resolved_customer_id: custId,
        customer,
        scheme,
        installmentsCount: installments.length,
        paidInstallments: installments.filter(i => i.status === 'PAID'),
      };
    }
  } catch (err: any) {
    results['8778173681'] = { error: err.message };
  }

  // Test 2: A.B.Kathiravven (9842143307)
  try {
    const client = createClient(url, anonKey);
    const { data: authData } = await client.auth.signInWithPassword({
      email: '9842143307@customer.ramyas.local',
      password: '12345',
    });

    if (authData?.session) {
      const token = authData.session.access_token;
      const authedSupabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      // Update profile mobile_number
      await authedSupabase.from('profiles').update({ mobile_number: '9842143307' }).eq('id', authData.user.id);

      // Call RPC get_current_customer_id
      const { data: custId } = await authedSupabase.rpc('get_current_customer_id');

      // Fetch customer
      const { data: customer } = await authedSupabase.from('customers').select('*').eq('mobile_number', '9842143307').maybeSingle();

      // Fetch active scheme
      const { data: scheme } = await authedSupabase.from('customer_schemes').select('*').eq('status', 'ACTIVE').maybeSingle();

      let installments: any[] = [];
      if (scheme) {
        const { data: instData } = await authedSupabase.from('installments').select('*').eq('customer_scheme_id', scheme.id).order('installment_number', { ascending: true });
        installments = instData || [];
      }

      results['9842143307'] = {
        user_id: authData.user.id,
        resolved_customer_id: custId,
        customer,
        scheme,
        installmentsCount: installments.length,
        paidInstallments: installments.filter(i => i.status === 'PAID'),
      };
    }
  } catch (err: any) {
    results['9842143307'] = { error: err.message };
  }

  return NextResponse.json(results);
}
