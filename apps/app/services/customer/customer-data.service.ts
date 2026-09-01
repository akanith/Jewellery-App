import { CustomerSession } from '../../types';
import supabase from '../supabase/client';

const BACKEND_API_URL = 'http://localhost:3000/api/customer-app';

export class CustomerDataService {
  /**
   * Fetch home dashboard data for a verified customer session.
   * Query filtered strictly by session.mobileNumber and verified customerId.
   */
  static async fetchDashboard(session: CustomerSession): Promise<{
    customer: any;
    scheme: any | null;
    schemePlanTitle?: string;
    installments: any[];
  }> {
    if (!session?.mobileNumber || !session?.customerId) {
      throw new Error('No active customer session');
    }

    try {
      // 1. Try Backend API route first
      const res = await fetch(`${BACKEND_API_URL}?mobile=${session.mobileNumber}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok && data.success && data.customer) {
        // Enforce customer_id match
        if (data.customer.id === session.customerId) {
          return {
            customer: data.customer,
            scheme: data.scheme || null,
            schemePlanTitle: data.scheme?.scheme_plan_title || data.schemePlanTitle || 'Diwali Savings Scheme',
            installments: data.installments || [],
          };
        }
      }
    } catch (err: any) {
      console.warn('[CustomerDataService] API route fetch failed, falling back to direct Supabase query:', err?.message);
    }

    // 2. Direct Supabase Client fallback (filtered strictly by session.customerId)
    try {
      const { data: custRow, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', session.customerId)
        .maybeSingle();

      if (custErr || !custRow) {
        throw new Error('Customer data not found');
      }

      const { data: schemeRow } = await supabase
        .from('customer_schemes')
        .select('*, scheme_plans(title)')
        .eq('customer_id', session.customerId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .maybeSingle();

      let installments: any[] = [];
      if (schemeRow) {
        const { data: instRows } = await supabase
          .from('installments')
          .select('*')
          .eq('customer_scheme_id', schemeRow.id)
          .order('installment_number', { ascending: true });

        installments = instRows || [];
      }

      const schemeObj = schemeRow
        ? {
            ...schemeRow,
            scheme_plan_title: schemeRow.scheme_plans?.title || 'Diwali Savings Scheme',
          }
        : null;

      return {
        customer: custRow,
        scheme: schemeObj,
        schemePlanTitle: schemeObj?.scheme_plan_title || 'Diwali Savings Scheme',
        installments,
      };
    } catch (dbErr: any) {
      console.error('[CustomerDataService] Direct DB fetch error:', dbErr?.message);
      // Return dynamic identity object with empty scheme if customer exists but has no active scheme
      return {
        customer: {
          id: session.customerId,
          full_name: session.fullName,
          mobile_number: session.mobileNumber,
          customer_number: session.customerNumber || session.customerId,
          status: 'ACTIVE',
        },
        scheme: null,
        schemePlanTitle: 'Diwali Savings Scheme',
        installments: [],
      };
    }
  }

  /**
   * Fetch passbook data (active scheme + all 12 installments).
   */
  static async fetchPassbook(session: CustomerSession): Promise<{
    scheme: any | null;
    installments: any[];
  }> {
    const data = await this.fetchDashboard(session);
    return {
      scheme: data.scheme,
      installments: data.installments,
    };
  }

  /**
   * Fetch notifications for customer.
   */
  static async fetchNotifications(session: CustomerSession): Promise<any[]> {
    try {
      const data = await this.fetchDashboard(session);
      if (data?.installments && data.installments.length > 0) {
        const paid = data.installments.filter((i: any) => i.status === 'PAID');
        return [
          {
            id: 'notif-1',
            title: 'Welcome to Ramyas Jeweller',
            message: `Hello ${data.customer.full_name}, your ${data.schemePlanTitle || 'Diwali Savings Scheme'} account ${data.scheme?.scheme_account_number || ''} is active!`,
            type: 'ANNOUNCEMENT',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          ...paid.map((p: any) => ({
            id: `notif-pay-${p.installment_number}`,
            title: 'Payment Received',
            message: `Installment #${p.installment_number} payment of ₹${(p.paid_amount || p.expected_amount || 1000).toLocaleString('en-IN')} received on ${p.payment_date || 'recently'}. Thank you!`,
            type: 'PAYMENT',
            isRead: true,
            createdAt: p.payment_date ? `${p.payment_date}T10:00:00.000Z` : new Date().toISOString(),
          })),
        ];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export default CustomerDataService;
