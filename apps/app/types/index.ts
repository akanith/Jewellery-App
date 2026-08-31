export interface Profile {
  id: string;
  fullName: string;
  mobileNumber: string;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF' | 'OWNER';
  isActive: boolean;
}

export interface Customer {
  id: string;
  customerNumber: string;
  profileId: string | null;
  fullName: string;
  mobileNumber: string;
  email: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  nomineeName: string | null;
  nomineeRelationship: string | null;
  nomineeMobile: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerIdentity {
  profileId: string;
  customerId: string | null;
  customerNumber: string | null;
  fullName: string;
  mobileNumber: string;
  role: string;
  isCustomerResolved: boolean;
}

export interface CustomerDashboardData {
  customerId: string;
  customerNumber: string;
  customerName: string;
  mobileNumber: string;
  schemeId?: string;
  schemeAccountNumber?: string;
  schemePlanTitle?: string;
  schemeStatus?: string;
  monthlyAmount?: number;
  totalInstallments?: number;
  paidInstallmentsCount?: number;
  totalAmountPaid?: number;
  totalSchemeValue?: number;
  remainingAmount?: number;
  progressPercentage?: number;
  nextInstallmentId?: string;
  nextInstallmentNumber?: number;
  nextInstallmentAmount?: number;
  nextDueDate?: string;
}

export interface NotificationItem {
  id: string;
  customerId: string | null;
  title: string;
  message: string;
  type: 'PAYMENT' | 'SCHEME' | 'REMINDER' | 'REDEMPTION' | 'ANNOUNCEMENT';
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type SupportedLanguage = 'en' | 'ta';
