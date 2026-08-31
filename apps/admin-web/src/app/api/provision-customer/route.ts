import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const cleanMobile = mobile.toString().replace(/\D/g, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/customer-auth-activate`;

    const res = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify({
        mobile: cleanMobile,
        temp_password: '12345',
        new_password: '12345',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Provisioning failed' }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';

    // Provision all existing unprovisioned customers
    const customersRes = await fetch(`${supabaseUrl}/rest/v1/customers?select=mobile_number,full_name,profile_id`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    const customers = await customersRes.json();
    const results = [];

    if (Array.isArray(customers)) {
      for (const cust of customers) {
        if (!cust.profile_id) {
          const provRes = await fetch(`${supabaseUrl}/functions/v1/customer-auth-activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'apikey': key,
            },
            body: JSON.stringify({
              mobile: cust.mobile_number,
              temp_password: '12345',
              new_password: '12345',
            }),
          });
          const provData = await provRes.json();
          results.push({ mobile: cust.mobile_number, name: cust.full_name, provData });
        }
      }
    }

    return NextResponse.json({ success: true, reconciled: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
