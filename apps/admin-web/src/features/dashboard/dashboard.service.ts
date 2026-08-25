import { createClient } from '@/lib/supabase/client';
import { normalizeError } from '@/lib/errors/error-handler';
import { AdminDashboardStats } from '@ramyas-jeweller/shared-types';

export class DashboardService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Call PostgreSQL RPC `get_admin_dashboard_stats()` to retrieve live summary statistics
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

      if (error) {
        throw normalizeError(error);
      }

      if (!data) {
        return {
          totalCustomers: 0,
          activeSchemes: 0,
          totalCollections: 0,
          pendingInstallments: 0,
        };
      }

      const raw = data as Record<string, unknown>;

      return {
        totalCustomers: Number(raw.total_customers ?? 0),
        activeSchemes: Number(raw.active_schemes ?? 0),
        totalCollections: Number(raw.total_collections ?? 0),
        pendingInstallments: Number(raw.pending_installments ?? 0),
      };
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
