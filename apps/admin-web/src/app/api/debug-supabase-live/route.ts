import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, anonKey);

    const [
      { data: resEmpty, error: errEmpty },
      { data: resWild, error: errWild },
      { data: resNull, error: errNull },
    ] = await Promise.all([
      supabase.rpc('get_customer_by_mobile', { p_mobile: '' }),
      supabase.rpc('get_customer_by_mobile', { p_mobile: '%' }),
      supabase.rpc('get_customer_by_mobile', { p_mobile: '9842143308' }),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      supabaseUrl,
      resEmpty,
      resWild,
      resNull,
      errEmpty: errEmpty?.message || null,
      errWild: errWild?.message || null,
      errNull: errNull?.message || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
