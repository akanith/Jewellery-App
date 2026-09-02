import { NextResponse } from 'next/server';

export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function postRpc(funcName: string, bodyObj: any, apiKey: string) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${funcName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyObj),
      cache: 'no-store',
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } catch (err: any) {
    return { status: 500, ok: false, error: err.message };
  }
}

async function getDirectCustomers(apiKey: string) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/customers?select=id,full_name,mobile_number,customer_number,status`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return { status: res.status, ok: res.ok, count: Array.isArray(data) ? data.length : 0, data };
  } catch (err: any) {
    return { status: 500, ok: false, error: err.message };
  }
}

export async function GET() {
  const targetNumber = '9842143305';

  // 1. Test RPC with Anon Key (Live client authentication check)
  const rpcExact = await postRpc('get_customer_by_mobile', { p_mobile: targetNumber }, anonKey);
  const rpcPlus91 = await postRpc('get_customer_by_mobile', { p_mobile: `+91${targetNumber}` }, anonKey);
  const rpc91 = await postRpc('get_customer_by_mobile', { p_mobile: `91${targetNumber}` }, anonKey);
  const rpcSpaces = await postRpc('get_customer_by_mobile', { p_mobile: '98421 43305' }, anonKey);
  const rpcUnused = await postRpc('get_customer_by_mobile', { p_mobile: '9000000003' }, anonKey);

  // 2. Direct table SELECT with Anon Key (RLS Check)
  const directAnon = await getDirectCustomers(anonKey);

  // 3. Direct table SELECT with Service Role Key (Database Truth)
  const directAdmin = serviceKey ? await getDirectCustomers(serviceKey) : null;

  // 4. Find test1 / 9842143305 in database truth
  let test1AdminRow: any = null;
  if (directAdmin && Array.isArray(directAdmin.data)) {
    test1AdminRow = directAdmin.data.find((c: any) =>
      c.mobile_number?.includes(targetNumber) || c.full_name?.toLowerCase().includes('test1')
    );
  }

  const isRpcDeployed = rpcExact.status !== 404 && rpcExact.status !== 405 && !JSON.stringify(rpcExact.data).includes('PGRST202');

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    supabaseProject: 'zeltnwyxmhuzoslpthlb',
    migration018Status: {
      isAppliedToLiveCloud: isRpcDeployed,
      rpcStatus: rpcExact.status,
      rpcError: isRpcDeployed ? null : rpcExact.data,
    },
    liveCustomerTarget: {
      number: targetNumber,
      existsInPostgresTruth: !!test1AdminRow,
      adminRowDetails: test1AdminRow || 'Not found in admin service role search',
    },
    liveRpcTests: {
      exact9842143305: rpcExact,
      plus91Format: rpcPlus91,
      prefix91Format: rpc91,
      spacesFormat: rpcSpaces,
      unusedNumber: rpcUnused,
    },
    rlsCheck: {
      anonDirectSelectStatus: directAnon.status,
      anonDirectSelectCount: directAnon.count,
      rlsIsBlockingDirectSelect: directAnon.count === 0 && (directAdmin?.count || 0) > 0,
    },
  });
}
