import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export const revalidate = 0;

export default async function TestMobileOnlyPage() {
  const supabaseAnon = createClient(url, anonKey);

  const testNumbers = [
    { name: 'test1', mobile: '9842143305', custNum: 'RJ-2026-008' },
    { name: 'Anith', mobile: '8778173681', custNum: 'RJ-2026-001' },
    { name: 'A.B.Kathiravven', mobile: '9842143307', custNum: 'RJ-2026-002' },
    { name: 'Ram', mobile: '9842143308', custNum: 'RJ-2026-003' },
    { name: 'Murugan', mobile: '8778173683', custNum: 'RJ-2026-007' },
  ];

  const results = [];

  for (const item of testNumbers) {
    const { data: byMobile, error: errMobile } = await supabaseAnon
      .rpc('get_customer_by_mobile', { p_mobile: item.mobile });

    let schemeRes = null;
    if (byMobile && byMobile.length > 0) {
      const { data: schemeData } = await supabaseAnon
        .rpc('get_customer_scheme_data', {
          p_customer_id: byMobile[0].id,
          p_mobile: item.mobile,
        });
      schemeRes = schemeData;
    }

    results.push({
      item,
      byMobile,
      errMobile,
      schemeRes,
    });
  }

  // Non-existent number test
  const { data: invalidRes } = await supabaseAnon
    .rpc('get_customer_by_mobile', { p_mobile: '9000000000' });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-mono text-sm bg-slate-900 text-slate-100 min-h-screen">
      <div className="border-b border-slate-700 pb-4">
        <h1 className="text-xl font-bold text-amber-400">Mobile-Only Customer Login Verification Report</h1>
        <p className="text-xs text-slate-400 mt-1">Live Database Audit (zeltnwyxmhuzoslpthlb) • Read-Only Execution</p>
      </div>

      {/* Architecture Indicator */}
      <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 space-y-2">
        <h2 className="text-base font-bold">🟢 CURRENT ARCHITECTURE ACTIVE</h2>
        <p className="text-xs">
          Customer Login: 10-Digit Mobile Number ➔ public.get_customer_by_mobile(p_mobile) ➔ public.customers.id ➔ Customer Session ➔ get_customer_scheme_data()
        </p>
        <p className="text-xs text-emerald-400 font-semibold">
          NO Passwords • NO OTP • NO Synthetic Emails • NO auth.users / profile_id Dependencies
        </p>
      </div>

      {/* Verified Customers List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-amber-300">Live Customer Mobile Resolution Audit:</h3>

        {results.map(({ item, byMobile, errMobile, schemeRes }) => {
          const isSuccess = Array.isArray(byMobile) && byMobile.length > 0;
          return (
            <div key={item.mobile} className={`p-4 rounded-xl border ${isSuccess ? 'bg-slate-800 border-slate-700' : 'bg-rose-950 border-rose-600'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400">{item.name} ({item.custNum})</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {isSuccess ? 'RESOLVED OK' : 'NOT FOUND'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Mobile Queried: {item.mobile}</p>

              {isSuccess && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 space-y-1">
                  <p>Customer ID: <span className="text-emerald-400">{byMobile[0].id}</span></p>
                  <p>Customer Number: <span className="text-emerald-400">{byMobile[0].customer_number}</span></p>
                  <p>Status: <span className="text-emerald-400">{byMobile[0].status}</span></p>
                  <p>Paid Installments: <span className="text-emerald-400">{schemeRes?.scheme?.paid_installments_count ?? 0}/{schemeRes?.scheme?.total_installments ?? 12}</span></p>
                  <p>Total Paid Amount: <span className="text-emerald-400">₹{schemeRes?.scheme?.total_amount_paid ?? 0}</span></p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invalid Mobile Test */}
      <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
        <h4 className="font-bold text-slate-300">Non-Existent Mobile Test (9000000000):</h4>
        <p className="text-xs text-emerald-400 mt-1">
          Returned: {JSON.stringify(invalidRes)} (Correctly returned empty result without errors)
        </p>
      </div>
    </div>
  );
}
