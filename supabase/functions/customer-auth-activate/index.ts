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
        JSON.stringify({ error: 'Server configuration error: missing Supabase environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { mobile, temp_password, new_password, full_name } = body;

    if (!mobile || typeof mobile !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Mobile number is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize mobile to 10 digits
    let cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length > 10 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length > 10 && cleanMobile.startsWith('0')) {
      cleanMobile = cleanMobile.substring(1);
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mobile number format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const internalEmail = `${cleanMobile}@customer.ramyas.local`;
    const targetPassword = new_password || temp_password || '12345';

    if (targetPassword.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 5 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Query customer record in public.customers
    let { data: customer, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, profile_id, status')
      .eq('mobile_number', cleanMobile)
      .maybeSingle();

    if (custErr) {
      return new Response(
        JSON.stringify({ error: custErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If customer record doesn't exist, create it in public.customers
    if (!customer) {
      const customerName = full_name || 'Valued Customer';
      const { data: newCust, error: insertErr } = await supabaseAdmin
        .from('customers')
        .insert({
          mobile_number: cleanMobile,
          full_name: customerName,
          status: 'ACTIVE',
        })
        .select('id, full_name, profile_id, status')
        .single();

      if (insertErr || !newCust) {
        return new Response(
          JSON.stringify({ error: insertErr?.message || 'Failed to create customer record.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customer = newCust;
    }

    // 2. Provision or update Auth User in auth.users
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === internalEmail);

    if (existingUser) {
      userId = existingUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: targetPassword,
        user_metadata: { full_name: customer.full_name, role: 'CUSTOMER' },
      });
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: internalEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: customer.full_name,
          role: 'CUSTOMER',
        },
      });

      if (createErr || !newUser.user) {
        return new Response(
          JSON.stringify({ error: createErr?.message || 'Failed to create customer auth account.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
    }

    // 3. Upsert public.profiles record
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
        JSON.stringify({ error: profErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Link public.customers.profile_id to auth user ID
    const { error: linkErr } = await supabaseAdmin.from('customers').update({
      profile_id: userId,
      updated_at: new Date().toISOString(),
    }).eq('id', customer.id);

    if (linkErr) {
      return new Response(
        JSON.stringify({ error: linkErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Customer account provisioned and linked successfully.',
        customer_id: customer.id,
        profile_id: userId,
        email: internalEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
