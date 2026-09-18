// Common constants for Ramyas Jeweller Savings Scheme System
// Core scheme parameters per confirmed business rules

export const SCHEME_CONSTANTS = {
  MONTHLY_INSTALLMENT_AMOUNT: 1000, // INR
  DURATION_MONTHS: 12,
  TOTAL_CONTRIBUTION_AMOUNT: 12000, // INR
  BONUS_AMOUNT: 1000, // INR (awarded strictly upon completion of 12 installments)
  MATURITY_AMOUNT: 13000, // INR
} as const;
