# Financial Integrity & Safety Rules

This document outlines the database-level mechanisms enforcing zero financial corruption, negative payment prevention, and non-deletable audit trails.

---

## 1. Monetary Amount Standards
* **Data Type**: All monetary columns (`monthly_amount`, `expected_amount`, `paid_amount`, `amount`, `total_paid_amount`, `final_redeemed_value`) use `numeric(12,2)`.
* **Prohibition**: Floating point numbers (`float4`, `float8`, `double precision`, `real`) are strictly forbidden for monetary representation.

---

## 2. Check Constraints
* `payments.amount`: `CHECK (amount > 0)` — Negative or zero payment transactions are blocked at the PostgreSQL engine level.
* `installments.expected_amount`: `CHECK (expected_amount > 0)`.
* `scheme_plans.monthly_amount`: `CHECK (monthly_amount > 0)`.
* `customer_schemes.total_amount_paid`: `CHECK (total_amount_paid >= 0)`.
* `shop_settings.id`: `CHECK (id = 1)` — Prevents multiple shop config rows.

---

## 3. Duplicate Prevention & Integrity Keys
* `installments`: `UNIQUE (customer_scheme_id, installment_number)` — Prevents creating duplicate installment numbers (e.g. two Month 1 installments) for the same scheme enrollment.
* `payments`: `UNIQUE (payment_number)` — Prevents duplicate payment transaction receipts.
* `redemptions`: `UNIQUE (customer_scheme_id)` — Guarantees a customer scheme can only be redeemed once.

---

## 4. Deletion Protection (Soft Delete / Foreign Keys)
* Foreign Keys on `payments.installment_id`, `payments.customer_scheme_id`, `installments.customer_scheme_id`, `customer_schemes.customer_id` use `ON DELETE RESTRICT`.
* Customer schemes, payment ledgers, and redemption records cannot be casually hard-deleted while referencing records exist.
