import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { Redemption, RedemptionStatus } from '@ramyas-jeweller/shared-types';

export interface RedemptionCandidate {
  customerSchemeId: string;
  schemeAccountNumber: string;
  customerId: string;
  customerNumber: string;
  customerName: string;
  mobileNumber: string;
  schemeName: string;
  totalPaidAmount: number;
  bonusAmount: number;
  finalRedeemedValue: number;
  status: string;
  startDate: string;
  maturityDate: string | null;
  paidInstallmentsCount: number;
  totalInstallments: number;
}

export interface RedemptionStats {
  customersReady: number;
  todaysRedemptions: number;
  completedThisMonth: number;
  totalRedeemedValue: number;
}

export interface CompleteRedemptionResult {
  success: boolean;
  redemptionId: string;
  finalValue: number;
}

export class RedemptionService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Helper to map database redemption row to Redemption interface
   */
  private static mapRowToRedemption(row: Record<string, unknown>): Redemption {
    return {
      id: String(row.id),
      redemptionNumber: String(row.redemption_number ?? ''),
      customerSchemeId: String(row.customer_scheme_id),
      customerId: String(row.customer_id),
      totalPaidAmount: Number(row.total_paid_amount ?? 0),
      bonusAmount: Number(row.bonus_amount ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      finalRedeemedValue: Number(row.final_redeemed_value ?? 0),
      redemptionDate: row.redemption_date ? String(row.redemption_date) : null,
      status: (row.status as RedemptionStatus) ?? 'PENDING_APPROVAL',
      approvedBy: row.approved_by ? String(row.approved_by) : null,
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Get all eligible customer schemes for scheme redemption
   */
  static async getRedemptionCandidates(): Promise<RedemptionCandidate[]> {
    const supabase = this.getSupabase();

    try {
      // Query customer schemes with joined customer and scheme plan information
      const { data, error } = await supabase
        .from('customer_schemes')
        .select(`
          id,
          scheme_account_number,
          customer_id,
          scheme_plan_id,
          start_date,
          maturity_date,
          monthly_amount,
          total_installments,
          paid_installments_count,
          total_amount_paid,
          status,
          customers (
            customer_number,
            full_name,
            mobile_number
          ),
          scheme_plans (
            title,
            code,
            monthly_amount
          )
        `)
        .in('status', ['COMPLETED', 'ACTIVE'])
        .order('created_at', { ascending: false });

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row: any) => {
        const totalPaid = Number(row.total_amount_paid ?? 0);
        const monthlyAmt = Number(row.monthly_amount ?? row.scheme_plans?.monthly_amount ?? 0);
        const paidCount = Number(row.paid_installments_count ?? 0);
        const totalInstallments = Number(row.total_installments ?? 12);
        
        // Calculate bonus: 1 month bonus if completed or paid fully
        const isCompleted = row.status === 'COMPLETED' || paidCount >= totalInstallments;
        const bonusAmount = isCompleted ? monthlyAmt : 0;
        const finalValue = totalPaid + bonusAmount;

        return {
          customerSchemeId: String(row.id),
          schemeAccountNumber: String(row.scheme_account_number ?? ''),
          customerId: String(row.customer_id),
          customerNumber: String(row.customers?.customer_number ?? ''),
          customerName: String(row.customers?.full_name ?? 'Customer'),
          mobileNumber: String(row.customers?.mobile_number ?? ''),
          schemeName: String(row.scheme_plans?.title ?? 'Diwali Savings Scheme'),
          totalPaidAmount: totalPaid,
          bonusAmount: bonusAmount,
          finalRedeemedValue: finalValue,
          status: isCompleted ? 'Ready for Redemption' : 'Pending Verification',
          startDate: String(row.start_date ?? ''),
          maturityDate: row.maturity_date ? String(row.maturity_date) : null,
          paidInstallmentsCount: paidCount,
          totalInstallments: totalInstallments,
        };
      });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Fetch all redemption records from public.redemptions
   */
  static async getRedemptions(statusFilter?: string): Promise<Redemption[]> {
    const supabase = this.getSupabase();

    try {
      let query = supabase.from('redemptions').select('*').order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'All') {
        if (statusFilter === 'Redeemed' || statusFilter === 'Completed') {
          query = query.eq('status', 'APPROVED');
        } else if (statusFilter === 'Pending Verification') {
          query = query.eq('status', 'PENDING_APPROVAL');
        }
      }

      const { data, error } = await query;

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToRedemption(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Fetch single redemption record by ID
   */
  static async getRedemptionById(id: string): Promise<Redemption> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new AppError(`Redemption record with ID "${id}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToRedemption(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Aggregate KPI summary statistics directly from database tables
   */
  static async getRedemptionStats(): Promise<RedemptionStats> {
    const supabase = this.getSupabase();

    try {
      // 1. Customers Ready (Completed or fully paid customer schemes)
      const { count: readyCount, error: readyErr } = await supabase
        .from('customer_schemes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['COMPLETED', 'ACTIVE']);

      if (readyErr) throw normalizeError(readyErr);

      // 2. Today's Redemptions
      const todayStr = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayErr } = await supabase
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .lte('created_at', `${todayStr}T23:59:59.999Z`);

      if (todayErr) throw normalizeError(todayErr);

      // 3. Completed This Month
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthCount, error: monthErr } = await supabase
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth);

      if (monthErr) throw normalizeError(monthErr);

      // 4. Total Redeemed Value
      const { data: totalValueData, error: valueErr } = await supabase
        .from('redemptions')
        .select('final_redeemed_value');

      if (valueErr) throw normalizeError(valueErr);

      const totalValue = (totalValueData ?? []).reduce((acc: number, row: any) => acc + Number(row.final_redeemed_value ?? 0), 0);

      return {
        customersReady: readyCount ?? 0,
        todaysRedemptions: todayCount ?? 0,
        completedThisMonth: monthCount ?? 0,
        totalRedeemedValue: totalValue,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Fetch scheme and customer redemption details for CompleteRedemptionModal
   */
  static async getCustomerSchemeRedemptionDetails(customerSchemeId: string): Promise<RedemptionCandidate> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('customer_schemes')
        .select(`
          id,
          scheme_account_number,
          customer_id,
          scheme_plan_id,
          start_date,
          maturity_date,
          monthly_amount,
          total_installments,
          paid_installments_count,
          total_amount_paid,
          status,
          customers (
            customer_number,
            full_name,
            mobile_number
          ),
          scheme_plans (
            title,
            code,
            monthly_amount
          )
        `)
        .eq('id', customerSchemeId)
        .single();

      if (error || !data) {
        throw new AppError(`Customer scheme record "${customerSchemeId}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      const totalPaid = Number(data.total_amount_paid ?? 0);
      const monthlyAmt = Number(data.monthly_amount ?? (data.scheme_plans as any)?.monthly_amount ?? 0);
      const paidCount = Number(data.paid_installments_count ?? 0);
      const totalInstallments = Number(data.total_installments ?? 12);
      
      const isCompleted = data.status === 'COMPLETED' || paidCount >= totalInstallments;
      const bonusAmount = isCompleted ? monthlyAmt : 0;
      const finalValue = totalPaid + bonusAmount;

      return {
        customerSchemeId: String(data.id),
        schemeAccountNumber: String(data.scheme_account_number ?? ''),
        customerId: String(data.customer_id),
        customerNumber: String((data.customers as any)?.customer_number ?? ''),
        customerName: String((data.customers as any)?.full_name ?? 'Customer'),
        mobileNumber: String((data.customers as any)?.mobile_number ?? ''),
        schemeName: String((data.scheme_plans as any)?.title ?? 'Diwali Savings Scheme'),
        totalPaidAmount: totalPaid,
        bonusAmount: bonusAmount,
        finalRedeemedValue: finalValue,
        status: String(data.status),
        startDate: String(data.start_date ?? ''),
        maturityDate: data.maturity_date ? String(data.maturity_date) : null,
        paidInstallmentsCount: paidCount,
        totalInstallments: totalInstallments,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Complete scheme redemption by invoking PostgreSQL RPC `process_scheme_redemption()`
   */
  static async completeRedemption(customerSchemeId: string, notes?: string): Promise<CompleteRedemptionResult> {
    const supabase = this.getSupabase();

    try {
      if (!customerSchemeId) {
        throw new AppError('Customer scheme ID is required for redemption.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const { data, error } = await supabase.rpc('process_scheme_redemption', {
        p_customer_scheme_id: customerSchemeId,
        p_notes: notes ? notes.trim() : null,
      });

      if (error) {
        const msg = error.message;
        if (msg.includes('already been redeemed')) {
          throw new AppError('This customer scheme has already been redeemed.', ErrorCode.CONFLICT, 409);
        }
        if (msg.includes('not eligible for redemption')) {
          throw new AppError('Scheme is not eligible for redemption in its current status.', ErrorCode.BAD_REQUEST, 400);
        }
        if (msg.includes('Owner or Admin role required')) {
          throw new AppError('Access denied. Owner or Admin role required for scheme redemption.', ErrorCode.FORBIDDEN, 403);
        }
        throw normalizeError(error);
      }

      const res = data as Record<string, unknown>;

      return {
        success: Boolean(res.success ?? true),
        redemptionId: String(res.redemption_id ?? ''),
        finalValue: Number(res.final_value ?? 0),
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
