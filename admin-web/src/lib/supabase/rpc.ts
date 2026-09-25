/**
 * RAMYAS JEWELLER - Type-Safe Database RPC Wrappers
 * Enforces business rules and invokes SECURITY DEFINER procedures via Supabase client.
 */

import { getSupabaseBrowserClient } from './client';
import {
  CreateCustomerWithSchemeParams,
  CreateCustomerWithSchemeResult,
  EnrollCustomerSchemeParams,
  EnrollCustomerSchemeResult,
  RecordInstallmentPaymentParams,
  RecordInstallmentPaymentResult,
  RecordSchemeRedemptionParams,
  RecordSchemeRedemptionResult,
  ProcessEmergencyRefundParams,
  ProcessEmergencyRefundResult,
  AdminResetCustomerPasswordParams,
  AdminResetCustomerPasswordResult,
  PendingPasswordResetRequest,
  CompleteCustomerPasswordResetRequestResult,
  CancelCustomerPasswordResetRequestResult,
  DeleteCustomerAccountParams,
  DeleteCustomerAccountResult,
} from '@/types/database';

export interface RpcResponse<T> {
  data: T | null;
  error: string | null;
  rawError?: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

/**
 * Creates a new customer profile and customer record, optionally enrolling them
 * into the 12-Month Diwali Savings Scheme atomically.
 */
export async function createCustomerWithScheme(
  params: CreateCustomerWithSchemeParams
): Promise<RpcResponse<CreateCustomerWithSchemeResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const payload = {
      p_full_name: params.p_full_name,
      p_phone_number: params.p_phone_number,
      p_address: params.p_address || null,
      p_city: params.p_city || 'Dindigul',
      p_pincode: params.p_pincode || null,
      p_alternate_phone: params.p_alternate_phone || null,
      p_nominee_name: params.p_nominee_name || null,
      p_nominee_relationship: params.p_nominee_relationship || null,
      p_notes: params.p_notes || null,
      p_enroll_scheme: params.p_enroll_scheme !== false,
      p_start_month: params.p_start_month || null,
    };

    console.log('[RPC Diagnostic] Invoking create_customer_with_scheme with payload:', payload);

    const { data, error } = await supabase.rpc('create_customer_with_scheme', payload);

    if (error) {
      console.error('[RPC Diagnostic] Exact Supabase RPC Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        rawError: error,
      });
      return {
        data: null,
        error: error.message,
        rawError: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
      };
    }

    console.log('[RPC Diagnostic] RPC Success data:', data);
    return { data: data as CreateCustomerWithSchemeResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to register customer.';
    console.error('[RPC Diagnostic] Caught unexpected exception:', err);
    return { data: null, error: message };
  }
}

/**
 * Enrolls a customer into a 12-month ₹1,000 savings scheme.
 * Atomically generates scheme, 12 installments, pending bonus, welcome notification & audit log.
 */
export async function enrollCustomerScheme(
  params: EnrollCustomerSchemeParams
): Promise<RpcResponse<EnrollCustomerSchemeResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('enroll_customer_scheme', {
      p_customer_id: params.p_customer_id,
      p_start_month: params.p_start_month,
      p_notes: params.p_notes || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EnrollCustomerSchemeResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to enroll customer in scheme.';
    return { data: null, error: message };
  }
}

/**
 * Records a ₹1,000 monthly installment payment.
 * Automatically verifies 12th payment and awards ₹1,000 completion bonus (Total ₹13,000 maturity value).
 */
export async function recordInstallmentPayment(
  params: RecordInstallmentPaymentParams
): Promise<RpcResponse<RecordInstallmentPaymentResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('record_installment_payment', {
      p_scheme_id: params.p_scheme_id,
      p_installment_number: params.p_installment_number,
      p_payment_method: params.p_payment_method,
      p_transaction_reference: params.p_transaction_reference || null,
      p_notes: params.p_notes || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RecordInstallmentPaymentResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record installment payment.';
    return { data: null, error: message };
  }
}

/**
 * Records a partial or full scheme redemption against an itemized jewellery purchase invoice.
 */
export async function recordSchemeRedemption(
  params: RecordSchemeRedemptionParams
): Promise<RpcResponse<RecordSchemeRedemptionResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('record_scheme_redemption', {
      p_scheme_id: params.p_scheme_id,
      p_scheme_amount_used: params.p_scheme_amount_used,
      p_purchase_total: params.p_purchase_total,
      p_invoice_number: params.p_invoice_number,
      p_items: params.p_items,
      p_notes: params.p_notes || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as RecordSchemeRedemptionResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record scheme redemption.';
    return { data: null, error: message };
  }
}

/**
 * Processes an emergency refund authorization (Super-Admin only).
 */
export async function processEmergencyRefund(
  params: ProcessEmergencyRefundParams
): Promise<RpcResponse<ProcessEmergencyRefundResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('process_emergency_refund', {
      p_scheme_id: params.p_scheme_id,
      p_refund_amount: params.p_refund_amount,
      p_refund_notes: params.p_refund_notes || null,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ProcessEmergencyRefundResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process emergency refund.';
    return { data: null, error: message };
  }
}

/**
 * Resets a customer's password to a temporary password derived from the last 4 digits of their mobile.
 * Invokes SECURITY DEFINER procedure public.admin_reset_customer_password(uuid).
 */
export async function adminResetCustomerPassword(
  params: AdminResetCustomerPasswordParams
): Promise<RpcResponse<AdminResetCustomerPasswordResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('admin_reset_customer_password', {
      p_customer_id: params.p_customer_id,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AdminResetCustomerPasswordResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to reset customer password.';
    return { data: null, error: message };
  }
}

/**
 * Retrieves all PENDING customer password reset requests.
 * Invokes SECURITY DEFINER procedure public.get_pending_customer_password_reset_requests().
 */
export async function getPendingCustomerPasswordResetRequests(): Promise<
  RpcResponse<PendingPasswordResetRequest[]>
> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('get_pending_customer_password_reset_requests');

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data || []) as PendingPasswordResetRequest[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to fetch pending password reset requests.';
    return { data: null, error: message };
  }
}

/**
 * Completes a pending password reset request, issuing a temporary password.
 * Invokes SECURITY DEFINER procedure public.complete_customer_password_reset_request(uuid).
 */
export async function completeCustomerPasswordResetRequest(
  p_request_id: string
): Promise<RpcResponse<CompleteCustomerPasswordResetRequestResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('complete_customer_password_reset_request', {
      p_request_id,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as CompleteCustomerPasswordResetRequestResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to complete password reset request.';
    return { data: null, error: message };
  }
}

/**
 * Cancels a pending password reset request.
 * Invokes SECURITY DEFINER procedure public.cancel_customer_password_reset_request(uuid).
 */
export async function cancelCustomerPasswordResetRequest(
  p_request_id: string
): Promise<RpcResponse<CancelCustomerPasswordResetRequestResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('cancel_customer_password_reset_request', {
      p_request_id,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as CancelCustomerPasswordResetRequestResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to cancel password reset request.';
    return { data: null, error: message };
  }
}

/**
 * Safely deletes an eligible customer account without financial history.
 * Invokes SECURITY DEFINER procedure public.delete_customer_account(uuid).
 */
export async function deleteCustomerAccount(
  params: DeleteCustomerAccountParams
): Promise<RpcResponse<DeleteCustomerAccountResult>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('delete_customer_account', {
      p_customer_id: params.p_customer_id,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as DeleteCustomerAccountResult, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to delete customer account.';
    return { data: null, error: message };
  }
}


