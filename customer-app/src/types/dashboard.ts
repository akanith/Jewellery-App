export type InstallmentStatus = 'PAID' | 'PENDING' | 'ON_TIME';

export interface SchemeSummary {
  schemeId: string;
  schemeName: string;
  schemeCode: string;
  paidAmount: number;
  remainingContribution: number;
  paidInstallments: number;
  totalInstallments: number;
  maturityAmount: number;
  bonusAmount: number;
  maturityDate: string;
  progressPercentage: number;
  status: 'ACTIVE' | 'MATURED' | 'CANCELLED';
}

export interface CurrentInstallment {
  installmentNumber: number;
  calendarMonth: string;
  dueDateFormatted: string;
  amount: number;
  status: InstallmentStatus;
}

export interface RecentPayment {
  id: string;
  calendarMonth: string;
  amount: number;
  paymentDate: string;
  status: 'PAID' | 'SUCCESSFUL';
}

export interface CustomerHomeData {
  customerName: string;
  customerCode: string;
  avatarUri?: string;
  unreadNotificationsCount: number;
  scheme: SchemeSummary | null;
  currentInstallment: CurrentInstallment | null;
  recentPayments: RecentPayment[];
  announcement?: string | null;
}
