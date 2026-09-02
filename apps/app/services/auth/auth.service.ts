import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerSession } from '../../types';
import supabase from '../supabase/client';

const SESSION_KEY = 'ramyas_customer_session';

export class AuthService {
  /** Strip non-digits and normalize to 10-digit Indian mobile number. */
  static normalizeMobile(mobile: string): string {
    let clean = String(mobile || '').replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
    else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);
    return clean;
  }

  /** Check valid 10-digit mobile format starting with 6-9. */
  static isValidMobile(mobile: string): boolean {
    return /^[6-9]\d{9}$/.test(mobile);
  }

  /**
   * Mobile-only customer authentication flow.
   * Resolves customer identity directly from Supabase Cloud PostgreSQL.
   * Wipes previous session before establishing new customer identity.
   */
  static async signInWithMobile(mobile: string): Promise<CustomerSession> {
    const cleanMobile = this.normalizeMobile(mobile);

    console.log(`[CustomerAuth] Starting mobile login for: ${cleanMobile}`);

    if (!this.isValidMobile(cleanMobile)) {
      console.log(`[CustomerAuth] Invalid mobile format: ${cleanMobile}`);
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Always clear previous customer session prior to authenticating new customer
    await this.signOut();

    try {
      // 1. Direct Supabase RPC lookup (SECURITY DEFINER, no auth.users dependency)
      let cust: any = null;

      try {
        const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_customer_by_mobile', {
          p_mobile: cleanMobile,
        });

        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          cust = rpcRows[0];
          console.log(`[CustomerAuth] Customer resolved via get_customer_by_mobile RPC: ${cust.full_name}`);
        }
      } catch (rpcEx) {
        console.warn('[CustomerAuth] RPC call warning:', rpcEx);
      }

      // 2. Direct public.customers table query fallback
      if (!cust) {
        const { data: dbCust, error: dbErr } = await supabase
          .from('customers')
          .select('id, full_name, mobile_number, customer_number, status')
          .eq('mobile_number', cleanMobile)
          .maybeSingle();

        if (dbErr) {
          console.error('[CustomerAuth] Direct DB lookup error:', dbErr.message);
        } else if (dbCust) {
          cust = dbCust;
          console.log(`[CustomerAuth] Customer resolved via direct table query: ${cust.full_name}`);
        }
      }

      // 3. Optional Edge Function / Backend API lookup if client DB query returned nothing
      if (!cust) {
        try {
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('customer-mobile-login', {
            body: { mobile_number: cleanMobile },
          });

          if (!edgeErr && edgeData?.success && edgeData?.customer) {
            cust = edgeData.customer;
          }
        } catch {
          /* ignore edge error */
        }
      }

      // If customer is found in database -> Create and save session
      if (cust && cust.id) {
        const session: CustomerSession = {
          token: `c_sess_${cust.id}_${Date.now()}`,
          customerId: cust.id,
          customerNumber: cust.customer_number || cust.id,
          fullName: cust.full_name || 'Valued Customer',
          mobileNumber: cust.mobile_number || cleanMobile,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
        console.log(`[CustomerAuth] Session established for ${session.fullName} (${session.customerId})`);
        return session;
      }

      // If database query executed and customer was not found -> 404 Customer Not Found
      throw new Error('Customer not found. Please contact Ramyas Jeweller.');
    } catch (err: any) {
      if (
        err.message?.includes('Customer not found') ||
        err.message?.includes('valid 10-digit')
      ) {
        throw err;
      }
      console.error('[CustomerAuth] Authentication exception:', err?.message);
      throw new Error('Unable to connect. Please check your connection and try again.');
    }
  }

  /** Restore customer session from AsyncStorage on app startup. */
  static async restoreSession(): Promise<CustomerSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session: CustomerSession = JSON.parse(raw);
      if (!session?.customerId || !session?.mobileNumber) return null;

      if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        console.log('[CustomerAuth] Session expired — clearing session');
        await this.signOut();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /** Sign out — clear session completely from AsyncStorage. */
  static async signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
    console.log('[CustomerAuth] Customer session completely cleared');
  }
}

export default AuthService;
