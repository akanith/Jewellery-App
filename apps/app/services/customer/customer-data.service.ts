import { CustomerSession } from '../../types';
import supabase from '../supabase/client';

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

    // 1. Direct Supabase RPC fetch (Fastest & SECURITY DEFINER)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_customer_scheme_data', {
        p_customer_id: session.customerId,
        p_mobile: session.mobileNumber,
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.customer) {
        let fullCustomer = { ...rpcRes.customer };
        // If address or nominee fields are missing from RPC payload, attempt direct fetch merge
        if (!fullCustomer.address && !fullCustomer.nominee_name) {
          try {
            const { data: extraCust } = await supabase
              .from('customers')
              .select('address, city, pincode, nominee_name, nominee_relationship, created_at')
              .eq('id', session.customerId)
              .maybeSingle();

            if (extraCust) {
              fullCustomer = { ...fullCustomer, ...extraCust };
            }
          } catch {
            /* ignore */
          }
        }

        return {
          customer: fullCustomer,
          scheme: rpcRes.scheme || null,
          schemePlanTitle: rpcRes.scheme?.scheme_plan_title || rpcRes.scheme_plan_title || 'Diwali Savings Scheme',
          installments: rpcRes.installments || [],
        };
      }
    } catch (rpcEx) {
      console.warn('[CustomerDataService] RPC fetch warning:', rpcEx);
    }

    // 2. Direct Supabase Table Query Fallback (filtered strictly by session.customerId)
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
            message: `Installment #${p.installment_number} payment of ₹${(p.paid_amount || p.expected_amount || p.due_amount || 1000).toLocaleString('en-IN')} received on ${p.payment_date || 'recently'}. Thank you!`,
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
