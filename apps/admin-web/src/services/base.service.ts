import { createClient } from '@/lib/supabase/client';
import { normalizeError } from '@/lib/errors/error-handler';
import { AppError } from '@/lib/errors/app-error';

/**
 * ABSTRACT BASE SERVICE
 * 
 * All feature services (CustomerService, SchemeService, PaymentService, etc.)
 * extend this class to ensure safe execution, error normalization, and consistent logger access.
 */
export abstract class BaseService {
  protected get client() {
    return createClient();
  }

  /**
   * Safely wraps database / network execution with standardized error normalization.
   */
  protected async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Evaluates Supabase query response and throws normalized AppError if error is present.
   */
  protected handleResponse<T>(data: T | null, error: unknown): T {
    if (error) {
      throw normalizeError(error);
    }
    if (data === null) {
      throw new AppError('Requested resource was not found.', undefined, 404);
    }
    return data;
  }
}
