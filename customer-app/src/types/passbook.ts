export type PassbookInstallmentStatus = 'PAID' | 'PENDING' | 'FUTURE';

export interface PassbookInstallment {
  installmentNumber: number;
  installmentLabel: string;
  calendarMonth: string;
  installmentAmount: number;
  paidAmount: number;
  status: PassbookInstallmentStatus;
  paidDateFormatted?: string;
  dueDateFormatted?: string;
}

export interface CustomerPassbookData {
  customerName: string;
  customerCode: string;
  schemeName: string;
  schemeCode: string;
  financialYear: string;
  monthlyInstallment: number;
  paidAmount: number;
  totalContribution: number;
  paidInstallments: number;
  totalInstallments: number;
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
  progressPercentage: number;
  installments: PassbookInstallment[];
}
