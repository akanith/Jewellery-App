import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zeltnwyxmhuzoslpthlb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_f380TZdwnJkepy6k9M3uQQ_mPpeg6o1';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // 1. Direct table select from public.payments
    const { data: tblPayments } = await supabase
      .from('payments')
      .select('*, customers(full_name, mobile_number, customer_number)')
      .order('payment_date', { ascending: false });

    if (Array.isArray(tblPayments) && tblPayments.length > 0) {
      const mapped = tblPayments.map((p: any) => ({
        id: p.id,
        customerId: p.customer_id,
        customerName: p.customers?.full_name || 'Customer',
        customerNumber: p.customers?.customer_number || '',
        mobileNumber: p.customers?.mobile_number || '',
        installmentNumber: 1,
        amount: Number(p.amount || 0),
        paymentDate: p.payment_date || p.created_at,
        paymentMethod: p.payment_method || 'CASH',
        paymentReference: p.payment_reference || null,
        status: p.status || 'COMPLETED',
      }));
      return NextResponse.json({ success: true, payments: mapped });
    }

    // 3. Fallback: Query all customer scheme installments
    const { data: allCusts } = await supabase.from('customers').select('id, full_name, mobile_number, customer_number');
    const paymentList: any[] = [];

    if (Array.isArray(allCusts)) {
      for (const cust of allCusts) {
        const schemeRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_customer_scheme_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ p_customer_id: cust.id, p_mobile: cust.mobile_number }),
          cache: 'no-store',
        }).then(r => r.json());

        const installs = schemeRes?.installments || [];
        const paidInstalls = installs.filter((i: any) => i.status === 'PAID');

        for (const p of paidInstalls) {
          paymentList.push({
            id: p.id,
            customerId: cust.id,
            customerName: cust.full_name,
            customerNumber: cust.customer_number,
            mobileNumber: cust.mobile_number,
            installmentNumber: p.installment_number,
            amount: Number(p.paid_amount || p.expected_amount || 1000),
            paymentDate: p.payment_date || new Date().toISOString(),
            paymentMethod: p.payment_method || 'CASH',
            paymentReference: p.payment_reference || 'REF-ADMIN',
            status: 'COMPLETED',
          });
        }
      }
    }

    return NextResponse.json({ success: true, payments: paymentList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, customerSchemeId, installmentId, installmentNumber = 1, amount = 1000, paymentMethod = 'CASH', referenceNumber } = body;

    if (!customerSchemeId || !installmentId) {
      return NextResponse.json({ error: 'Customer scheme ID and installment ID are required.' }, { status: 400 });
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be a positive number greater than zero.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    // 1. Try atomic PostgreSQL RPC record_installment_payment
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_installment_payment', {
      p_customer_scheme_id: customerSchemeId,
      p_installment_id: installmentId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_payment_reference: referenceNumber || null,
      p_notes: null,
    });

    if (!rpcErr && rpcRes && rpcRes.payment_id) {
      return NextResponse.json({
        success: true,
        paymentId: rpcRes.payment_id,
        payment: {
          id: rpcRes.payment_id,
          customerId: customerId || customerSchemeId,
          amount,
          installmentNumber,
          paymentMethod,
          paymentReference: referenceNumber || 'REF-ADMIN',
          paymentDate: nowIso,
          status: 'COMPLETED',
        },
      });
    }

    // 2. Strict Database Verification & Financial Idempotency
    const { data: targetInstallment, error: instFetchErr } = await supabase
      .from('installments')
      .select('id, customer_scheme_id, status, expected_amount')
      .eq('id', installmentId)
      .maybeSingle();

    if (instFetchErr || !targetInstallment) {
      return NextResponse.json({ error: 'Installment record not found in database.' }, { status: 404 });
    }

    // Security Check A: Verify installment belongs to the specified customer scheme
    if (targetInstallment.customer_scheme_id !== customerSchemeId) {
      return NextResponse.json({ error: 'Access denied. Installment does not belong to the specified customer scheme.' }, { status: 403 });
    }

    // Security Check B: IDEMPOTENCY — Prevent double payments on already PAID installments
    if (targetInstallment.status === 'PAID') {
      return NextResponse.json({ error: 'This installment has already been paid.' }, { status: 409 });
    }

    // Step A: Update target installment status to PAID
    const { error: updateInstErr } = await supabase
      .from('installments')
      .update({
        status: 'PAID',
        paid_amount: amount,
        payment_date: nowIso,
        payment_method: paymentMethod,
        payment_reference: referenceNumber || 'REF-ADMIN',
      })
      .eq('id', installmentId)
      .eq('status', 'PENDING');

    if (updateInstErr) {
      return NextResponse.json({ error: updateInstErr.message || 'Failed to update installment status.' }, { status: 500 });
    }

    // Get customer_id from customer_schemes
    let resolvedCustomerId = customerId;
    const { data: schemeRow } = await supabase
      .from('customer_schemes')
      .select('customer_id')
      .eq('id', customerSchemeId)
      .maybeSingle();

    if (schemeRow?.customer_id) {
      resolvedCustomerId = schemeRow.customer_id;
    }

    // Step B: Insert financial transaction row into public.payments
    const paymentUuid = crypto.randomUUID();
    const { error: payInsertErr } = await supabase.from('payments').insert({
      id: paymentUuid,
      customer_scheme_id: customerSchemeId,
      installment_id: installmentId,
      customer_id: resolvedCustomerId,
      amount: amount,
      payment_method: paymentMethod,
      payment_reference: referenceNumber || 'REF-ADMIN',
      payment_date: nowIso,
      status: 'COMPLETED',
    });

    if (payInsertErr) {
      console.error('[API /api/payments POST] Payment insert error:', payInsertErr);
    }

    // Step C: Recalculate customer scheme totals dynamically from public.installments
    const { data: paidInstalls } = await supabase
      .from('installments')
      .select('paid_amount, expected_amount')
      .eq('customer_scheme_id', customerSchemeId)
      .eq('status', 'PAID');

    if (paidInstalls) {
      const paidCount = paidInstalls.length;
      const totalPaid = paidInstalls.reduce((sum, item) => sum + Number(item.paid_amount || item.expected_amount || 0), 0);
      const isCompleted = paidCount >= 12;

      await supabase
        .from('customer_schemes')
        .update({
          paid_installments_count: paidCount,
          total_amount_paid: totalPaid,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        })
        .eq('id', customerSchemeId);
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentUuid,
      payment: {
        id: paymentUuid,
        customerId: resolvedCustomerId,
        customerSchemeId,
        installmentId,
        amount,
        paymentMethod,
        paymentReference: referenceNumber || 'REF-ADMIN',
        paymentDate: nowIso,
        status: 'COMPLETED',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
