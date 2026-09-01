import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Normalize Indian mobile numbers to 10 digits */
function normalizeMobile(raw: string): string {
  let clean = raw.replace(/\D/g, '');
  if (clean.length > 10 && clean.startsWith('91')) {
    clean = clean.substring(2);
  } else if (clean.length > 10 && clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  return clean;
}

/** Check valid 10-digit mobile format starting with 6, 7, 8, or 9 */
function isValidMobile(clean: string): boolean {
  return /^[6-9]\d{9}$/.test(clean);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'SERVER_CONFIG_ERROR',
          message: 'Unable to connect. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body handling
    }

    const rawMobile = body.mobile_number || body.mobile || '';

    if (!rawMobile || typeof rawMobile !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_MOBILE',
          message: 'Enter a valid 10-digit mobile number.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanMobile = normalizeMobile(rawMobile);

    if (!isValidMobile(cleanMobile)) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_MOBILE',
          message: 'Enter a valid 10-digit mobile number.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Direct database query on public.customers for cleanMobile
    const { data: customerList, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, mobile_number, customer_number, status')
      .eq('mobile_number', cleanMobile);

    if (custErr) {
      console.error('[CustomerMobileLogin] DB error:', custErr.message);
      return new Response(
        JSON.stringify({
          success: false,
          code: 'SERVER_ERROR',
          message: 'Unable to connect. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 0 customers found -> 404 CUSTOMER_NOT_FOUND
    if (!customerList || customerList.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found. Please contact Ramyas Jeweller.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select matching customer record
    const customer = customerList[0];

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create session token payload
    const tokenData = {
      customerId: customer.id,
      customerNumber: customer.customer_number || customer.id,
      fullName: customer.full_name || 'Valued Customer',
      mobileNumber: customer.mobile_number,
      issuedAt,
      expiresAt,
    };

    // Safe customer identity payload
    const safeCustomer = {
      id: customer.id,
      customer_number: customer.customer_number || customer.id,
      full_name: customer.full_name || 'Valued Customer',
      mobile_number: customer.mobile_number,
    };

    return new Response(
      JSON.stringify({
        success: true,
        customer: safeCustomer,
        session: {
          token: `c_sess_${customer.id}_${Date.now()}`,
          ...tokenData,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[CustomerMobileLogin] Unexpected exception:', err?.message);
    return new Response(
      JSON.stringify({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Unable to connect. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
