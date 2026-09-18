/**
 * RAMYAS JEWELLER - Database Schema & RPC TypeScript Definitions
 * Reflects production PostgreSQL schema (001_initial_schema.sql & 002_rls_security.sql)
 */

export type UserRole = 'ADMIN' | 'CUSTOMER';

export type SchemeStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MATURED'
  | 'PARTIALLY_REDEEMED'
  | 'FULLY_REDEEMED'
  | 'EMERGENCY_REFUNDED'
  | 'CANCELLED';

export type InstallmentStatus = 'PENDING' | 'PAID';

export type PaymentMethod =
  | 'CASH'
  | 'GPAY'
  | 'PHONEPE'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CARD'
  | 'OTHER';

export type PaymentStatus = 'SUCCESS' | 'CANCELLED' | 'REFUNDED';

export type BonusStatus = 'PENDING' | 'CREDITED' | 'FORFEITED';

export type RedemptionStatus = 'COMPLETED' | 'CANCELLED';

export type ItemCategory = 'GOLD' | 'SILVER' | 'OTHER';

export type NotificationType =
  | 'INSTALLMENT_REMINDER'
  | 'PAYMENT_RECORDED'
  | 'BONUS_CREDITED'
  | 'REDEMPTION_UPDATE'
  | 'SHOP_UPDATE'
  | 'GENERAL';

export interface Profile {
  id: string;
  role: UserRole;
  phone_number: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  employee_code: string;
  role_title: string;
  permissions: Record<string, boolean>;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Customer {
  id: string;
  customer_code: string;
  phone_number: string;
  full_name: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  alternate_phone: string | null;
  nominee_name: string | null;
  nominee_relationship: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  active_schemes_count?: number;
}

export interface Scheme {
  id: string;
  customer_id: string;
  scheme_code: string;
  monthly_installment_amount: number;
  total_installments: number;
  target_contribution: number;
  bonus_amount: number;
  maturity_amount: number;
  start_month: string;
  end_month: string;
  status: SchemeStatus;
  emergency_refund_amount: number | null;
  emergency_refund_date: string | null;
  emergency_refund_by: string | null;
  emergency_refund_notes: string | null;
  enrolled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  installments?: SchemeInstallment[];
  bonus?: SchemeBonus;
  paid_installments_count?: number;
  total_paid_amount?: number;
  available_balance?: number;
}

export interface SchemeInstallment {
  id: string;
  scheme_id: string;
  customer_id: string;
  installment_number: number;
  calendar_month: string;
  due_date: string;
  installment_amount: number;
  status: InstallmentStatus;
  paid_amount: number;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment?: Payment;
}

export interface Payment {
  id: string;
  receipt_number: string;
  customer_id: string;
  scheme_id: string;
  installment_id: string;
  installment_number: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference: string | null;
  payment_status: PaymentStatus;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  admin_user?: AdminUser;
}

export interface SchemeBonus {
  id: string;
  scheme_id: string;
  customer_id: string;
  bonus_amount: number;
  is_eligible: boolean;
  status: BonusStatus;
  credited_date: string | null;
  credited_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  redemption_code: string;
  customer_id: string;
  scheme_id: string;
  redemption_date: string;
  scheme_balance_before: number;
  scheme_amount_used: number;
  scheme_balance_after: number;
  purchase_total: number;
  customer_paid_balance: number;
  invoice_number: string | null;
  status: RedemptionStatus;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: RedemptionItem[];
  customer?: Customer;
}

export interface RedemptionItem {
  id: string;
  redemption_id: string;
  item_description: string;
  category: ItemCategory;
  quantity: number;
  product_amount: number;
  making_charges: number;
  wastage_charges: number;
  stone_charges: number;
  other_charges: number;
  final_item_amount: number;
  created_at: string;
}

export interface Notification {
  id: string;
  customer_id: string;
  scheme_id: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: AdminUser;
}

// =============================================================================
// RPC INPUT & OUTPUT TYPES
// =============================================================================

export interface CreateCustomerWithSchemeParams {
  p_full_name: string;
  p_phone_number: string;
  p_address?: string | null;
  p_city?: string | null;
  p_pincode?: string | null;
  p_alternate_phone?: string | null;
  p_nominee_name?: string | null;
  p_nominee_relationship?: string | null;
  p_notes?: string | null;
  p_enroll_scheme?: boolean;
  p_start_month?: string | null;
}

export interface CreateCustomerWithSchemeResult {
  success: boolean;
  customer_id: string;
  customer_code: string;
  full_name: string;
  phone_number: string;
  scheme_id: string | null;
  scheme_code: string | null;
}

export interface EnrollCustomerSchemeParams {
  p_customer_id: string;
  p_start_month: string; // 'YYYY-MM-01'
  p_notes?: string | null;
}

export interface EnrollCustomerSchemeResult {
  success: boolean;
  scheme_id: string;
  scheme_code: string;
  start_month: string;
  end_month: string;
}

export interface RecordInstallmentPaymentParams {
  p_scheme_id: string;
  p_installment_number: number;
  p_payment_method: PaymentMethod;
  p_transaction_reference?: string | null;
  p_notes?: string | null;
}

export interface RecordInstallmentPaymentResult {
  success: boolean;
  payment_id: string;
  receipt_number: string;
  paid_count: number;
  bonus_credited: boolean;
  status: SchemeStatus;
}

export interface RedemptionItemPayload {
  item_description: string;
  category: ItemCategory;
  quantity?: number;
  product_amount: number;
  making_charges?: number;
  wastage_charges?: number;
  stone_charges?: number;
  other_charges?: number;
}

export interface RecordSchemeRedemptionParams {
  p_scheme_id: string;
  p_scheme_amount_used: number;
  p_purchase_total: number;
  p_invoice_number: string;
  p_items: RedemptionItemPayload[];
  p_notes?: string | null;
}

export interface RecordSchemeRedemptionResult {
  success: boolean;
  redemption_id: string;
  redemption_code: string;
  scheme_amount_used: number;
  customer_paid_balance: number;
  remaining_scheme_balance: number;
  scheme_status: SchemeStatus;
}

export interface ProcessEmergencyRefundParams {
  p_scheme_id: string;
  p_refund_amount: number;
  p_refund_notes?: string | null;
}

export interface ProcessEmergencyRefundResult {
  success: boolean;
  scheme_id: string;
  refund_amount: number;
  status: 'EMERGENCY_REFUNDED';
}
