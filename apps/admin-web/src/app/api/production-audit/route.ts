import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET() {
  try {
    // 1. List of known test mobile numbers to query via SECURITY DEFINER get_customer_by_mobile & get_customer_scheme_data
    const knownMobiles = [
      '9842143305', // test1 / RJ-2026-008
      '8778173681', // Anith / RJ-2026-001
      '8778173683', // Murugan / RJ-2026-007
      '9842143307', // A.B.Kathiravven / RJ-2026-002
      '9842143308', // Ram / RJ-2026-003
    ];

    const customerAudit: any[] = [];

    for (const mobile of knownMobiles) {
      // Call get_customer_by_mobile
      const custRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_by_mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_mobile: mobile }),
        cache: 'no-store',
      }).then(r => r.json());

      if (Array.isArray(custRes) && custRes.length > 0) {
        const cust = custRes[0];

        // Call get_customer_scheme_data
        const schemeRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_scheme_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            p_customer_id: cust.id,
            p_mobile: mobile,
          }),
          cache: 'no-store',
        }).then(r => r.json());

        customerAudit.push({
          mobile,
          customer: cust,
          schemeDetails: schemeRes?.scheme || null,
          installmentsCount: schemeRes?.installments?.length || 0,
          paidInstallmentsCount: schemeRes?.scheme?.paid_installments_count || 0,
          totalAmountPaid: schemeRes?.scheme?.total_amount_paid || 0,
          fullSchemePayload: schemeRes,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auditCount: customerAudit.length,
      customers: customerAudit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
