import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CustomerSession {
  token: string;
  customerCode: string;
  fullName: string;
  mobileNumber: string;
  isAuthenticated: boolean;
  authenticatedAt: string;
}

export interface CustomerAuthResult {
  success: boolean;
  message?: string;
  session?: CustomerSession;
}

const CUSTOMER_SESSION_KEY = '@ramyas_customer_session';

const BFF_BASE_URL =
  process.env.EXPO_PUBLIC_BFF_BASE_URL ||
  'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';

/**
 * Sanitizes mobile number input.
 * Strips spaces, +91 prefix, and non-numeric characters.
 */
export const sanitizeMobileNumber = (input: string): string => {
  let cleaned = input.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }
  return cleaned.slice(0, 10);
};

/**
 * Validates 10-digit Indian mobile number.
 */
export const validateMobileNumber = (mobileNumber: string): { isValid: boolean; error?: string } => {
  const cleaned = sanitizeMobileNumber(mobileNumber);
  if (!cleaned) {
    return { isValid: false, error: 'Mobile number is required.' };
  }
  if (cleaned.length < 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
  }
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid mobile number starting with 6, 7, 8, or 9.' };
  }
  return { isValid: true };
};

/**
 * Authenticates customer via real Customer BFF /auth/login.
 * Returns raw server session token and real customer identity.
 */
export const loginWithMobile = async (mobileNumber: string): Promise<CustomerAuthResult> => {
  const validation = validateMobileNumber(mobileNumber);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'Invalid mobile number.',
    };
  }

  const cleanedNumber = sanitizeMobileNumber(mobileNumber);

  try {
    const response = await fetch(`${BFF_BASE_URL}/customer-bff/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber: cleanedNumber }),
    });

    const json = await response.json().catch(() => null);

    if (response.status === 401 || !response.ok || !json?.success) {
      return {
        success: false,
        message:
          'Invalid mobile number or customer account not active. Please contact Ramyas Jeweller.',
      };
    }

    const session: CustomerSession = {
      token: json.token,
      customerCode: json.customer.customerCode,
      fullName: json.customer.fullName,
      mobileNumber: json.customer.mobileNumber,
      isAuthenticated: true,
      authenticatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      message: 'Login successful.',
      session,
    };
  } catch {
    return {
      success: false,
      message:
        'Unable to connect to service. Please check your network connection and try again.',
    };
  }
};

/**
 * Retrieves the stored real customer session from AsyncStorage.
 */
export const getStoredCustomerSession = async (): Promise<CustomerSession | null> => {
  try {
    const sessionStr = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);
    if (sessionStr) {
      const data: CustomerSession = JSON.parse(sessionStr);
      if (data?.token && data?.isAuthenticated) {
        return data;
      }
    }
  } catch {
    // Ignore storage read error
  }
  return null;
};

/**
 * Revokes the server-side customer session via BFF and clears local session.
 * Preserves the customer's language preference (@ramyas_customer_language).
 */
export const logoutCustomer = async (callServer = true): Promise<void> => {
  try {
    if (callServer) {
      const sessionStr = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);
      if (sessionStr) {
        const session: CustomerSession = JSON.parse(sessionStr);
        if (session?.token) {
          await fetch(`${BFF_BASE_URL}/customer-bff/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
          }).catch(() => {
            // Ignore server logout network error
          });
        }
      }
    }
  } catch {
    // Ignore error
  } finally {
    // Always clear session locally, preserving language preference
    await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
  }
};
