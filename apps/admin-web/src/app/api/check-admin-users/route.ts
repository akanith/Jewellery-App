import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET() {
  try {
    // Query profiles via Supabase REST API using RPC or query
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,full_name,mobile_number,email,role,is_active`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    });
    const profiles = await res.json();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      profiles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
