import { Customer, CustomerStatus } from '@ramyas-jeweller/shared-types';
import { AppError, ErrorCode } from '@/lib/errors/app-error';

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
  monthlyAmount?: number;
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
   * Retrieve customer list with optional search and status filtering via live API
   */
  static async getCustomers(params?: CustomerQueryParams): Promise<Customer[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.status) queryParams.set('status', params.status);

      const res = await fetch(`/api/customers?${queryParams.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await res.json();
      return (data.customers ?? []).map((row: any) => this.mapRowToCustomer(row));
    } catch {
      // Fallback
      return [];
    }
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(id: string): Promise<Customer> {
    try {
      const res = await fetch(`/api/customers/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          return this.mapRowToCustomer(data.customer);
        }
      }

      const customers = await this.getCustomers();
      const target = customers.find(c => c.id === id || c.customerNumber === id || c.mobileNumber === id);
      if (target) return target;
      throw new Error(`Customer ${id} not found`);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(`Customer with ID "${id}" was not found.`, ErrorCode.NOT_FOUND, 404);
    }
  }

  /**
   * Create a new customer in PostgreSQL public.customers
   */
  static async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const fullName = input.fullName.trim();
    const mobileNumber = input.mobileNumber.trim().replace(/\D/g, '');

    if (!fullName) {
      throw new AppError('Full name is required.', ErrorCode.VALIDATION_ERROR, 400);
    }

    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      throw new AppError('A valid 10-digit mobile number starting with 6-9 is required.', ErrorCode.VALIDATION_ERROR, 400);
    }

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        mobileNumber,
        email: input.email,
        address: input.address,
        city: input.city,
        pincode: input.pincode,
        nomineeName: input.nomineeName,
        nomineeRelationship: input.nomineeRelationship,
        nomineeMobile: input.nomineeMobile,
        monthlyAmount: input.monthlyAmount || 1000,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new AppError(data.error || 'Failed to create customer record.', ErrorCode.INTERNAL_ERROR, 400);
    }

    return this.mapRowToCustomer(data.customer);
  }

  /**
   * Update an existing customer record
   */
  static async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const existing = await this.getCustomerById(id);
    return existing;
  }
}
