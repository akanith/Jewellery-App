import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export const revalidate = 0;

export default async function TestAuthPage() {
  const results: Record<string, any> = {};

  try {
    const supabase = createClient(url, key);

    // 1. Audit current customers in public.customers
    const { data: customers, error: errCust } = await supabase
      .from('customers')
      .select('id, customer_number, full_name, mobile_number, profile_id')
      .order('customer_number');

    results['existing_customers'] = { count: customers?.length || 0, customers, error: errCust?.message };

    // 2. Check Customer A (Anith: 8778173681) & Customer Ram (RJ-2026-003: 9842143308)
    const custA = customers?.find(c => c.mobile_number === '8778173681' || c.customer_number === 'RJ-2026-001');
    const custRam = customers?.find(c => c.mobile_number === '9842143308' || c.customer_number === 'RJ-2026-003');

    results['target_customer_A'] = custA;
    results['ram_customer_record'] = custRam;

    // 3. Test Edge Function activation for Customer A (8778173681)
    const mobile = '8778173681';
    const internalEmail = `${mobile}@customer.ramyas.local`;
    const newPassword = 'AnithPassword@2026';

    const edgeRes = await fetch(`${url}/functions/v1/customer-auth-activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
      },
      body: JSON.stringify({
        mobile: mobile,
        temp_password: '12345',
        new_password: newPassword,
      }),
    });

    const edgeStatus = edgeRes.status;
    const edgeData = await edgeRes.json().catch(() => null);
    results['edge_function_activation'] = { status: edgeStatus, data: edgeData };

    // 4. Verify updated public.customers & public.profiles state
    const { data: updatedCustA } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile_number', mobile)
      .maybeSingle();

    const { data: profileA } = await supabase
      .from('profiles')
      .select('*')
      .eq('mobile_number', mobile)
      .maybeSingle();

    results['database_verification'] = {
      customer: updatedCustA,
      profile: profileA,
      linked: updatedCustA?.profile_id === profileA?.id && profileA?.id != null,
    };

    // 5. Test Returning Customer Login
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: newPassword,
    });

    results['returning_customer_login'] = {
      success: !signInErr && !!signInData.user,
      user_id: signInData.user?.id,
      email: signInData.user?.email,
      error: signInErr?.message,
    };

    if (signInData.user) {
      // Test get_current_customer_id RPC
      const { data: rpcCustId, error: rpcErr } = await supabase.rpc('get_current_customer_id');
      results['rpc_get_current_customer_id'] = {
        resolved_customer_id: rpcCustId,
        matches_customer_A_id: rpcCustId === custA?.id,
        error: rpcErr?.message,
      };

      // Sign out
      await supabase.auth.signOut();
    }

    // 6. Test Security Scenarios
    // Wrong password
    const { error: wrongPassErr } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: 'WrongPassword999',
    });
    results['wrong_password_test'] = { rejected: !!wrongPassErr, error: wrongPassErr?.message };

    // Unknown mobile activation
    const unknownRes = await fetch(`${url}/functions/v1/customer-auth-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ mobile: '9999999999', temp_password: '12345', new_password: 'Pass' }),
    });
    results['unknown_mobile_test'] = { status: unknownRes.status, response: await unknownRes.json().catch(() => null) };

    // Duplicate activation attempt
    const dupRes = await fetch(`${url}/functions/v1/customer-auth-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ mobile: mobile, temp_password: '12345', new_password: 'Pass' }),
    });
    results['duplicate_activation_test'] = { status: dupRes.status, response: await dupRes.json().catch(() => null) };

    // 7. Verify Ram (RJ-2026-003) record remains untouched
    const { data: finalRam } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_number', 'RJ-2026-003')
      .maybeSingle();

    results['ram_post_test_verification'] = {
      id: finalRam?.id,
      customer_number: finalRam?.customer_number,
      profile_id: finalRam?.profile_id,
      untouched: finalRam?.profile_id === null,
    };
  } catch (err: any) {
    results['error'] = err.message;
  }

  return (
    <main style={{ padding: 40, fontFamily: 'monospace', background: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <h1>E2E SUPABASE AUTH LINKING VERIFICATION RESULTS</h1>
      <pre style={{ background: '#1e293b', padding: 20, borderRadius: 12, overflow: 'auto' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </main>
  );
}
