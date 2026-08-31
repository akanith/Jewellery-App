import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VerifyAuthLinkingPage() {
  const results: Record<string, any> = {};

  try {
    const supabase = createClient(url, key);

    // 1. Audit current customers in public.customers
    const { data: customers, error: errCust } = await supabase
      .from('customers')
      .select('id, customer_number, full_name, mobile_number, profile_id')
      .order('customer_number');

    results['existing_customers'] = { count: customers?.length || 0, customers, error: errCust?.message };

    // 2. Target Customer: Kathiravven (9842143307)
    const targetMobile = '9842143307';
    const targetEmail = `${targetMobile}@customer.ramyas.local`;
    const defaultPassword = '12345';

    const custTarget = customers?.find(c => c.mobile_number === targetMobile);
    results['target_customer_record_before'] = custTarget;

    // 3. Provision customer 9842143307 via Edge Function
    const edgeRes = await fetch(`${url}/functions/v1/customer-auth-activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        mobile: targetMobile,
        temp_password: defaultPassword,
        new_password: defaultPassword,
      }),
    });

    const edgeData = await edgeRes.json().catch(() => null);
    results['edge_provision_result'] = { status: edgeRes.status, data: edgeData };

    // 4. Verify updated state in database
    const { data: updatedCust } = await supabase
      .from('customers')
      .select('*')
      .eq('mobile_number', targetMobile)
      .maybeSingle();

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('mobile_number', targetMobile)
      .maybeSingle();

    results['database_verification_9842143307'] = {
      customer_id: updatedCust?.id,
      customer_number: updatedCust?.customer_number,
      customer_profile_id: updatedCust?.profile_id,
      profile_id: updatedProfile?.id,
      profile_role: updatedProfile?.role,
      is_linked_properly: updatedCust?.profile_id != null && updatedCust?.profile_id === updatedProfile?.id,
    };

    // 5. Test Flutter Customer App Login Simulation (9842143307 / 12345)
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: defaultPassword,
    });

    results['test_9842143307_login'] = {
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
        matches_target_customer_id: rpcCustId === custTarget?.id,
        error: rpcErr?.message,
      };

      // Test RLS Isolation: fetch customers for logged in Customer 9842143307
      const { data: ownCustRecord, error: rlsErr } = await supabase.from('customers').select('*');
      results['rls_customer_isolation'] = {
        records_accessible: ownCustRecord?.length || 0,
        customer_numbers_accessible: ownCustRecord?.map(c => c.customer_number),
        is_isolated_to_self_only: ownCustRecord?.length === 1 && ownCustRecord[0].mobile_number === targetMobile,
        error: rlsErr?.message,
      };

      await supabase.auth.signOut();
    }

    // 7. Security Scenarios
    // Wrong password
    const { error: wrongPassErr } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: 'WrongPassword999',
    });
    results['security_wrong_password_rejected'] = !!wrongPassErr;

    // 8. Verify Ram (RJ-2026-003) record remains untouched
    const { data: finalRam } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_number', 'RJ-2026-003')
      .maybeSingle();

    results['ram_post_test_verification'] = {
      customer_number: finalRam?.customer_number,
      full_name: finalRam?.full_name,
      profile_id: finalRam?.profile_id,
      untouched: finalRam?.profile_id === null,
    };
  } catch (err: any) {
    results['error'] = err.message;
  }

  return (
    <div style={{ padding: 40, background: '#0f172a', color: '#f8fafc', fontFamily: 'monospace', minHeight: '100vh' }}>
      <h1 style={{ color: '#fbbf24', fontSize: 22, marginBottom: 16 }}>E2E SUPABASE AUTH LINKING VERIFICATION REPORT</h1>
      <pre style={{ background: '#1e293b', padding: 24, borderRadius: 12, border: '1px solid #334155', fontSize: 12, color: '#4ade80' }}>
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}
