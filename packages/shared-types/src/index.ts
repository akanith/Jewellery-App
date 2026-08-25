/**
 * SHARED DATABASE TYPES — RAMYAS JEWELLER
 * 
 * TypeScript interfaces matching PostgreSQL schema entities created in Phase 2.
 */

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type EntityId = string;

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type SchemeStatus = 'ACTIVE' | 'COMPLETED' | 'REDEEMED' | 'CLOSED_EARLY' | 'DEFAULTED';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'FAILED';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE_GATEWAY';
export type PaymentStatus = 'COMPLETED' | 'REFUNDED' | 'FAILED';
export type RedemptionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export interface Profile {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchemePlan {
  id: string;
  code: string;
  title: string;
  description: string | null;
  monthlyAmount: number;
  totalInstallments: number;
  bonusMonths: number;
  discountPercentage: number;
  goldWeightBased: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerScheme {
  id: string;
  schemeAccountNumber: string;
  customerId: string;
  schemePlanId: string;
  startDate: string;
  maturityDate: string | null;
  monthlyAmount: number;
  totalInstallments: number;
  paidInstallmentsCount: number;
  totalAmountPaid: number;
  status: SchemeStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  customerSchemeId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  paymentDate: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  status: InstallmentStatus;
  receivedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerSchemeId: string;
  installmentId: string | null;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paymentDate: string;
  status: PaymentStatus;
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Redemption {
  id: string;
  redemptionNumber: string;
  customerSchemeId: string;
  customerId: string;
  totalPaidAmount: number;
  bonusAmount: number;
  discountAmount: number;
  finalRedeemedValue: number;
  redemptionDate: string | null;
  status: RedemptionStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ShopSettings {
  id: number;
  shopName: string;
  address: string | null;
  phone: string | null;
  gstNumber: string | null;
  termsAndConditions: string | null;
  gracePeriodDays: number;
  updatedAt: string;
}

export interface AdminDashboardStats {
  totalCustomers: number;
  activeSchemes: number;
  totalCollections: number;
  pendingInstallments: number;
}

export interface ReportKPI {
  todayCollection: number;
  monthlyCollection: number;
  yearlyCollection: number;
  activeCustomers: number;
  netNewCustomers: number;
  completedSchemes: number;
  pendingInstallments: number;
  redemptionValue: number;
}

export interface CollectionTrendPoint {
  month: string;
  amount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  percentage: number;
}

export interface CustomerGrowthTrendPoint {
  month: string;
  count: number;
}

export interface SchemeLifecycleStats {
  active: number;
  pending: number;
  readyForRedemption: number;
  inactive: number;
}

export interface ReportMilestones {
  highestCollectionMonth: { label: string; amount: number };
  recordNewCustomersMonth: { label: string; count: number };
  highestRedemptionPeriod: { label: string; amount: number };
}

export interface RecentReportTransaction {
  id: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: string;
}

export interface ReportAnalyticsData {
  kpi: ReportKPI;
  collectionTrend: CollectionTrendPoint[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  customerGrowthTrend: CustomerGrowthTrendPoint[];
  lifecycle: SchemeLifecycleStats;
  milestones: ReportMilestones;
  recentTransactions: RecentReportTransaction[];
}

export type NotificationType = 'PAYMENT' | 'SCHEME' | 'REMINDER' | 'REDEMPTION' | 'ANNOUNCEMENT';

export interface NotificationMetadata {
  amount?: number;
  paymentId?: string;
  customerSchemeId?: string;
  redemptionId?: string;
  installmentId?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  customerId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata: NotificationMetadata | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  success: boolean;
}
