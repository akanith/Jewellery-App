import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[customer-login] Missing environment variables');
      return json500('Unable to connect. Please try again.');
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { mobile } = body;

    if (!mobile || typeof mobile !== 'string') {
      return json400('Please enter a valid 10-digit mobile number.', 'INVALID_MOBILE');
    }

    // Normalize to exactly 10 digits
    let clean = mobile.replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
    else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);

    if (!/^[6-9]\d{9}$/.test(clean)) {
      return json400('Please enter a valid 10-digit mobile number.', 'INVALID_MOBILE');
    }

    console.log(`[customer-login] Lookup: mobile length=${clean.length}`);

    // Query public.customers by mobile_number
    const { data: rows, error: dbErr } = await db
      .from('customers')
      .select('id, full_name, mobile_number, customer_number, status')
      .eq('mobile_number', clean);

    if (dbErr) {
      console.error(`[customer-login] DB error: ${dbErr.code} — ${dbErr.message}`);
      return json500('Unable to connect. Please try again.');
    }

    if (!rows || rows.length === 0) {
      console.log(`[customer-login] No customer found`);
      return new Response(
        JSON.stringify({ success: false, code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found. Please contact Ramyas Jeweller.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rows.length > 1) {
      console.error(`[customer-login] Duplicate mobile — ${rows.length} rows`);
      return new Response(
        JSON.stringify({ success: false, code: 'DUPLICATE_MOBILE', message: 'Multiple accounts found for this mobile number. Please contact shop admin.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = rows[0];

    console.log(`[customer-login] Customer resolved`);

    // Return minimum identity — no passwords, no auth tokens, no service role key
    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          fullName: customer.full_name,
          mobileNumber: customer.mobile_number,
          customerNumber: customer.customer_number || null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error(`[customer-login] Unexpected: ${err?.message}`);
    return json500('Unable to connect. Please try again.');
  }
});

function json400(message: string, code: string) {
  return new Response(
    JSON.stringify({ success: false, code, message }),
    { status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
  );
}

function json500(message: string) {
  return new Response(
    JSON.stringify({ success: false, code: 'SERVER_ERROR', message }),
    { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
  );
}
