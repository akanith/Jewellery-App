/**
 * SHARED VALIDATION FOUNDATION
 * 
 * Note: Business validation rules (mobile number format, customer data validation,
 * scheme plan rules, installment calculations, redemption constraints) will be
 * implemented in Phase 2 alongside database schema definitions.
 */

export const PHONE_NUMBER_REGEX = /^[6-9]\d{9}$/;

export function isValidIndianMobileNumber(mobile: string): boolean {
  const cleaned = mobile.trim().replace(/\D/g, '');
  return PHONE_NUMBER_REGEX.test(cleaned);
}
