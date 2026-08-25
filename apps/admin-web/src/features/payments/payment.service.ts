import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { Installment, Payment, PaymentMethod, PaymentStatus, InstallmentStatus } from '@ramyas-jeweller/shared-types';

export interface RecordPaymentPayload {
  customerSchemeId: string;
  installmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId: string;
  paidInstallmentsCount: number;
}

export class PaymentService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Helper to map database installment row to Installment interface
   */
  private static mapRowToInstallment(row: Record<string, unknown>): Installment {
    return {
      id: String(row.id),
      customerSchemeId: String(row.customer_scheme_id),
      installmentNumber: Number(row.installment_number ?? 1),
      dueDate: String(row.due_date ?? ''),
      expectedAmount: Number(row.expected_amount ?? 0),
      paidAmount: Number(row.paid_amount ?? 0),
      paymentDate: row.payment_date ? String(row.payment_date) : null,
      paymentMethod: row.payment_method ? (row.payment_method as PaymentMethod) : null,
      paymentReference: row.payment_reference ? String(row.payment_reference) : null,
      status: (row.status as InstallmentStatus) ?? 'PENDING',
      receivedBy: row.received_by ? String(row.received_by) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Helper to map database payment row to Payment interface
   */
  private static mapRowToPayment(row: Record<string, unknown>): Payment {
    return {
      id: String(row.id),
      paymentNumber: String(row.payment_number ?? ''),
      customerSchemeId: String(row.customer_scheme_id),
      installmentId: row.installment_id ? String(row.installment_id) : null,
      customerId: String(row.customer_id),
      amount: Number(row.amount ?? 0),
      paymentMethod: (row.payment_method as PaymentMethod) ?? 'CASH',
      paymentReference: row.payment_reference ? String(row.payment_reference) : null,
      paymentDate: String(row.payment_date ?? new Date().toISOString()),
      status: (row.status as PaymentStatus) ?? 'COMPLETED',
      receivedBy: row.received_by ? String(row.received_by) : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Get all installments for a specific customer scheme from public.installments
   */
  static async getCustomerSchemeInstallments(customerSchemeId: string): Promise<Installment[]> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('customer_scheme_id', customerSchemeId)
        .order('installment_number', { ascending: true });

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToInstallment(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get installment by ID
   */
  static async getInstallmentById(installmentId: string): Promise<Installment> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('id', installmentId)
        .single();

      if (error || !data) {
        throw new AppError(`Installment with ID "${installmentId}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToInstallment(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get payment transaction history from public.payments
   */
  static async getPaymentHistory(customerSchemeId?: string): Promise<Payment[]> {
    const supabase = this.getSupabase();

    try {
      let query = supabase.from('payments').select('*').order('payment_date', { ascending: false });

      if (customerSchemeId) {
        query = query.eq('customer_scheme_id', customerSchemeId);
      }

      const { data, error } = await query;

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToPayment(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Atomically record an installment payment by invoking PostgreSQL RPC `record_installment_payment()`
   */
  static async recordInstallmentPayment(payload: RecordPaymentPayload): Promise<RecordPaymentResult> {
    const supabase = this.getSupabase();

    try {
      // 1. Client-side financial validations before invoking atomic RPC
      if (!payload.customerSchemeId) {
        throw new AppError('Customer scheme ID is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (!payload.installmentId) {
        throw new AppError('Installment ID is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (typeof payload.amount !== 'number' || isNaN(payload.amount) || payload.amount <= 0) {
        throw new AppError('Payment amount must be a positive number greater than zero.', ErrorCode.VALIDATION_ERROR, 400);
      }

      // 2. Invoke authoritative PostgreSQL RPC function
      const { data, error } = await supabase.rpc('record_installment_payment', {
        p_customer_scheme_id: payload.customerSchemeId,
        p_installment_id: payload.installmentId,
        p_amount: payload.amount,
        p_payment_method: payload.paymentMethod,
        p_payment_reference: payload.paymentReference || null,
        p_notes: payload.notes || null,
      });

      if (error) {
        // Map database exception messages to user-friendly text
        const msg = error.message;
        if (msg.includes('already been paid')) {
          throw new AppError('This installment has already been paid.', ErrorCode.CONFLICT, 409);
        }
        if (msg.includes('non-active scheme')) {
          throw new AppError('Cannot record payment for a non-active scheme.', ErrorCode.BAD_REQUEST, 400);
        }
        if (msg.includes('greater than zero')) {
          throw new AppError('Payment amount must be greater than zero.', ErrorCode.VALIDATION_ERROR, 400);
        }
        if (msg.includes('Privileged role required')) {
          throw new AppError('You are not authorized to record payments.', ErrorCode.FORBIDDEN, 403);
        }
        throw normalizeError(error);
      }

      const res = data as Record<string, unknown>;

      return {
        success: Boolean(res.success ?? true),
        paymentId: String(res.payment_id ?? ''),
        paidInstallmentsCount: Number(res.paid_installments_count ?? 0),
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
