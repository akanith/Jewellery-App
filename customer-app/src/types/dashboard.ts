export type InstallmentStatus = 'PAID' | 'PENDING' | 'ON_TIME';

export type SchemeLifecycleStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MATURED'
  | 'PARTIALLY_REDEEMED'
  | 'FULLY_REDEEMED'
  | 'EMERGENCY_REFUNDED'
  | 'CANCELLED';

export interface SchemeSummary {
  id?: string;
  schemeId: string;
  slotNumber?: number | null;
  schemeName: string;
  schemeCode: string;
  monthlyInstallmentAmount?: number;
  monthlyInstallment?: number;
  paidAmount: number;
  remainingContribution: number;
  paidInstallments: number;
  totalInstallments: number;
  maturityAmount: number;
  bonusAmount: number;
  maturityDate: string;
  progressPercentage: number;
  status: SchemeLifecycleStatus;
  currentInstallment?: CurrentInstallment | null;
}

export interface CombinedDashboardSummary {
  totalSchemesCount: number;
  activeSchemesCount: number;
  totalPaidAmount: number;
  totalTargetContribution: number;
  totalRemainingContribution: number;
  totalMaturityAmount: number;
  totalBonusAmount: number;
  totalPaidInstallments: number;
  totalInstallmentsCount: number;
  overallProgressPercentage: number;
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
  schemes?: SchemeSummary[];
  summary?: CombinedDashboardSummary | null;
  currentInstallment: CurrentInstallment | null;
  recentPayments: RecentPayment[];
  announcement?: string | null;
}
