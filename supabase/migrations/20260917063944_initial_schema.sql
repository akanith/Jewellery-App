-- =============================================================================
-- RAMYAS JEWELLER - Jewellery Savings Scheme Management System
-- Database Migration: 001_initial_schema.sql
-- Description: Core production relational schema for scheme administration,
--              installments, payments, bonuses, redemptions, notifications, and audits.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. HELPER FUNCTIONS & TRIGGERS
-- =============================================================================

-- Automatically update updated_at timestamp column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. USER PROFILES & IDENTITIES
-- =============================================================================

-- Global profiles table mapped to Supabase Auth users (or standalone UUIDs)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER')),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. ADMIN USERS
-- =============================================================================

CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    employee_code VARCHAR(30) UNIQUE NOT NULL,
    role_title VARCHAR(50) NOT NULL DEFAULT 'Admin', -- e.g. 'Store Owner', 'Manager', 'Accountant'
    permissions JSONB NOT NULL DEFAULT '{"all": true}'::jsonb,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER set_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. CUSTOMERS
-- =============================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    customer_code VARCHAR(30) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(50) DEFAULT 'Coimbatore',
    pincode VARCHAR(10),
    alternate_phone VARCHAR(15),
    nominee_name VARCHAR(100),
    nominee_relationship VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_name ON customers(full_name);

CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. SCHEME ENROLLMENTS
-- =============================================================================

CREATE TABLE schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    scheme_code VARCHAR(30) UNIQUE NOT NULL,
    monthly_installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (monthly_installment_amount = 1000.00),
    total_installments INTEGER NOT NULL DEFAULT 12 CHECK (total_installments = 12),
    target_contribution NUMERIC(12, 2) NOT NULL DEFAULT 12000.00 CHECK (target_contribution = 12000.00),
    bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (bonus_amount = 1000.00),
    maturity_amount NUMERIC(12, 2) NOT NULL DEFAULT 13000.00 CHECK (maturity_amount = 13000.00),
    start_month DATE NOT NULL,
    end_month DATE NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN (
            'ACTIVE',
            'COMPLETED',
            'MATURED',
            'PARTIALLY_REDEEMED',
            'FULLY_REDEEMED',
            'EMERGENCY_REFUNDED',
            'CANCELLED'
        )
    ),
    emergency_refund_amount NUMERIC(12, 2) DEFAULT NULL CHECK (emergency_refund_amount IS NULL OR emergency_refund_amount >= 0),
    emergency_refund_date TIMESTAMPTZ DEFAULT NULL,
    emergency_refund_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    emergency_refund_notes TEXT DEFAULT NULL,
    enrolled_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_schemes_customer ON schemes(customer_id);
CREATE INDEX idx_schemes_status ON schemes(status);
CREATE INDEX idx_schemes_code ON schemes(scheme_code);

CREATE TRIGGER set_schemes_updated_at
    BEFORE UPDATE ON schemes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. SCHEME INSTALLMENTS (12 Months per Scheme)
-- =============================================================================

CREATE TABLE scheme_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
    calendar_month DATE NOT NULL,
    due_date DATE NOT NULL,
    installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (installment_amount = 1000.00),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    paid_date TIMESTAMPTZ DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_scheme_installment_number UNIQUE (scheme_id, installment_number),
    CONSTRAINT uq_scheme_calendar_month UNIQUE (scheme_id, calendar_month)
);

CREATE INDEX idx_scheme_installments_scheme ON scheme_installments(scheme_id);
CREATE INDEX idx_scheme_installments_customer ON scheme_installments(customer_id);
CREATE INDEX idx_scheme_installments_status ON scheme_installments(status);
CREATE INDEX idx_scheme_installments_due ON scheme_installments(due_date);

CREATE TRIGGER set_scheme_installments_updated_at
    BEFORE UPDATE ON scheme_installments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. PAYMENTS
