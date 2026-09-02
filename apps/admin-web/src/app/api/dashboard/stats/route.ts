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

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Total customers count
    const { count: totalCustCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // 2. Active schemes & total collections
    const { count: activeSchemeCount, data: activeSchemesData } = await supabase
      .from('customer_schemes')
      .select('total_amount_paid')
      .eq('status', 'ACTIVE');

    const totalCollections = (activeSchemesData || []).reduce((acc, s) => acc + Number(s.total_amount_paid || 0), 0);

    // 3. Pending installments count
    const { count: pendingInstCount } = await supabase
      .from('installments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'FUTURE']);

    return NextResponse.json({
      success: true,
      totalCustomers: totalCustCount || 0,
      activeSchemes: activeSchemeCount || 0,
      pendingInstallments: pendingInstCount || 0,
      totalCollections: totalCollections || 0,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Failed to compute dashboard stats',
    }, { status: 500 });
  }
}
