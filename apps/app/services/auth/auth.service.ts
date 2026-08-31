import { supabase } from '../supabase/client';
import { CustomerIdentity } from '../../types';

export class AuthService {
  /**
   * Normalize any Indian mobile number string to exact 10 digits
   * Handles: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
   */
  static normalizeMobile(mobile: string): string {
    let clean = mobile.replace(/\D/g, '');
    if (clean.length > 10 && clean.startsWith('91')) {
      clean = clean.substring(2);
    } else if (clean.length > 10 && clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    return clean;
  }

  /**
   * Construct internal email alias for Supabase Auth
   */
  static getInternalEmail(mobile: string): string {
    const cleanMobile = this.normalizeMobile(mobile);
    return `${cleanMobile}@customer.ramyas.local`;
  }

  /**
   * Authenticate customer using 10-digit mobile number and password
   */
  static async signInWithMobile(mobile: string, password: string): Promise<CustomerIdentity> {
    const cleanMobile = this.normalizeMobile(mobile);
    
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
    }

    const internalEmail = this.getInternalEmail(cleanMobile);
    console.log('[AuthDebug] Mobile:', cleanMobile, '-> Derived Email:', internalEmail);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (signInError || !signInData?.user) {
      if (signInError) {
        console.warn('[AuthDebug] Supabase Auth Error:', signInError.message, 'Code:', signInError.code, 'Status:', signInError.status);
      }
      throw new Error(signInError?.message || 'Incorrect mobile number or password.');
    }

    const identity = await this.resolveCustomerIdentity();
    if (!identity || !identity.isCustomerResolved) {
      await this.signOut();
      throw new Error('Customer profile link missing. Please contact shop admin to activate your account.');
    }

    return identity;
  }

  /**
   * Resolve full CustomerIdentity chain:
   * auth.users.id → public.profiles.id → public.customers.profile_id
   */
  static async resolveCustomerIdentity(): Promise<CustomerIdentity | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) return null;

    // 1. Fetch public.profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, mobile_number, role')
      .eq('id', user.id)
      .maybeSingle();

    // 2. Fetch customer ID via get_current_customer_id() RPC
    const { data: customerId } = await supabase.rpc('get_current_customer_id');

    let customerData = null;
    if (customerId) {
      const { data: custRec } = await supabase
        .from('customers')
        .select('id, customer_number, full_name, mobile_number')
        .eq('id', customerId)
        .maybeSingle();
      customerData = custRec;
    }

    const fullName = customerData?.full_name || profile?.full_name || 'Valued Customer';
    const mobileNumber = customerData?.mobile_number || profile?.mobile_number || '';
    const customerNumber = customerData?.customer_number || null;

    return {
      profileId: user.id,
      customerId: customerId || null,
      customerNumber,
      fullName,
      mobileNumber,
      role: profile?.role || 'CUSTOMER',
      isCustomerResolved: !!customerId,
    };
  }

  /**
   * Sign out customer session
   */
  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}

export default AuthService;
