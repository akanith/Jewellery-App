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
      return json500('Unable to connect. Please try again.');
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const { mobile, customerId, resource } = body;

    // Validate inputs
    if (!mobile || !customerId || !resource) {
      return json400('Missing required fields: mobile, customerId, resource', 'BAD_REQUEST');
    }

    // Normalize mobile
    let clean = String(mobile).replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
    else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);

    if (!/^[6-9]\d{9}$/.test(clean)) {
      return json400('Invalid mobile number', 'INVALID_MOBILE');
    }

    // SECURITY: Cross-validate — both mobile AND customerId must match the SAME customer row
    const { data: authRow, error: authErr } = await db
      .from('customers')
      .select('id, full_name, mobile_number, customer_number, status')
      .eq('id', customerId)
      .eq('mobile_number', clean)
      .maybeSingle();

    if (authErr) {
      console.error(`[customer-get-data] Auth check error: ${authErr.message}`);
      return json500('Unable to connect. Please try again.');
    }

    if (!authRow) {
      // Cross-customer access attempt OR stale session
      console.warn(`[customer-get-data] ACCESS DENIED — mobile/customerId mismatch`);
      return new Response(
        JSON.stringify({ success: false, code: 'ACCESS_DENIED', message: 'Access denied.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedCustomerId = authRow.id;

    // Route to resource handler
    switch (resource) {
      case 'dashboard':
        return await getDashboard(db, verifiedCustomerId, authRow);
      case 'passbook':
        return await getPassbook(db, verifiedCustomerId);
      case 'notifications':
        return await getNotifications(db, verifiedCustomerId);
      case 'profile':
        return new Response(
          JSON.stringify({ success: true, customer: authRow }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      default:
        return json400(`Unknown resource: ${resource}`, 'UNKNOWN_RESOURCE');
    }

  } catch (err: any) {
    console.error(`[customer-get-data] Unexpected: ${err?.message}`);
    return json500('Unable to connect. Please try again.');
  }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboard(db: any, customerId: string, customer: any) {
  // 1. Fetch active scheme
  const { data: scheme, error: schErr } = await db
    .from('customer_schemes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (schErr) return json500('Unable to load scheme data.');

  if (!scheme) {
    return new Response(JSON.stringify({ success: true, customer, scheme: null, installments: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Fetch installments for that scheme
  const { data: installments, error: instErr } = await db
    .from('installments')
    .select('id, installment_number, due_date, due_amount, paid_amount, payment_date, status')
    .eq('customer_scheme_id', scheme.id)
    .order('installment_number', { ascending: true });

  if (instErr) return json500('Unable to load installment data.');

  return new Response(
    JSON.stringify({ success: true, customer, scheme, installments: installments || [] }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── Passbook ─────────────────────────────────────────────────────────────────

async function getPassbook(db: any, customerId: string) {
  const { data: scheme, error: schErr } = await db
    .from('customer_schemes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (schErr) return json500('Unable to load passbook.');

  if (!scheme) {
    return new Response(JSON.stringify({ success: true, scheme: null, installments: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: installments, error: instErr } = await db
    .from('installments')
    .select('id, installment_number, due_date, due_amount, paid_amount, payment_date, payment_method, payment_reference, status')
    .eq('customer_scheme_id', scheme.id)
    .order('installment_number', { ascending: true });

  if (instErr) return json500('Unable to load passbook.');

  return new Response(
    JSON.stringify({ success: true, scheme, installments: installments || [] }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function getNotifications(db: any, customerId: string) {
  const { data: items, error } = await db
    .from('notifications')
    .select('id, title, message, type, is_read, customer_id, created_at, metadata')
    .or(`customer_id.eq.${customerId},customer_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return json500('Unable to load notifications.');

  return new Response(
    JSON.stringify({ success: true, notifications: items || [] }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
