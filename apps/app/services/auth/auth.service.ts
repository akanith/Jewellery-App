import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerSession } from '../../types';
import supabase from '../supabase/client';

const SESSION_KEY = 'ramyas_customer_session';
const BACKEND_API_URL = 'http://localhost:3000/api/customer-app';

export class AuthService {
  /** Strip non-digits and normalize to 10-digit Indian mobile number. */
  static normalizeMobile(mobile: string): string {
    let clean = String(mobile || '').replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) clean = clean.substring(2);
    else if (clean.length > 10 && clean.startsWith('0')) clean = clean.substring(1);
    return clean;
  }

  /** Check valid 10-digit mobile format. */
  static isValidMobile(mobile: string): boolean {
    return /^[6-9]\d{9}$/.test(mobile);
  }

  /**
   * Mobile-only customer authentication flow.
   * Resolves customer identity from live Supabase Edge Function / Backend API.
   * Wipes previous session before establishing new customer identity.
   */
  static async signInWithMobile(mobile: string): Promise<CustomerSession> {
    const cleanMobile = this.normalizeMobile(mobile);

    console.log(`[CustomerAuth] Mobile login attempt for: ${cleanMobile}`);

    if (!this.isValidMobile(cleanMobile)) {
      console.log(`[CustomerAuth] Invalid mobile number format: ${cleanMobile}`);
      throw new Error('Enter a valid 10-digit mobile number.');
    }

    // Always clear previous customer session prior to authenticating new customer
    await this.signOut();

    let resData: any = null;
    let httpStatus = 500;

    // 1. Try Supabase Edge Function customer-mobile-login first
    try {
      const { data, error } = await supabase.functions.invoke('customer-mobile-login', {
        body: { mobile_number: cleanMobile },
      });

      if (!error && data?.success) {
        resData = data;
        httpStatus = 200;
      } else if (error || data) {
        if (data?.code === 'CUSTOMER_NOT_FOUND' || error?.status === 404) {
          httpStatus = 404;
          resData = data;
        } else if (data?.code === 'INVALID_MOBILE' || error?.status === 400) {
          httpStatus = 400;
          resData = data;
        }
      }
    } catch (edgeErr: any) {
      console.warn('[CustomerAuth] Edge Function call failed, trying API fallback:', edgeErr?.message);
    }

    // 2. Next.js API route fallback if Edge Function invocation did not resolve
    if (!resData || httpStatus === 500) {
      try {
        const apiRes = await fetch(`${BACKEND_API_URL}?mobile=${cleanMobile}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        httpStatus = apiRes.status;
        resData = await apiRes.json();
      } catch (apiErr: any) {
        console.warn('[CustomerAuth] API fetch exception:', apiErr?.message);
        throw new Error('Unable to connect. Please try again.');
      }
    }

    // Handle 404 Customer Not Found
    if (httpStatus === 404 || resData?.code === 'CUSTOMER_NOT_FOUND') {
      throw new Error('Customer not found. Please contact Ramyas Jeweller.');
    }

    // Handle 400 Invalid Mobile Number
    if (httpStatus === 400 || resData?.code === 'INVALID_MOBILE') {
      throw new Error('Enter a valid 10-digit mobile number.');
    }

    // Handle successful resolution
    if ((httpStatus === 200 || resData?.success) && (resData?.customer || resData?.session)) {
      const cust = resData.customer || {};
      const sess = resData.session || {};

      const session: CustomerSession = {
        token: sess.token || `c_sess_${cust.id}_${Date.now()}`,
        customerId: cust.id || sess.customerId,
        customerNumber: cust.customer_number || sess.customerNumber || cust.id,
        fullName: cust.full_name || sess.fullName || 'Valued Customer',
        mobileNumber: cust.mobile_number || sess.mobileNumber || cleanMobile,
        issuedAt: sess.issuedAt || new Date().toISOString(),
        expiresAt: sess.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      console.log(`[CustomerAuth] Customer resolved & session saved: ${session.fullName} (${session.customerId})`);
      return session;
    }

    throw new Error('Unable to connect. Please try again.');
  }

  /** Restore customer session from AsyncStorage on app startup. */
  static async restoreSession(): Promise<CustomerSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session: CustomerSession = JSON.parse(raw);
      if (!session?.customerId || !session?.mobileNumber) return null;

      // Check session expiration if present
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
