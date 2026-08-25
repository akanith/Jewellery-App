import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { Customer, CustomerStatus } from '@ramyas-jeweller/shared-types';

export interface CreateCustomerInput {
  fullName: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeMobile?: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput {
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeMobile?: string;
  status?: CustomerStatus;
}

export interface CustomerQueryParams {
  search?: string;
  status?: string;
}

export class CustomerService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Helper to map database snake_case row to camelCase Customer interface
   */
  private static mapRowToCustomer(row: Record<string, unknown>): Customer {
    return {
      id: String(row.id),
      customerNumber: String(row.customer_number ?? ''),
      profileId: row.profile_id ? String(row.profile_id) : null,
      fullName: String(row.full_name ?? ''),
      mobileNumber: String(row.mobile_number ?? ''),
      email: row.email ? String(row.email) : null,
      address: row.address ? String(row.address) : null,
      city: row.city ? String(row.city) : null,
      pincode: row.pincode ? String(row.pincode) : null,
      nomineeName: row.nominee_name ? String(row.nominee_name) : null,
      nomineeRelationship: row.nominee_relationship ? String(row.nominee_relationship) : null,
      nomineeMobile: row.nominee_mobile ? String(row.nominee_mobile) : null,
      status: (row.status as CustomerStatus) ?? 'ACTIVE',
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Retrieve customer list with optional search and status filtering
   */
  static async getCustomers(params?: CustomerQueryParams): Promise<Customer[]> {
    const supabase = this.getSupabase();

    try {
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

      if (params?.status && params.status !== 'ALL') {
        query = query.eq('status', params.status);
      }

      if (params?.search && params.search.trim() !== '') {
        const term = params.search.trim();
        query = query.or(`full_name.ilike.%${term}%,mobile_number.ilike.%${term}%,customer_number.ilike.%${term}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw normalizeError(error);
      }

      return (data ?? []).map((row) => this.mapRowToCustomer(row));
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(id: string): Promise<Customer> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new AppError(`Customer with ID "${id}" was not found.`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToCustomer(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Create a new customer in PostgreSQL public.customers
   */
  static async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const supabase = this.getSupabase();

    try {
      // Validate inputs
      const fullName = input.fullName.trim();
      const mobileNumber = input.mobileNumber.trim().replace(/\D/g, '');

      if (!fullName) {
        throw new AppError('Full name is required.', ErrorCode.VALIDATION_ERROR, 400);
      }

      if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
        throw new AppError('A valid 10-digit mobile number starting with 6-9 is required.', ErrorCode.VALIDATION_ERROR, 400);
      }

      const dbPayload = {
        full_name: fullName,
        mobile_number: mobileNumber,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        pincode: input.pincode?.trim() || null,
        nominee_name: input.nomineeName?.trim() || null,
        nominee_relationship: input.nomineeRelationship?.trim() || null,
        nominee_mobile: input.nomineeMobile?.trim() || null,
        status: input.status || 'ACTIVE',
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(dbPayload)
        .select('*')
        .single();

      if (error) {
        if (error.message.includes('unique constraint') || error.message.includes('customers_mobile_number_key')) {
          throw new AppError('A customer with this mobile number already exists.', ErrorCode.CONFLICT, 409);
        }
        throw normalizeError(error);
      }

      if (!data) {
        throw new AppError('Failed to create customer record.', ErrorCode.INTERNAL_ERROR, 500);
      }

      return this.mapRowToCustomer(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Update an existing customer record
   */
  static async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const supabase = this.getSupabase();

    try {
      const updateData: Record<string, unknown> = {};

      if (input.fullName !== undefined) updateData.full_name = input.fullName.trim();
      if (input.mobileNumber !== undefined) {
        const cleaned = input.mobileNumber.trim().replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleaned)) {
          throw new AppError('A valid 10-digit mobile number starting with 6-9 is required.', ErrorCode.VALIDATION_ERROR, 400);
        }
        updateData.mobile_number = cleaned;
      }
      if (input.email !== undefined) updateData.email = input.email ? input.email.trim() : null;
      if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
      if (input.city !== undefined) updateData.city = input.city ? input.city.trim() : null;
      if (input.pincode !== undefined) updateData.pincode = input.pincode ? input.pincode.trim() : null;
      if (input.nomineeName !== undefined) updateData.nominee_name = input.nomineeName ? input.nomineeName.trim() : null;
      if (input.nomineeRelationship !== undefined) updateData.nominee_relationship = input.nomineeRelationship ? input.nomineeRelationship.trim() : null;
      if (input.nomineeMobile !== undefined) updateData.nominee_mobile = input.nomineeMobile ? input.nomineeMobile.trim() : null;
      if (input.status !== undefined) updateData.status = input.status;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        if (error.message.includes('unique constraint') || error.message.includes('customers_mobile_number_key')) {
          throw new AppError('Another customer with this mobile number already exists.', ErrorCode.CONFLICT, 409);
        }
        throw normalizeError(error);
      }

      if (!data) {
        throw new AppError(`Failed to update customer with ID "${id}".`, ErrorCode.NOT_FOUND, 404);
      }

      return this.mapRowToCustomer(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
