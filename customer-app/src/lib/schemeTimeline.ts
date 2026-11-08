import { TranslationKey } from '@/i18n';
import { SchemeSummary } from '@/types/dashboard';

export interface JourneyMonthStep {
  installmentNumber: number;
  monthKey: TranslationKey;
  year: number;
  calendarMonth: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isMaturityStep: boolean;
}

export interface SavingsJourneyOptions {
  scheme?: Partial<SchemeSummary> | null;
  paidCount?: number;
  totalCount?: number;
}

export const ALL_MONTH_KEYS_BY_INDEX: TranslationKey[] = [
  'jan', // 0
  'feb', // 1
  'mar', // 2
  'apr', // 3
  'may', // 4
  'jun', // 5
  'jul', // 6
  'aug', // 7
  'sep', // 8
  'oct', // 9
  'nov', // 10
  'dec', // 11
];

export const FULL_MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

/**
 * Parses month (0-11) and 4-digit year from ISO date strings, month-year strings, or returns null.
 */
export function parseMonthAndYear(
  input?: string | null
): { monthIndex: number; year: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern 1: ISO or date format YYYY-MM-DD or YYYY-MM
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11) {
      return { monthIndex: month, year };
    }
  }

  // Pattern 2: "October 2026", "Oct 2026", "October, 2026"
  const textMatch = trimmed.match(/([A-Za-z]+)[,\s]+(\d{4})/);
  if (textMatch) {
    const rawMonth = textMatch[1].toLowerCase();
    const rawYear = parseInt(textMatch[2], 10);
    if (rawMonth in MONTH_NAME_TO_INDEX && rawYear >= 2000 && rawYear <= 2100) {
      return { monthIndex: MONTH_NAME_TO_INDEX[rawMonth], year: rawYear };
    }
  }

  // Pattern 3: Standard Date parse fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { monthIndex: d.getMonth(), year: d.getFullYear() };
  }

  return null;
}

/**
 * Derives the scheme start month index (0-11) and year from available scheme attributes.
 * Defaults to October 2026 for the Ramyas Jeweller Diwali Savings Scheme cycle.
 */
export function getSchemeStartMonthAndYear(
  scheme?: Partial<SchemeSummary> | null
): { monthIndex: number; year: number } {
  // Default canonical cycle start for Ramyas Jeweller 2026-2027 scheme
  const DEFAULT_START = { monthIndex: 9, year: 2026 }; // October 2026

  if (!scheme) return DEFAULT_START;

  // 1. Direct explicit start date or month
  const directStart =
    parseMonthAndYear((scheme as any).startDate) ||
    parseMonthAndYear((scheme as any).start_month) ||
    parseMonthAndYear(scheme.startMonth);
  if (directStart) {
    return directStart;
  }

  // 2. Derive from currentInstallment (calendarMonth & installmentNumber)
  if (scheme.currentInstallment?.calendarMonth && scheme.currentInstallment.installmentNumber) {
    const currentParsed = parseMonthAndYear(scheme.currentInstallment.calendarMonth);
    if (currentParsed) {
      const offset = Math.max(0, scheme.currentInstallment.installmentNumber - 1);
      const calculated = new Date(currentParsed.year, currentParsed.monthIndex - offset, 1);
      return { monthIndex: calculated.getMonth(), year: calculated.getFullYear() };
    }
  }

  // 3. Derive from maturityDate or end_month (installment 12 is end_month)
  const maturityRaw =
    (scheme as any).endDate ||
    (scheme as any).end_month ||
    (scheme as any).endMonth ||
    scheme.maturityDate;
  if (maturityRaw) {
    const endParsed = parseMonthAndYear(maturityRaw);
    if (endParsed) {
      const totalInsts = scheme.totalInstallments || 12;
      const offset = Math.max(0, totalInsts - 1); // 11 months for a 12-month scheme
      const calculated = new Date(endParsed.year, endParsed.monthIndex - offset, 1);
      return { monthIndex: calculated.getMonth(), year: calculated.getFullYear() };
    }
  }

  return DEFAULT_START;
}

/**
 * Computes the 12-month journey sequence dynamically for any scheme.
 * For October 2026 cycle:
 * Installment 1: October 2026 (monthKey: 'oct')
 * Installment 12: September 2027 (monthKey: 'sep')
 */
export function generateSavingsJourneyMonths(
  options: SavingsJourneyOptions
): JourneyMonthStep[] {
  const { scheme } = options;
  const { monthIndex: startMonthIndex, year: startYear } = getSchemeStartMonthAndYear(scheme);

  const totalCount = scheme?.totalInstallments ?? options.totalCount ?? 12;
  const paidCount = scheme?.paidInstallments ?? options.paidCount ?? 0;

  const isSchemeOpen =
    !scheme?.status || scheme.status === 'ACTIVE';

  // Current installment calculation
  let currentStepNum = -1;
  if (isSchemeOpen && paidCount < totalCount) {
    if (scheme?.currentInstallment?.installmentNumber) {
      currentStepNum = scheme.currentInstallment.installmentNumber;
    } else {
      currentStepNum = paidCount + 1;
    }
  }

  const steps: JourneyMonthStep[] = [];

  for (let i = 0; i < totalCount; i++) {
    const stepNum = i + 1;
    const targetDate = new Date(startYear, startMonthIndex + i, 1);
    const mIndex = targetDate.getMonth();
    const yr = targetDate.getFullYear();
    const monthKey = ALL_MONTH_KEYS_BY_INDEX[mIndex];
    const calendarMonth = `${FULL_MONTH_NAMES_EN[mIndex]} ${yr}`;

    const isCompleted = stepNum <= paidCount;
    const isCurrent = stepNum === currentStepNum;
    const isMaturityStep = stepNum === totalCount;

    steps.push({
      installmentNumber: stepNum,
      monthKey,
      year: yr,
      calendarMonth,
      isCompleted,
      isCurrent,
      isMaturityStep,
    });
  }

  return steps;
}

/**
 * Computes maturity redemption month string (e.g., month after installment 12).
 * For October 2026 schemes (installments Oct 2026 - Sep 2027), maturity is "October 2027".
 * Supports both getMaturityMonthStr(installments) and getMaturityMonthStr(scheme, installments).
 */
export function getMaturityMonthStr(
  schemeOrInstallments?: Partial<SchemeSummary> | { calendarMonth?: string }[] | null,
  maybeInstallments?: { calendarMonth?: string }[]
): string {
  let scheme: Partial<SchemeSummary> | null = null;
  let installments: { calendarMonth?: string }[] | undefined = undefined;

  if (Array.isArray(schemeOrInstallments)) {
    installments = schemeOrInstallments;
  } else if (schemeOrInstallments) {
    scheme = schemeOrInstallments;
    installments = maybeInstallments;
  }

  // If passbook installments exist with at least one record
  if (installments && installments.length > 0) {
    const lastInst = installments[installments.length - 1];
    if (lastInst?.calendarMonth) {
      const parsed = parseMonthAndYear(lastInst.calendarMonth);
      if (parsed) {
        const nextMonthDate = new Date(parsed.year, parsed.monthIndex + 1, 1);
        return `${FULL_MONTH_NAMES_EN[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
      }
    }
  }

  // Calculate from scheme start + totalInstallments
  const { monthIndex: startMonthIndex, year: startYear } = getSchemeStartMonthAndYear(scheme);
  const total = scheme?.totalInstallments || 12;
  const maturityDate = new Date(startYear, startMonthIndex + total, 1);
  return `${FULL_MONTH_NAMES_EN[maturityDate.getMonth()]} ${maturityDate.getFullYear()}`;
}
