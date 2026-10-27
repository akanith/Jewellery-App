import { Linking, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAZORPAY_CONFIG } from '@/constants/paymentConfig';
import { OFFICIAL_SHOP_INFO } from '@/constants/shopData';
import { formatCurrency } from '@/lib/formatters';
import { initiateOnlinePayment } from '@/services/customerDataService';

const PENDING_PAYMENT_STORAGE_PREFIX = '@ramyas_pending_payment_attempt_';

let isOpeningPaymentUrl = false;
let lastOpenTimestamp = 0;
let activePendingAttemptId: string | null = null;

export interface PaymentLaunchResult {
  success: boolean;
  paymentAttemptId?: string;
  reason?: 'AMOUNT_MISMATCH' | 'CANNOT_OPEN' | 'DEBOUNCED' | 'INITIATION_FAILED';
  fallback?: boolean;
}

export interface PersistedPaymentAttempt {
  attemptId: string;
  customerId?: string;
  schemeId?: string;
  installmentNumber?: number;
  createdAt: number;
}

/**
 * Returns the currently active pending online payment attempt ID (in-memory).
 */
export function getActivePaymentAttemptId(): string | null {
  return activePendingAttemptId;
}

/**
 * Clears the active pending payment attempt ID (in-memory).
 */
export function clearActivePaymentAttemptId(): void {
  activePendingAttemptId = null;
}

/**
 * Persists pending payment attempt to AsyncStorage keyed by customer ID.
 */
export async function persistPendingPaymentAttempt(
  customerId: string,
  attempt: PersistedPaymentAttempt
): Promise<void> {
  activePendingAttemptId = attempt.attemptId;
  try {
    await AsyncStorage.setItem(
      `${PENDING_PAYMENT_STORAGE_PREFIX}${customerId}`,
      JSON.stringify(attempt)
    );
  } catch (err) {
    console.warn('[PaymentService] Failed to persist pending payment attempt:', err);
  }
}

/**
 * Retrieves persisted pending payment attempt for the customer.
 * Automatically clears attempt if older than 60 minutes.
 */
export async function getPersistedPendingPaymentAttempt(
  customerId?: string
): Promise<PersistedPaymentAttempt | null> {
  if (activePendingAttemptId) {
    return {
      attemptId: activePendingAttemptId,
      customerId,
      createdAt: Date.now(),
    };
  }
  if (!customerId) return null;
  try {
    const raw = await AsyncStorage.getItem(`${PENDING_PAYMENT_STORAGE_PREFIX}${customerId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPaymentAttempt;
    // Expire attempt if older than 60 minutes
    if (Date.now() - parsed.createdAt > 60 * 60 * 1000) {
      await clearPersistedPendingPaymentAttempt(customerId);
      return null;
    }
    activePendingAttemptId = parsed.attemptId;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears persisted pending payment attempt from storage and in-memory cache.
 */
export async function clearPersistedPendingPaymentAttempt(
  customerId?: string
): Promise<void> {
  activePendingAttemptId = null;
  if (customerId) {
    try {
      await AsyncStorage.removeItem(`${PENDING_PAYMENT_STORAGE_PREFIX}${customerId}`);
    } catch (err) {
      console.warn('[PaymentService] Failed to clear pending payment attempt:', err);
    }
  }
}

/**
 * Safely opens the official Razorpay payment page for the due installment.
 *
 * Server-Verified Online Payment Flow:
 * 1. Debounces rapid taps to prevent opening multiple checkout links.
 * 2. Calls authenticated BFF endpoint /payment/initiate to correlate customer,
 *    active scheme, due installment, and generate a dynamic Razorpay Payment Link.
 * 3. Rejects initiation if Razorpay gateway is unconfigured; does NOT open static
 *    generic payment links under the pretense of automated reconciliation.
 * 4. Persists the created attempt safely in storage for resumption across app restarts.
 * 5. Does NOT collect or handle card details, UPI PINs, or secrets in the mobile app.
 */
export async function openRazorpayHostedCheckout(
  dueAmount: number,
  calendarMonth: string,
  installmentNumber?: number,
  schemeId?: string,
  customerId?: string
): Promise<PaymentLaunchResult> {
  const now = Date.now();
  if (isOpeningPaymentUrl || now - lastOpenTimestamp < 1500) {
    return { success: false, reason: 'DEBOUNCED' };
  }

  // 1. Amount validation against the standard installment amount
  if (dueAmount > 0 && dueAmount !== RAZORPAY_CONFIG.encodedAmountInr) {
    const formattedDue = formatCurrency(dueAmount);
    const formattedSupported = formatCurrency(RAZORPAY_CONFIG.encodedAmountInr);

    const title = 'Online Payment Amount Notice';
    const message =
      `The online payment link is currently configured for standard ${formattedSupported} monthly installments.\n\n` +
      `Your current installment due is ${formattedDue} (${calendarMonth}).\n\n` +
      `To avoid an incorrect payment amount, please pay by Cash at our showroom (${OFFICIAL_SHOP_INFO.phone}) or contact support for customized payment assistance.`;

    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: 'Understood' }]);
    }

    return { success: false, reason: 'AMOUNT_MISMATCH' };
  }

  isOpeningPaymentUrl = true;
  lastOpenTimestamp = now;

  try {
    // 2. Authenticated server-side payment attempt creation
    const initiateRes = await initiateOnlinePayment(schemeId, installmentNumber);

    if (!initiateRes.success || !initiateRes.data?.paymentLinkUrl) {
      const isUnconfigured = initiateRes.code === 'PAYMENT_GATEWAY_NOT_CONFIGURED';
      const title = isUnconfigured ? 'Online Payments Unavailable' : 'Payment Initiation Notice';
      const message = isUnconfigured
        ? 'Online payment gateway integration is currently undergoing setup.\n\n' +
          `To ensure your installment is safely and immediately recorded in your passbook, please pay by Cash at our showroom counter (${OFFICIAL_SHOP_INFO.phone}) or contact support.`
        : (initiateRes.error || 'Unable to initialize online checkout. Please pay at the showroom counter or try again later.');

      if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
      } else {
        Alert.alert(title, message, [{ text: 'Understood' }]);
      }

      return {
        success: false,
        reason: 'INITIATION_FAILED',
      };
    }

    const targetUrl = initiateRes.data.paymentLinkUrl;
    const paymentAttemptId = initiateRes.data.paymentAttemptId;

    // 3. Persist pending attempt safely for app resumption
    if (customerId) {
      await persistPendingPaymentAttempt(customerId, {
        attemptId: paymentAttemptId,
        customerId,
        schemeId,
        installmentNumber,
        createdAt: Date.now(),
      });
    } else {
      activePendingAttemptId = paymentAttemptId;
    }

    // 4. Open hosted checkout URL in external browser
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return { success: true, paymentAttemptId };
      }
    }

    const supported = await Linking.canOpenURL(targetUrl).catch(() => true);
    if (!supported) {
      throw new Error('Unsupported URL scheme');
    }

    await Linking.openURL(targetUrl);
    return { success: true, paymentAttemptId };
  } catch (error) {
    console.error('[PaymentService] Error opening Razorpay URL:', error);

    const title = 'Unable to Open Checkout';
    const message =
      'Could not open the secure payment page in your browser. Please check your internet connection or default browser settings and try again.';

    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: 'OK' }]);
    }

    return { success: false, reason: 'CANNOT_OPEN' };
  } finally {
    setTimeout(() => {
      isOpeningPaymentUrl = false;
    }, 1500);
  }
}
