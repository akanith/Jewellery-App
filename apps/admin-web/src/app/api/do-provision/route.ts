import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetMobile = searchParams.get('mobile');
  const targetPassword = searchParams.get('password') || '12345';

  try {
    const supabase = createClient(url, anonKey);

    // If targetMobile is passed, test login
    if (targetMobile) {
      const cleanTarget = targetMobile.replace(/\D/g, '');
      const internalEmail = `${cleanTarget}@customer.ramyas.local`;

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: targetPassword,
      });

      let resolvedCustId = null;

      if (signInData?.user) {
        const { data: rpcRes } = await supabase.rpc('get_current_customer_id');
        resolvedCustId = rpcRes;
        await supabase.auth.signOut();
      }

      return NextResponse.json({
        success: !signInErr && !!signInData?.user,
        input_mobile: cleanTarget,
        internal_email: internalEmail,
        user_id: signInData?.user?.id || null,
        resolved_customer_id: resolvedCustId,
        auth_error: signInErr?.message || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Server API endpoint ready.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 200 });
  }
}
