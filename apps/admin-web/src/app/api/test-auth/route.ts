import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const supabase = createClient(url, key);

    // 1. Audit current customers in public.customers
    const { data: customers, error: errCust } = await supabase
      .from('customers')
      .select('id, customer_number, full_name, mobile_number, profile_id')
      .order('customer_number');

    results['existing_customers'] = { count: customers?.length || 0, customers, error: errCust?.message };

    // 2. Provision existing unlinked customers (e.g. 9842143307 / Kathiravven)
    const provisioningResults: Record<string, any>[] = [];
    if (customers && customers.length > 0) {
      for (const cust of customers) {
        if (!cust.profile_id) {
          const provRes = await fetch(`${url}/functions/v1/customer-auth-activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key,
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
              mobile: cust.mobile_number,
              temp_password: '12345',
              new_password: '12345',
            }),
          });
          const provData = await provRes.json().catch(() => null);
          provisioningResults.push({
            customer_number: cust.customer_number,
            mobile: cust.mobile_number,
            name: cust.full_name,
            status: provRes.status,
            data: provData,
          });
        }
      }
    }
    results['provisioning_results'] = provisioningResults;

    // 3. Re-verify database linkage state after provisioning
    const { data: updatedCustomers } = await supabase
      .from('customers')
      .select('id, customer_number, full_name, mobile_number, profile_id')
      .order('customer_number');

    results['updated_customers_linkage'] = updatedCustomers;

    // 4. Test Customer 9842143307 Login
    const targetMobile = '9842143307';
    const targetEmail = `${targetMobile}@customer.ramyas.local`;
    const targetPassword = '12345';

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
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
      const targetCust = customers?.find(c => c.mobile_number === targetMobile);
      results['rpc_get_current_customer_id'] = {
        resolved_customer_id: rpcCustId,
        matches_target_customer: rpcCustId === targetCust?.id,
        error: rpcErr?.message,
      };

      // Sign out
      await supabase.auth.signOut();
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, results }, { status: 500 });
  }
}

