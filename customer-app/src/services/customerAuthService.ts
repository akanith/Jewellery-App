import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CustomerAuthResult {
  success: boolean;
  message?: string;
  customer?: {
    mobileNumber: string;
  };
}

const CUSTOMER_SESSION_KEY = '@ramyas_customer_session';

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
 * Abstracted customer login method.
 * Enforces mobile-only authentication rules and prepares for BFF/Edge Function connection.
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
    // Save transient session state locally for customer app session
    await AsyncStorage.setItem(
      CUSTOMER_SESSION_KEY,
      JSON.stringify({
        mobileNumber: cleanedNumber,
        authenticatedAt: new Date().toISOString(),
      })
    );

    return {
      success: true,
      message: 'Mobile validation successful.',
      customer: {
        mobileNumber: cleanedNumber,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unable to complete login.';
    return {
      success: false,
      message: errorMsg,
    };
  }
};

export const getStoredCustomerSession = async (): Promise<{ mobileNumber: string } | null> => {
  try {
    const sessionStr = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);
    if (sessionStr) {
      const data = JSON.parse(sessionStr);
      if (data?.mobileNumber) {
        return { mobileNumber: data.mobileNumber };
      }
    }
  } catch {
    // Ignore storage read error
  }
  return null;
};

export const logoutCustomer = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
  } catch {
    // Ignore storage remove error
  }
};
