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
      // Handle empty body
    }

    const { mobile } = body;

    if (!mobile || typeof mobile !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_MOBILE',
          message: 'Please enter a valid 10-digit mobile number.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Normalize mobile to 10 digits
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length > 10 && cleanMobile.startsWith('0')) {
      cleanMobile = cleanMobile.substring(1);
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_MOBILE',
          message: 'Please enter a valid 10-digit mobile number.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Query public.customers for cleanMobile
    const { data: customerList, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, mobile_number, profile_id, status')
      .eq('mobile_number', cleanMobile);

    if (custErr) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'DATABASE_ERROR',
          message: 'Unable to connect. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Handle zero customers found
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

    // 4. Handle duplicate mobile numbers
    if (customerList.length > 1) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'DUPLICATE_MOBILE',
          message: 'Multiple customer accounts found for this mobile number. Please contact shop admin.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = customerList[0];

    // 5. Ensure internal Auth User exists and is confirmed
    const internalEmail = `${cleanMobile}@customer.ramyas.local`;
    const defaultPassword = '12345';
    let userId: string;

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: customer.full_name,
        role: 'CUSTOMER',
      },
    });

    if (newUser?.user) {
      userId = newUser.user.id;
    } else if (createErr) {
      // Find existing user by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = existingUsers?.users?.find(u => u.email === internalEmail);

      if (existingUser) {
        userId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { full_name: customer.full_name, role: 'CUSTOMER' },
        });
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'AUTH_PROVISION_ERROR',
            message: 'Unable to connect. Please try again.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'AUTH_PROVISION_ERROR',
          message: 'Unable to connect. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Upsert public.profiles
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: customer.full_name,
      mobile_number: cleanMobile,
      role: 'CUSTOMER',
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profErr) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'PROFILE_UPSERT_ERROR',
          message: 'Unable to connect. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Link public.customers.profile_id
    if (customer.profile_id !== userId) {
      const { error: linkErr } = await supabaseAdmin.from('customers').update({
        profile_id: userId,
        updated_at: new Date().toISOString(),
      }).eq('id', customer.id);

      if (linkErr) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'CUSTOMER_LINK_ERROR',
            message: 'Unable to connect. Please try again.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return minimum required payload (no service role key, no internal secrets)
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
    return new Response(
      JSON.stringify({
        success: false,
        code: 'UNEXPECTED_ERROR',
        message: 'Unable to connect. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
