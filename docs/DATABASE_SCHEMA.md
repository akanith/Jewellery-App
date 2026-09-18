# Database Schema Documentation - Ramyas Jeweller

**Application:** RAMYAS JEWELLER — Jewellery Savings Scheme Management System  
**Migration File:** [`supabase/migrations/001_initial_schema.sql`](file:///e:/Jewellery%20App/supabase/migrations/001_initial_schema.sql)  
**Database Engine:** PostgreSQL (Supabase Compatible)  

---

## 1. Relational Entity Overview

The schema models the full lifecycle of a 12-month savings scheme, from customer registration and monthly installment tracking to bonus crediting, redemption, customer notifications, and administrative audit logging.

```
                    +-----------------------+
                    |       profiles        |
                    +-----------------------+
                                |
               +----------------+----------------+
               |                                 |
               v                                 v
    +--------------------+             +--------------------+
    |    admin_users     |             |     customers      |
    +--------------------+             +--------------------+
               |                                 |
               |                                 v
               |                       +--------------------+
               +---------------------->|      schemes       |
               |                       +--------------------+
               |                                 |
               |               +-----------------+-----------------+
               |               |                                   |
               |               v                                   v
               |     +--------------------+              +--------------------+
               +---->|scheme_installments |              |   scheme_bonuses   |
               |     +--------------------+              +--------------------+
               |               |                                   |
               |               v                                   |
               +---->+--------------------+                        |
               |     |      payments      |                        |
               |     +--------------------+                        |
               |                                                   |
               |               +-----------------------------------+
               |               |
               v               v
    +--------------------+ <---+
    |    redemptions     |
    +--------------------+
               |
               v
    +--------------------+
    |  redemption_items  |
    +--------------------+

    [notifications] (references customers, schemes)
    [audit_logs]    (references admin_users, entity tables)
```

---

## 2. Table Specifications

### 2.1. `profiles`
- **Purpose:** Core identity table for user credentials and role classification.
- **Important Columns:**
  - `id` (UUID, PK): Primary key corresponding to user ID.
  - `role` (VARCHAR, NOT NULL): Constrained to `'ADMIN'` or `'CUSTOMER'`.
  - `phone_number` (VARCHAR, UNIQUE, NOT NULL): 10-digit Indian mobile number for primary login.
  - `full_name` (VARCHAR, NOT NULL): User's legal name.
  - `is_active` (BOOLEAN): Soft-disable switch.
- **Relationships:** Referenced 1-to-1 by `admin_users` and `customers`.

### 2.2. `admin_users`
- **Purpose:** Store administrative operator details (Store Owner, Son, Shop Staff).
- **Important Columns:**
  - `id` (UUID, PK): Foreign key to `profiles.id` (ON DELETE CASCADE).
  - `employee_code` (VARCHAR, UNIQUE, NOT NULL): Unique staff identifier (e.g. `RJ-ADM-01`).
  - `role_title` (VARCHAR): Descriptive administrative title (e.g. `'Store Owner'`, `'Manager'`).
  - `permissions` (JSONB): Granular permission flags.
  - `is_super_admin` (BOOLEAN): Root administrator indicator.

### 2.3. `customers`
- **Purpose:** Store customer profile and contact metadata.
- **Important Columns:**
  - `id` (UUID, PK): Foreign key to `profiles.id` (ON DELETE CASCADE).
  - `customer_code` (VARCHAR, UNIQUE, NOT NULL): Business identifier (e.g. `RJ-CUST-1001`).
  - `phone_number` (VARCHAR, NOT NULL): Primary mobile contact.
  - `full_name` (VARCHAR, NOT NULL): Full name.
  - `address`, `city`, `pincode`: Residential address details.
  - `nominee_name`, `nominee_relationship`: Nominee information for family-member handover in unforeseen events.
  - `created_by` (UUID, FK): Admin who registered the customer.

### 2.4. `schemes`
- **Purpose:** Represents an active savings scheme enrollment for a customer.
- **Important Columns:**
  - `id` (UUID, PK): Unique scheme enrollment UUID.
  - `customer_id` (UUID, FK): References `customers.id`.
  - `scheme_code` (VARCHAR, UNIQUE, NOT NULL): Unique scheme reference (e.g. `RJ-SCH-2026-001`).
  - `monthly_installment_amount` (NUMERIC(12,2), DEFAULT 1000.00): Fixed at ₹1,000.
  - `total_installments` (INTEGER, DEFAULT 12): Constrained strictly to `12`.
  - `target_contribution` (NUMERIC(12,2), DEFAULT 12000.00): Constrained strictly to ₹12,000.
  - `bonus_amount` (NUMERIC(12,2), DEFAULT 1000.00): Constrained strictly to ₹1,000.
  - `maturity_amount` (NUMERIC(12,2), DEFAULT 13000.00): Constrained strictly to ₹13,000.
  - `start_month` (DATE), `end_month` (DATE): 12-month calendar boundary.
  - `status` (VARCHAR): `'ACTIVE'`, `'COMPLETED'`, `'MATURED'`, `'PARTIALLY_REDEEMED'`, `'FULLY_REDEEMED'`, `'EMERGENCY_REFUNDED'`, `'CANCELLED'`.
  - `emergency_refund_amount`, `emergency_refund_date`, `emergency_refund_by`, `emergency_refund_notes`: Audit trail for emergency cancellations handled manually by store owner.

### 2.5. `scheme_installments`
- **Purpose:** Pre-generated 12 installment slots representing each calendar month of the scheme.
- **Important Columns:**
  - `id` (UUID, PK): Installment ID.
  - `scheme_id` (UUID, FK): References `schemes.id`.
  - `customer_id` (UUID, FK): References `customers.id`.
  - `installment_number` (INTEGER, 1 to 12): Monthly installment index.
  - `calendar_month` (DATE): 1st day of the installment month (e.g. `2026-09-01`).
  - `due_date` (DATE): Last day of the calendar month.
  - `status` (VARCHAR): `'PENDING'`, `'PAID'`.
  - `paid_amount` (NUMERIC(12,2)): Amount received (₹1,000).
  - `paid_date` (TIMESTAMPTZ): Actual timestamp when payment was recorded.
- **Constraints:**
  - `UNIQUE (scheme_id, installment_number)`: Guarantees no duplicate installment slots per scheme.
  - `UNIQUE (scheme_id, calendar_month)`: Guarantees exactly one installment per calendar month.

### 2.6. `payments`
- **Purpose:** Ledger of all customer payment transactions entered by Admin.
- **Important Columns:**
  - `id` (UUID, PK): Transaction ID.
  - `receipt_number` (VARCHAR, UNIQUE, NOT NULL): Official receipt ID (e.g. `RJ-RCP-2026-0001`).
  - `customer_id` (UUID, FK): Customer who paid.
  - `scheme_id` (UUID, FK): Associated scheme.
  - `installment_id` (UUID, UNIQUE, FK): **Unique foreign key** to `scheme_installments.id`.
  - `amount` (NUMERIC(12,2), NOT NULL): Amount paid (₹1,000.00).
  - `payment_method` (VARCHAR): `'CASH'`, `'GPAY'`, `'PHONEPE'`, `'BANK_TRANSFER'`, `'UPI'`, `'CARD'`, `'OTHER'`.
  - `transaction_reference` (VARCHAR): UPI reference number, UTR number, or Card transaction ID.
  - `payment_status` (VARCHAR): `'SUCCESS'`, `'CANCELLED'`, `'REFUNDED'`.
  - `recorded_by` (UUID, FK): Administrator who received and recorded the payment.
- **Constraints:**
  - `installment_id UNIQUE`: Prevents duplicate payment records for the same installment at the database level.

### 2.7. `scheme_bonuses`
- **Purpose:** Tracks the ₹1,000 bonus eligibility and crediting status.
- **Important Columns:**
  - `id` (UUID, PK): Bonus record ID.
  - `scheme_id` (UUID, UNIQUE, FK): 1-to-1 link to `schemes.id`.
  - `customer_id` (UUID, FK): Customer link.
  - `bonus_amount` (NUMERIC(12,2), DEFAULT 1000.00): Constrained to ₹1,000.
  - `is_eligible` (BOOLEAN): Set to `TRUE` only after all 12 installments are verified `PAID`.
  - `status` (VARCHAR): `'PENDING'`, `'CREDITED'`, `'FORFEITED'`.
  - `credited_date` (TIMESTAMPTZ): Timestamp when credited.
  - `credited_by` (UUID, FK): Admin who processed the bonus credit.

### 2.8. `redemptions`
- **Purpose:** Tracks jewellery purchase redemptions against the matured scheme balance.
- **Important Columns:**
  - `id` (UUID, PK): Redemption transaction ID.
  - `redemption_code` (VARCHAR, UNIQUE, NOT NULL): e.g. `RJ-RED-2027-001`.
  - `customer_id` (UUID, FK): Customer redeeming.
  - `scheme_id` (UUID, FK): Scheme being redeemed.
  - `redemption_date` (TIMESTAMPTZ): Date of purchase.
  - `scheme_balance_before` (NUMERIC(12,2)): Available balance before redemption.
  - `scheme_amount_used` (NUMERIC(12,2)): Scheme amount applied towards purchase.
  - `scheme_balance_after` (NUMERIC(12,2)): Remaining balance carrying lifetime validity.
  - `purchase_total` (NUMERIC(12,2)): Total invoice value of jewellery purchased.
  - `customer_paid_balance` (NUMERIC(12,2)): Remaining invoice amount paid directly by customer (`purchase_total - scheme_amount_used`).
  - `invoice_number` (VARCHAR): Physical/POS store bill number.
  - `recorded_by` (UUID, FK): Admin who handled the redemption in-store.
- **Constraints:**
  - `CHECK (scheme_amount_used <= scheme_balance_before)`: Guarantees customer never redeems more than available scheme balance.
  - `CHECK (scheme_balance_after = scheme_balance_before - scheme_amount_used)`: Mathematical consistency enforcement.

### 2.9. `redemption_items`
- **Purpose:** Stores the itemized line items of jewellery purchased during a redemption.
- **Important Columns:**
  - `id` (UUID, PK): Line item ID.
  - `redemption_id` (UUID, FK): References `redemptions.id` (ON DELETE CASCADE).
  - `item_description` (VARCHAR): Description (e.g. `'Gold Bangle 22K 16g'`).
  - `category` (VARCHAR): `'GOLD'`, `'SILVER'`, `'OTHER'`.
  - `quantity` (NUMERIC(8,3)): Piece count or weight in grams.
  - `product_amount` (NUMERIC(12,2)): Base metal/product value.
  - `making_charges` (NUMERIC(12,2)): Making charges.
  - `wastage_charges` (NUMERIC(12,2)): Wastage amount.
  - `stone_charges` (NUMERIC(12,2)): Stone value/charges.
  - `other_charges` (NUMERIC(12,2)): Hallmarking/other charges.
  - `final_item_amount` (NUMERIC(12,2)): Sum of product amount + all charges.

### 2.10. `notifications`
- **Purpose:** In-app customer notification feed.
- **Important Columns:**
  - `id` (UUID, PK): Notification ID.
  - `customer_id` (UUID, FK): Recipient customer.
  - `scheme_id` (UUID, FK, NULLABLE): Optional scheme link.
  - `title`, `message`: Notification content.
  - `notification_type`: `'INSTALLMENT_REMINDER'`, `'PAYMENT_RECORDED'`, `'BONUS_CREDITED'`, `'REDEMPTION_UPDATE'`, `'SHOP_UPDATE'`, `'GENERAL'`.
  - `is_read` (BOOLEAN): Read status.

### 2.11. `audit_logs`
- **Purpose:** Immutable administrative action log for accountability and financial traceability.
- **Important Columns:**
  - `id` (UUID, PK): Log ID.
  - `actor_id` (UUID, FK): Administrator who performed the action.
  - `action` (VARCHAR): Action type (e.g. `'PAYMENT_RECORDED'`, `'EMERGENCY_REFUND'`, `'BONUS_CREDITED'`).
  - `entity_table` (VARCHAR): Affected table name.
  - `entity_id` (UUID): Primary key of affected record.
  - `old_values` (JSONB): Snapshot before update/delete.
  - `new_values` (JSONB): Snapshot after insert/update.
  - `metadata` (JSONB): Contextual metadata (IP, user agent, etc.).

---

## 3. Business Rules Enforced by the Schema

1. **Monetary Precision:** All money values stored using `NUMERIC(12, 2)` to eliminate floating-point rounding errors.
2. **Duplicate Installment Prevention:** `UNIQUE (scheme_id, installment_number)` and `UNIQUE (scheme_id, calendar_month)` guarantee exactly 12 discrete monthly installments per scheme.
3. **Duplicate Payment Prevention:** `payments.installment_id UNIQUE` constraint guarantees an installment cannot be credited with duplicate successful payments.
4. **Redemption Balance Protection:** `CHECK (scheme_amount_used <= scheme_balance_before)` ensures redemptions cannot exceed available funds.
5. **Installment Number Boundaries:** `CHECK (installment_number BETWEEN 1 AND 12)` strictly limits installments to the 12-month period.
6. **No GST in Scheme Calculation:** GST is omitted from scheme balance and ledger calculations per store policy.

---

## 4. Rules Maintained in Backend Service Logic

1. **Bonus Eligibility Calculation:** The backend service verifies that `COUNT(payments)` for a scheme equals 12 before enabling the bonus in `scheme_bonuses`.
2. **Sequential Installment Allocation:** Ensuring payments are applied to the active/pending calendar month installment.
3. **Emergency Refund Workflow:** Computing cumulative paid amount minus any approved deductions when the store owner authorizes a refund.
4. **Customer Login Authentication:** Verifying 10-digit mobile number identity during login session initialization.

---

## 5. Row Level Security (RLS) Policy Blueprint (To Be Applied in Subsequent Steps)

- **`profiles` & `customers`:**
  - Admin: `SELECT`, `INSERT`, `UPDATE` for all records.
  - Customer: `SELECT` only on rows where `id = auth.uid()`.
- **`schemes`, `scheme_installments`, `payments`, `scheme_bonuses`:**
  - Admin: Full management access (`ALL`).
  - Customer: `SELECT` only where `customer_id = auth.uid()`.
- **`redemptions` & `redemption_items`:**
  - Admin: Full management access (`ALL`).
  - Customer: Read-only access to their own redemption summaries.
- **`notifications`:**
  - Customer: `SELECT` and `UPDATE (is_read)` only where `customer_id = auth.uid()`.
- **`audit_logs`:**
  - Admin: `SELECT` and `INSERT` only.
  - Customer: No access (`DENY ALL`).
