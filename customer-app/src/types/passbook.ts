export type PassbookInstallmentStatus = 'PAID' | 'PENDING' | 'FUTURE';

export type PassbookSchemeStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MATURED'
  | 'PARTIALLY_REDEEMED'
  | 'FULLY_REDEEMED'
  | 'EMERGENCY_REFUNDED'
  | 'CANCELLED';

export interface PassbookInstallment {
  installmentNumber: number;
  installmentLabel: string;
  calendarMonth: string;
  installmentAmount: number;
  paidAmount: number;
  status: PassbookInstallmentStatus;
  paidDateFormatted?: string;
  dueDateFormatted?: string;
  receiptNumber?: string;
}

export interface CustomerPassbookData {
  schemeId?: string | null;
  slotNumber?: number | null;
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
  status: PassbookSchemeStatus;
  progressPercentage: number;
  unreadNotificationsCount?: number;
  avatarUri?: string | null;
  installments: PassbookInstallment[];
}
