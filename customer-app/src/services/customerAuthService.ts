import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildBffUrl } from './urlConfig';

export interface CustomerProfileOption {
  customerId: string;
  customerCode: string;
  fullName: string;
  mobileNumber: string;
  passwordStatus?: 'RESET_REQUIRED' | 'ACTIVE' | 'LOCKED';
  schemeCount?: number;
  isSelected?: boolean;
}

export interface CustomerSession {
  token: string;
  customerId?: string;
  customerCode: string;
  fullName: string;
  mobileNumber: string;
  passwordStatus?: 'RESET_REQUIRED' | 'ACTIVE' | 'LOCKED';
  isAuthenticated: boolean;
  authenticatedAt: string;
  authorizedProfiles?: CustomerProfileOption[];
}

export interface CustomerAuthResult {
  success: boolean;
  message?: string;
  session?: CustomerSession;
  requiresSelection?: boolean;
  profiles?: CustomerProfileOption[];
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  isNetworkError?: boolean;
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
 * Validates new password criteria (at least 8 chars, 1 letter, 1 number).
 */
export const validatePasswordCriteria = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter and one number.' };
  }
  return { isValid: true };
};

/**
 * Authenticates customer via real Customer BFF /auth/login with mobile number and password.
 * Returns raw server session token, real customer identity, password status, and all authorized profiles.
 */
export const loginWithMobile = async (mobileNumber: string, password?: string): Promise<CustomerAuthResult> => {
  const validation = validateMobileNumber(mobileNumber);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'Invalid mobile number.',
    };
  }

  if (!password || !password.trim()) {
    return {
      success: false,
      message: 'Password is required.',
    };
  }

  const cleanedNumber = sanitizeMobileNumber(mobileNumber);

  try {
    const url = buildBffUrl('/auth/login');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber: cleanedNumber, password: password.trim() }),
    });

    const json = await response.json().catch(() => null);

    if (response.status === 423 || json?.error?.includes('locked') || json?.error?.includes('Too many')) {
      return {
        success: false,
        message: json?.error || 'Too many unsuccessful attempts. Account is temporarily locked. Please try again later.',
      };
    }

    if (response.status === 401 || !response.ok || !json?.success) {
      return {
        success: false,
        message:
          json?.error || 'Invalid mobile number or password. Please try again.',
      };
    }

    const profilesList: CustomerProfileOption[] = Array.isArray(json.profiles)
      ? json.profiles.map((p: any) => ({
          customerId: p.customerId || p.customer_id,
          customerCode: p.customerCode || p.customer_code,
          fullName: p.fullName || p.full_name,
          mobileNumber: sanitizeMobileNumber(p.mobileNumber || p.phone_number || cleanedNumber),
          passwordStatus: p.passwordStatus || p.password_status || 'ACTIVE',
          schemeCount: p.schemeCount ?? p.scheme_count ?? 0,
        }))
      : [];

    const requiresSelection = Boolean(json.requiresSelection) || profilesList.length > 1;

    const session: CustomerSession = {
      token: json.token,
      customerId: json.customer.customerId,
      customerCode: json.customer.customerCode,
      fullName: json.customer.fullName,
      mobileNumber: sanitizeMobileNumber(json.customer.mobileNumber || cleanedNumber),
      passwordStatus: json.customer.passwordStatus || 'ACTIVE',
      isAuthenticated: true,
      authenticatedAt: new Date().toISOString(),
      authorizedProfiles: profilesList,
    };

    await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      message: 'Login successful.',
      session,
      requiresSelection,
      profiles: profilesList,
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
 * Changes customer password via BFF /auth/change-password.
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string; passwordStatus?: 'ACTIVE' }> => {
  if (!oldPassword || !oldPassword.trim()) {
    return {
      success: false,
      message: 'Session identity missing or temporary password invalid. Please log in again.',
    };
  }

  try {
    const session = await getStoredCustomerSession();
    if (!session?.token) {
      return { success: false, message: 'Session expired. Please log in again.' };
    }

    const url = buildBffUrl('/auth/change-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.success) {
      return {
        success: false,
        message: json?.error || 'Failed to update password.',
      };
    }

    // Update stored session passwordStatus to ACTIVE
    session.passwordStatus = 'ACTIVE';
    await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      message: 'Password updated successfully.',
      passwordStatus: 'ACTIVE',
    };
  } catch {
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
};

/**
 * Requests password reset via BFF POST /auth/forgot-password.
 * Always returns generic success response for anti-account enumeration protection.
 */
export const requestPasswordReset = async (
  mobileNumber: string
): Promise<PasswordResetResult> => {
  const validation = validateMobileNumber(mobileNumber);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'Invalid mobile number.',
    };
  }

  const cleanedNumber = sanitizeMobileNumber(mobileNumber);

  try {
    const url = buildBffUrl('/auth/forgot-password');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber: cleanedNumber }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        message:
          json?.error ||
          'Unable to submit the password reset request right now. Please contact Ramyas Jeweller.',
      };
    }

    const safeMessage =
      json?.message ||
      'If the mobile number is registered, a password reset request has been submitted. Please contact Ramyas Jeweller.';

    return {
      success: true,
      message: safeMessage,
    };
  } catch {
    return {
      success: false,
      isNetworkError: true,
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
          const url = buildBffUrl('/auth/logout');
          await fetch(url, {
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

/**
 * Switches the active profile within an authorized session.
 * Communicates with BFF POST /auth/select-profile.
 */
export const selectCustomerProfile = async (
  targetCustomerId: string
): Promise<{ success: boolean; message?: string; session?: CustomerSession }> => {
  try {
    const session = await getStoredCustomerSession();
    if (!session?.token) {
      return { success: false, message: 'Session expired. Please log in again.' };
    }

    const url = buildBffUrl('/auth/select-profile');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ customerId: targetCustomerId }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      return {
        success: false,
        message: json?.error || 'Failed to select customer profile.',
      };
    }

    // Update stored active customer identity
    const updatedCustomer = json.customer;
    session.customerId = updatedCustomer.customerId || targetCustomerId;
    session.customerCode = updatedCustomer.customerCode || session.customerCode;
    session.fullName = updatedCustomer.fullName || session.fullName;
    session.passwordStatus = updatedCustomer.passwordStatus || session.passwordStatus;

    if (session.authorizedProfiles) {
      session.authorizedProfiles = session.authorizedProfiles.map((p) => ({
        ...p,
        isSelected: p.customerId === session.customerId,
      }));
    }

    await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };
  } catch {
    return { success: false, message: 'Unable to connect to service. Please try again.' };
  }
};

/**
 * Fetches all customer profiles authorized for the current verified phone.
 */
export const getAuthorizedProfiles = async (): Promise<CustomerProfileOption[]> => {
  try {
    const session = await getStoredCustomerSession();
    if (!session?.token) return [];

    const url = buildBffUrl('/auth/profiles');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    const json = await response.json().catch(() => null);
    if (response.ok && json?.success && Array.isArray(json.profiles)) {
      const freshProfiles = json.profiles.map((p: any) => ({
        customerId: p.customerId,
        customerCode: p.customerCode,
        fullName: p.fullName,
        mobileNumber: p.mobileNumber,
        passwordStatus: p.passwordStatus,
        schemeCount: p.schemeCount,
        isSelected: p.customerId === session.customerId,
      }));

      // Cache on session
      session.authorizedProfiles = freshProfiles;
      await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
      return freshProfiles;
    }

    return session.authorizedProfiles || [];
  } catch {
    const session = await getStoredCustomerSession();
    return session?.authorizedProfiles || [];
  }
};
