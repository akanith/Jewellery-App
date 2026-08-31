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
      console.error('[CustomerLogin] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, code: 'SERVER_CONFIG_ERROR', message: 'Unable to connect. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { mobile } = body;

    if (!mobile || typeof mobile !== 'string') {
      return new Response(
        JSON.stringify({ success: false, code: 'INVALID_MOBILE', message: 'Please enter a valid 10-digit mobile number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize mobile to exactly 10 digits
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length > 10 && cleanMobile.startsWith('0')) {
      cleanMobile = cleanMobile.substring(1);
    }

    console.log(`[CustomerLogin] Request received. Normalized mobile length: ${cleanMobile.length}`);

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return new Response(
        JSON.stringify({ success: false, code: 'INVALID_MOBILE', message: 'Please enter a valid 10-digit mobile number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Query public.customers by mobile_number (exact column name)
    console.log(`[CustomerLogin] Querying public.customers WHERE mobile_number = '${cleanMobile}'`);
    const { data: customerList, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, mobile_number, profile_id, status')
      .eq('mobile_number', cleanMobile);

    if (custErr) {
      console.error(`[CustomerLogin] Database error: ${custErr.code} - ${custErr.message}`);
      return new Response(
        JSON.stringify({ success: false, code: 'DATABASE_ERROR', message: 'Unable to connect. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CustomerLogin] Query result count: ${customerList?.length ?? 0}`);

    if (!customerList || customerList.length === 0) {
      return new Response(
        JSON.stringify({ success: false, code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found. Please contact Ramyas Jeweller.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customerList.length > 1) {
      return new Response(
        JSON.stringify({ success: false, code: 'DUPLICATE_MOBILE', message: 'Multiple customer accounts found for this mobile number. Please contact shop admin.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = customerList[0];

    // Step 2: Provision Auth user — create or retrieve existing
    const internalEmail = `${cleanMobile}@customer.ramyas.local`;
    const defaultPassword = '12345';
    let userId: string;

    // Try to create; if already exists, retrieve via getUserByEmail (faster than listUsers)
    const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { full_name: customer.full_name, role: 'CUSTOMER' },
    });

    if (newUserData?.user) {
      userId = newUserData.user.id;
      console.log(`[CustomerLogin] New auth user created: ${userId}`);
    } else if (createErr?.message?.toLowerCase().includes('already') || createErr?.status === 422) {
      // User already exists — use getUserByEmail (O(1), no full scan)
      const { data: existingUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserByEmail(internalEmail);
      if (getUserErr || !existingUserData?.user) {
        console.error(`[CustomerLogin] Failed to retrieve existing user: ${getUserErr?.message}`);
        return new Response(
          JSON.stringify({ success: false, code: 'AUTH_RETRIEVAL_ERROR', message: 'Unable to connect. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = existingUserData.user.id;
      // Ensure password and email are confirmed (re-sync)
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: customer.full_name, role: 'CUSTOMER' },
      });
      console.log(`[CustomerLogin] Existing auth user retrieved and updated: ${userId}`);
    } else {
      console.error(`[CustomerLogin] Auth create error (unexpected): ${createErr?.message}`);
      return new Response(
        JSON.stringify({ success: false, code: 'AUTH_PROVISION_ERROR', message: 'Unable to connect. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Upsert public.profiles
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: customer.full_name,
      mobile_number: cleanMobile,
      role: 'CUSTOMER',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profErr) {
      console.error(`[CustomerLogin] Profile upsert error: ${profErr.code} - ${profErr.message}`);
      return new Response(
        JSON.stringify({ success: false, code: 'PROFILE_UPSERT_ERROR', message: 'Unable to connect. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Link public.customers.profile_id if not already linked
    if (customer.profile_id !== userId) {
      const { error: linkErr } = await supabaseAdmin
        .from('customers')
        .update({ profile_id: userId, updated_at: new Date().toISOString() })
        .eq('id', customer.id);

      if (linkErr) {
        console.error(`[CustomerLogin] Customer link error: ${linkErr.code} - ${linkErr.message}`);
        return new Response(
          JSON.stringify({ success: false, code: 'CUSTOMER_LINK_ERROR', message: 'Unable to connect. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[CustomerLogin] Customer resolved and linked successfully.`);

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: customer.id,
        profile_id: userId,
        message: 'Customer mobile login verified successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error(`[CustomerLogin] Unexpected error: ${err?.message}`);
    return new Response(
      JSON.stringify({ success: false, code: 'UNEXPECTED_ERROR', message: 'Unable to connect. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
