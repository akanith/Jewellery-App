import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { SchemePlan, CustomerScheme, SchemeStatus } from '@ramyas-jeweller/shared-types';

export interface CreateSchemePlanInput {
  code: string;
  title: string;
  description?: string;
  monthlyAmount: number;
  totalInstallments: number;
  bonusMonths?: number;
  discountPercentage?: number;
  goldWeightBased?: boolean;
  isActive?: boolean;
}

export interface UpdateSchemePlanInput {
  title?: string;
  description?: string;
  monthlyAmount?: number;
  totalInstallments?: number;
  bonusMonths?: number;
  discountPercentage?: number;
  goldWeightBased?: boolean;
  isActive?: boolean;
}

export interface CreateCustomerSchemeInput {
  customerId: string;
  schemePlanId: string;
  monthlyAmount: number;
  totalInstallments: number;
  startDate?: string;
}

export class SchemeService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Map database row to SchemePlan interface
   */
  private static mapRowToSchemePlan(row: Record<string, unknown>): SchemePlan {
    return {
      id: String(row.id),
      code: String(row.code ?? ''),
      title: String(row.title ?? ''),
      description: row.description ? String(row.description) : null,
      monthlyAmount: Number(row.monthly_amount ?? 0),
      totalInstallments: Number(row.total_installments ?? 12),
      bonusMonths: Number(row.bonus_months ?? 0),
      discountPercentage: Number(row.discount_percentage ?? 0),
      goldWeightBased: Boolean(row.gold_weight_based ?? false),
      isActive: Boolean(row.is_active ?? true),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Map database row to CustomerScheme interface
   */
  private static mapRowToCustomerScheme(row: Record<string, unknown>): CustomerScheme {
    return {
      id: String(row.id),
      schemeAccountNumber: String(row.scheme_account_number ?? ''),
      customerId: String(row.customer_id),
      schemePlanId: String(row.scheme_plan_id),
      startDate: String(row.start_date ?? new Date().toISOString()),
      maturityDate: row.maturity_date ? String(row.maturity_date) : null,
      monthlyAmount: Number(row.monthly_amount ?? 0),
      totalInstallments: Number(row.total_installments ?? 12),
      paidInstallmentsCount: Number(row.paid_installments_count ?? 0),
      totalAmountPaid: Number(row.total_amount_paid ?? 0),
      status: (row.status as SchemeStatus) ?? 'ACTIVE',
      createdBy: row.created_by ? String(row.created_by) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Get all scheme plans from public.scheme_plans
   */
  static async getSchemePlans(params?: { search?: string; isActive?: boolean }): Promise<SchemePlan[]> {
    const supabase = this.getSupabase();

    try {
      let query = supabase.from('scheme_plans').select('*').order('created_at', { ascending: false });

      if (params?.isActive !== undefined) {
        query = query.eq('is_active', params.isActive);
      }

      if (params?.search && params.search.trim() !== '') {
        const term = params.search.trim();
        query = query.or(`title.ilike.%${term}%,code.ilike.%${term}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToSchemePlan(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get scheme plan by ID
   */
  static async getSchemePlanById(id: string): Promise<SchemePlan> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('scheme_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new AppError(`Scheme plan with ID "${id}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToSchemePlan(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Create a new scheme plan in public.scheme_plans
   */
  static async createSchemePlan(input: CreateSchemePlanInput): Promise<SchemePlan> {
    const supabase = this.getSupabase();

    try {
      if (!input.title.trim()) {
        throw new AppError('Scheme title is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (!input.code.trim()) {
        throw new AppError('Scheme code is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (input.monthlyAmount <= 0) {
        throw new AppError('Monthly installment amount must be greater than zero.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (input.totalInstallments <= 0) {
        throw new AppError('Total installments must be greater than zero.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const dbPayload = {
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        monthly_amount: input.monthlyAmount,
        total_installments: input.totalInstallments,
        bonus_months: input.bonusMonths ?? 0,
        discount_percentage: input.discountPercentage ?? 0,
        gold_weight_based: input.goldWeightBased ?? false,
        is_active: input.isActive ?? true,
      };

      const { data, error } = await supabase
        .from('scheme_plans')
        .insert(dbPayload)
        .select('*')
        .single();

      if (error) {
        if (error.message.includes('unique constraint') || error.message.includes('scheme_plans_code_key')) {
          throw new AppError('A scheme plan with this code already exists.', ErrorCode.CONFLICT, 409);
        }
        throw normalizeError(error);
      }

      if (!data) {
        throw new AppError('Failed to create scheme plan.', ErrorCode.INTERNAL_ERROR, 500);
      }

      return this.mapRowToSchemePlan(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Update an existing scheme plan
   */
  static async updateSchemePlan(id: string, input: UpdateSchemePlanInput): Promise<SchemePlan> {
    const supabase = this.getSupabase();

    try {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title.trim();
      if (input.description !== undefined) updateData.description = input.description ? input.description.trim() : null;
      if (input.monthlyAmount !== undefined) updateData.monthly_amount = input.monthlyAmount;
      if (input.totalInstallments !== undefined) updateData.total_installments = input.totalInstallments;
      if (input.bonusMonths !== undefined) updateData.bonus_months = input.bonusMonths;
      if (input.discountPercentage !== undefined) updateData.discount_percentage = input.discountPercentage;
      if (input.goldWeightBased !== undefined) updateData.gold_weight_based = input.goldWeightBased;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('scheme_plans')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw normalizeError(error);
      }

      if (!data) {
        throw new AppError(`Failed to update scheme plan "${id}".`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToSchemePlan(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Toggle active/inactive status of a scheme plan
   */
  static async setSchemePlanStatus(id: string, isActive: boolean): Promise<SchemePlan> {
    return this.updateSchemePlan(id, { isActive });
  }

  /**
   * Retrieve customer scheme enrollments from public.customer_schemes
   */
  static async getCustomerSchemes(customerId?: string): Promise<CustomerScheme[]> {
    const supabase = this.getSupabase();

    try {
      let query = supabase.from('customer_schemes').select('*').order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToCustomerScheme(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get single customer scheme by ID
   */
  static async getCustomerSchemeById(id: string): Promise<CustomerScheme> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('customer_schemes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new AppError(`Customer scheme record "${id}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToCustomerScheme(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Enroll a customer into a scheme plan in public.customer_schemes.
   * Scheme Account Number is generated automatically by PostgreSQL sequence scheme_account_number_seq.
   */
  static async createCustomerScheme(input: CreateCustomerSchemeInput): Promise<CustomerScheme> {
    const supabase = this.getSupabase();

    try {
      if (!input.customerId) {
        throw new AppError('Customer selection is required.', ErrorCode.VALIDATION_ERROR, 400);
      }
      if (!input.schemePlanId) {
        throw new AppError('Scheme plan selection is required.', ErrorCode.VALIDATION_ERROR, 400);
      }

      // Verify active user session
      const { data: { user } } = await supabase.auth.getUser();

      const startDate = input.startDate || new Date().toISOString().split('T')[0];

      // Calculate maturity date (12 months from start date default)
      const startObj = new Date(startDate);
      const maturityObj = new Date(startObj);
      maturityObj.setMonth(maturityObj.getMonth() + input.totalInstallments);
      const maturityDate = maturityObj.toISOString().split('T')[0];

      const dbPayload = {
        customer_id: input.customerId,
        scheme_plan_id: input.schemePlanId,
        start_date: startDate,
        maturity_date: maturityDate,
        monthly_amount: input.monthlyAmount,
        total_installments: input.totalInstallments,
        status: 'ACTIVE',
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from('customer_schemes')
        .insert(dbPayload)
        .select('*')
        .single();

      if (error) {
        throw normalizeError(error);
      }

      if (!data) {
        throw new AppError('Failed to create customer scheme enrollment.', ErrorCode.INTERNAL_ERROR, 500);
      }

      return this.mapRowToCustomerScheme(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
