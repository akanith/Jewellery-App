export interface CustomerInstallmentReceipt {
  receiptId: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  schemeId: string;
  schemeCode: string;
  schemeName: string;
  installmentNumber: number;
  totalInstallments: number;
  installmentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionReference?: string;
  collectedAt: string;
  collectedBy: string;
  paidTotal: number;
  remainingContribution: number;
  bonusAmount: number;
  nextInstallmentMonth?: string;
  isSchemeCompleted: boolean;
}

export type CustomerReceiptData = CustomerInstallmentReceipt;

