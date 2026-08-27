/**
 * SHARED BUSINESS CONSTANTS
 * 
 * Central source of truth for Roles, Statuses, Payment Methods,
 * Scheme States, Redemption States, and Application Configurations.
 * 
 * Prevent scattering raw string literals (e.g., "PAID", "OWNER", "REDEEMED")
 * throughout frontend and mobile applications.
 */

export const USER_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const SCHEME_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  REDEEMED: 'REDEEMED',
  CLOSED_EARLY: 'CLOSED_EARLY',
  DEFAULTED: 'DEFAULTED',
} as const;

export type SchemeStatus = typeof SCHEME_STATUS[keyof typeof SCHEME_STATUS];

export const INSTALLMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  FAILED: 'FAILED',
} as const;

export type InstallmentStatus = typeof INSTALLMENT_STATUS[keyof typeof INSTALLMENT_STATUS];

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ONLINE_GATEWAY: 'ONLINE_GATEWAY',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  Cash: 'CASH',
  GPay: 'UPI',
  PhonePe: 'UPI',
  Paytm: 'UPI',
  NetBank: 'BANK_TRANSFER',
  Card: 'CARD',
  CASH: 'CASH',
  GPAY: 'UPI',
  PHONEPE: 'UPI',
  PAYTM: 'UPI',
  NETBANK: 'BANK_TRANSFER',
  NETBANKING: 'BANK_TRANSFER',
  CARD: 'CARD',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  ONLINE_GATEWAY: 'ONLINE_GATEWAY',
} as const;

export function toCanonicalPaymentMethod(method: string | null | undefined): PaymentMethod {
  if (!method) return 'CASH';
  const trimmed = method.trim();
  if (PAYMENT_METHOD_MAP[trimmed]) {
    return PAYMENT_METHOD_MAP[trimmed];
  }
  const upper = trimmed.toUpperCase();
  if (PAYMENT_METHOD_MAP[upper]) {
    return PAYMENT_METHOD_MAP[upper];
  }
  return 'CASH';
}

export const REDEMPTION_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export type RedemptionStatus = typeof REDEMPTION_STATUS[keyof typeof REDEMPTION_STATUS];

export const APP_CONFIG = {
  APP_NAME: 'Ramyas Jeweller Savings Scheme',
  CURRENCY_SYMBOL: '₹',
  CURRENCY_CODE: 'INR',
  DEFAULT_PAGE_SIZE: 20,
} as const;
