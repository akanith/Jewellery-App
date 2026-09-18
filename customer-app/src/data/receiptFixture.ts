import { CustomerInstallmentReceipt } from '@/types/receipt';

// Presentation-safe fixture data matching approved reference UI
export const defaultReceiptFixture: CustomerInstallmentReceipt = {
  receiptId: 'rec_008',
  receiptNumber: 'RJ-2026-0098',
  customerId: 'RJ-2026-0145',
  customerName: 'Anith',
  schemeId: 'sch_001',
  schemeCode: 'SLS-12M',
  schemeName: 'Gold Savings',
  installmentNumber: 8,
  totalInstallments: 12,
  installmentAmount: 1000,
  paymentDate: '05 September 2026',
  paymentMethod: 'Cash',
  transactionReference: 'TXN-884920',
  collectedAt: 'Ramyas Jeweller',
  collectedBy: 'Cash Counter',
  paidTotal: 8000,
  remainingContribution: 4000,
  bonusAmount: 1000,
  nextInstallmentMonth: 'October 2026',
  isSchemeCompleted: false,
};

export const completedSchemeReceiptFixture: CustomerInstallmentReceipt = {
  receiptId: 'rec_012',
  receiptNumber: 'RJ-2027-0142',
  customerId: 'RJ-2026-0145',
  customerName: 'Anith',
  schemeId: 'sch_001',
  schemeCode: 'SLS-12M',
  schemeName: 'Gold Savings',
  installmentNumber: 12,
  totalInstallments: 12,
  installmentAmount: 1000,
  paymentDate: '05 February 2027',
  paymentMethod: 'Cash',
  transactionReference: 'TXN-995810',
  collectedAt: 'Ramyas Jeweller',
  collectedBy: 'Cash Counter',
  paidTotal: 12000,
  remainingContribution: 0,
  bonusAmount: 1000,
  nextInstallmentMonth: undefined,
  isSchemeCompleted: true,
};

/**
 * Returns a typed receipt model based on receiptId or installmentNumber.
 * Falls back to defaultReceiptFixture for presentation demonstration.
 */
export const getReceiptByIdOrNumber = (
  receiptId?: string,
  installmentNumber?: number
): CustomerInstallmentReceipt => {
  if (installmentNumber === 12 || receiptId === 'rec_012') {
    return completedSchemeReceiptFixture;
  }

  if (installmentNumber && installmentNumber >= 1 && installmentNumber <= 11) {
    const paid = installmentNumber * 1000;
    const remaining = (12 - installmentNumber) * 1000;
    const isLast = installmentNumber === 12;

    const monthNames = [
      'March 2026',
      'April 2026',
      'May 2026',
      'June 2026',
      'July 2026',
      'August 2026',
      'September 2026',
      'October 2026',
      'November 2026',
      'December 2026',
      'January 2027',
      'February 2027',
    ];

    const currentMonthStr = monthNames[installmentNumber - 1] || 'September 2026';
    const nextMonthStr = monthNames[installmentNumber] || 'October 2026';

    return {
      ...defaultReceiptFixture,
      receiptId: receiptId || `rec_00${installmentNumber}`,
      receiptNumber: `RJ-2026-00${90 + installmentNumber}`,
      installmentNumber,
      paymentDate: `05 ${currentMonthStr}`,
      paidTotal: paid,
      remainingContribution: remaining,
      nextInstallmentMonth: isLast ? undefined : nextMonthStr,
      isSchemeCompleted: isLast,
    };
  }

  return defaultReceiptFixture;
};