-- =============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    installment_id UUID UNIQUE NOT NULL REFERENCES scheme_installments(id) ON DELETE RESTRICT,
    installment_number INTEGER NOT NULL CHECK (installment_number BETWEEN 1 AND 12),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount = 1000.00),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN (
            'CASH',
            'GPAY',
            'PHONEPE',
            'BANK_TRANSFER',
            'UPI',
            'CARD',
            'OTHER'
        )
    ),
    transaction_reference VARCHAR(100),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (payment_status IN ('SUCCESS', 'CANCELLED', 'REFUNDED')),
    recorded_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_scheme ON payments(scheme_id);
CREATE INDEX idx_payments_installment ON payments(installment_id);
CREATE INDEX idx_payments_receipt ON payments(receipt_number);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE TRIGGER set_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. SCHEME BONUSES
-- =============================================================================

CREATE TABLE scheme_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID UNIQUE NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (bonus_amount = 1000.00),
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CREDITED', 'FORFEITED')),
    credited_date TIMESTAMPTZ DEFAULT NULL,
    credited_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_scheme_bonuses_scheme ON scheme_bonuses(scheme_id);
CREATE INDEX idx_scheme_bonuses_customer ON scheme_bonuses(customer_id);
CREATE INDEX idx_scheme_bonuses_status ON scheme_bonuses(status);

CREATE TRIGGER set_scheme_bonuses_updated_at
    BEFORE UPDATE ON scheme_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 9. REDEMPTIONS
-- =============================================================================

CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    redemption_date TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    scheme_balance_before NUMERIC(12, 2) NOT NULL CHECK (scheme_balance_before >= 0),
    scheme_amount_used NUMERIC(12, 2) NOT NULL CHECK (scheme_amount_used > 0 AND scheme_amount_used <= scheme_balance_before),
    scheme_balance_after NUMERIC(12, 2) NOT NULL CHECK (scheme_balance_after = (scheme_balance_before - scheme_amount_used)),
    purchase_total NUMERIC(12, 2) NOT NULL CHECK (purchase_total >= scheme_amount_used),
    customer_paid_balance NUMERIC(12, 2) NOT NULL CHECK (customer_paid_balance = (purchase_total - scheme_amount_used)),
    invoice_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    recorded_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_redemptions_customer ON redemptions(customer_id);
CREATE INDEX idx_redemptions_scheme ON redemptions(scheme_id);
CREATE INDEX idx_redemptions_code ON redemptions(redemption_code);
CREATE INDEX idx_redemptions_date ON redemptions(redemption_date);

CREATE TRIGGER set_redemptions_updated_at
    BEFORE UPDATE ON redemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 10. REDEMPTION ITEMS (Purchase Breakdown)
-- =============================================================================

CREATE TABLE redemption_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id UUID NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
    item_description VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('GOLD', 'SILVER', 'OTHER')),
    quantity NUMERIC(8, 3) NOT NULL DEFAULT 1.000 CHECK (quantity > 0),
    product_amount NUMERIC(12, 2) NOT NULL CHECK (product_amount >= 0),
    making_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (making_charges >= 0),
    wastage_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wastage_charges >= 0),
    stone_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (stone_charges >= 0),
    other_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (other_charges >= 0),
    final_item_amount NUMERIC(12, 2) NOT NULL CHECK (
        final_item_amount = (product_amount + making_charges + wastage_charges + stone_charges + other_charges)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_redemption_items_redemption ON redemption_items(redemption_id);
CREATE INDEX idx_redemption_items_category ON redemption_items(category);

-- =============================================================================
-- 11. NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES schemes(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL CHECK (
        notification_type IN (
            'INSTALLMENT_REMINDER',
            'PAYMENT_RECORDED',
            'BONUS_CREDITED',
            'REDEMPTION_UPDATE',
            'SHOP_UPDATE',
            'GENERAL'
        )
    ),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_notifications_customer ON notifications(customer_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- =============================================================================
-- 12. AUDIT LOGS
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_table VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_table, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- =============================================================================
-- End of Migration: 001_initial_schema.sql
-- =============================================================================
