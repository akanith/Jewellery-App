import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(request: Request) {
  const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';
  
  const keyToUse = serviceKey || anonKey;

  const resCust = await fetch(`${supabaseUrl}/rest/v1/customers?select=id,full_name,mobile_number,customer_number,profile_id,status`, {
    headers: {
      'apikey': keyToUse,
      'Authorization': `Bearer ${keyToUse}`,
    },
    cache: 'no-store',
  });

  const custData = await resCust.json();

  return NextResponse.json({
    hasServiceKey: !!serviceKey,
    keyLength: serviceKey.length,
    status: resCust.status,
    customersCount: Array.isArray(custData) ? custData.length : 0,
    customers: custData,
  });
}
