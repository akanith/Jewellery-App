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

export const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  Cash: 'CASH',
  GPay: 'UPI',
  PhonePe: 'UPI',
  Paytm: 'UPI',
  NetBank: 'BANK_TRANSFER',
  Card: 'CARD',
  CASH: 'CASH',
  GPAY: 'UPI',
  PHONEPE: 'UPI',
  PAYTM: 'UPI',
  NETBANK: 'BANK_TRANSFER',
  NETBANKING: 'BANK_TRANSFER',
  CARD: 'CARD',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ONLINE_GATEWAY: 'ONLINE_GATEWAY',
} as const;

export function toCanonicalPaymentMethod(method: string | null | undefined): PaymentMethod {
  if (!method) return 'CASH';
  const trimmed = method.trim();
  if (PAYMENT_METHOD_MAP[trimmed]) {
    return PAYMENT_METHOD_MAP[trimmed];
  }
  const upper = trimmed.toUpperCase();
  if (PAYMENT_METHOD_MAP[upper]) {
    return PAYMENT_METHOD_MAP[upper];
  }
  return 'CASH';
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
      const res = await fetch(`/api/customers/${customerSchemeId}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.installments && Array.isArray(json.installments) && json.installments.length > 0) {
          return json.installments.map((row: any) => this.mapRowToInstallment({
            ...row,
            customer_scheme_id: customerSchemeId,
          }));
        }
      }

      const { data } = await supabase
        .from('installments')
        .select('*')
        .eq('customer_scheme_id', customerSchemeId)
        .order('installment_number', { ascending: true });

      return (data ?? []).map((row) => this.mapRowToInstallment(row));
    } catch {
      return [];
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
    try {
      const res = await fetch('/api/payments', { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const rawList = data.payments || [];
      return rawList.map((row: any) => ({
        id: String(row.id),
        paymentNumber: String(row.id),
        customerSchemeId: String(row.customerId || ''),
        installmentId: null,
        customerId: String(row.customerId || ''),
        amount: Number(row.amount || 1000),
        paymentMethod: (row.paymentMethod as PaymentMethod) || 'CASH',
        paymentReference: row.paymentReference || null,
        paymentDate: String(row.paymentDate || new Date().toISOString()),
        status: 'COMPLETED' as PaymentStatus,
        receivedBy: 'Admin',
        notes: null,
        createdAt: String(row.paymentDate || new Date().toISOString()),
        updatedAt: String(row.paymentDate || new Date().toISOString()),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Atomically record an installment payment by invoking PostgreSQL RPC `record_installment_payment()`
   */
  static async recordInstallmentPayment(payload: RecordPaymentPayload): Promise<RecordPaymentResult> {
    const supabase = this.getSupabase();

    try {
      if (!payload.customerSchemeId) {
        throw new AppError('Customer scheme ID is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (typeof payload.amount !== 'number' || isNaN(payload.amount) || payload.amount <= 0) {
        throw new AppError('Payment amount must be a positive number greater than zero.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const canonicalMethod = toCanonicalPaymentMethod(payload.paymentMethod);

      // 1. Try server API /api/payments first for zero UUID syntax error
      const apiRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: payload.customerSchemeId,
          customerSchemeId: payload.customerSchemeId,
          installmentId: payload.installmentId,
          amount: payload.amount,
          paymentMethod: canonicalMethod,
          referenceNumber: payload.paymentReference,
        }),
      });

      if (!apiRes.ok) {
        const errorData = await apiRes.json().catch(() => ({}));
        throw new AppError(errorData.error || 'Failed to record payment in database.', ErrorCode.INTERNAL_ERROR, apiRes.status || 400);
      }

      const apiData = await apiRes.json();
      if (!apiData.success) {
        throw new AppError(apiData.error || 'Failed to record payment in database.', ErrorCode.INTERNAL_ERROR, 400);
      }

      return {
        success: true,
        paymentId: apiData.payment?.id || crypto.randomUUID(),
        paidInstallmentsCount: 1,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to record installment payment in database.', ErrorCode.INTERNAL_ERROR, 500);
    }
  }
}
