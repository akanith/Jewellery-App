import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET(request: Request) {
  try {
    const testMobiles = ['9842143305', '8778173681', '8778173683', '9842143307', '9842143308'];
    const results: any[] = [];

    for (const mobile of testMobiles) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_by_mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_mobile: mobile }),
        cache: 'no-store',
      });
      const custData = await res.json();

      let schemeData = null;
      if (Array.isArray(custData) && custData.length > 0) {
        const schemeRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_scheme_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            p_customer_id: custData[0].id,
            p_mobile: mobile,
          }),
          cache: 'no-store',
        });
        schemeData = await schemeRes.json();
      }

      results.push({
        mobile,
        customerFound: custData,
        schemeDataReturned: schemeData,
      });
    }

    return NextResponse.json({ timestamp: new Date().toISOString(), results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
