# Unresolved Business Decisions & Policy Log

This document logs business rules and policies that require formal client/owner approval before Phase 3 logic implementation.
To maintain database stability, current conservative assumptions have been built into the database constraints.

---

## 1. Partial Installment Payments
* **Status**: **DECISION REQUIRED**
* **Question**: Does Ramyas Jeweller accept partial payments for a monthly installment (e.g. paying ₹1,000 towards a ₹3,000 monthly requirement), or must each installment be paid in full?
* **Why It Matters**: Affects whether `installments.status` needs a `PARTIALLY_PAID` state, and whether single installments link to multiple partial payment ledger rows.
* **Possible Options**:
  1. Full Payments Only (Standard jewellery savings scheme rule).
  2. Partial Payments Allowed.
* **Current Assumption**: Full Payments Only (`expected_amount` must match payment amount per transaction).
* **Database Impact**: Installments track `paid_amount` and `status` (`PENDING`, `PAID`, `OVERDUE`).

---

## 2. Missed Installment Penalty & Bonus Eligibility
* **Status**: **DECISION REQUIRED**
* **Question**: If a customer misses 1 or 2 monthly installments during an 11-month scheme, do they forfeit the store bonus (e.g. 1-month bonus), or can they catch up on missed installments later?
* **Why It Matters**: Affects maturity redemption eligibility validation logic in `process_scheme_redemption()` RPC.
* **Possible Options**:
  1. Strict Policy: Missing any installment forfeits bonus eligibility.
  2. Flexible Policy: Customers can pay pending installments anytime before scheme expiry to retain bonus.
* **Current Assumption**: Flexible Policy — Bonus is calculated based on total completed paid installments count.
* **Database Impact**: `customer_schemes.paid_installments_count` tracks completed count, checked during redemption.

---

## 3. Early Scheme Closure / Pre-Maturity Cash Refund Policy
* **Status**: **DECISION REQUIRED**
* **Question**: Can a customer close their scheme early (e.g. after 5 months) and request a cash refund or jewellery purchase without bonus?
* **Why It Matters**: Dictates whether `customer_schemes.status` can transition directly to `CLOSED_EARLY` and whether cash refunds create negative financial transactions or specific refund audit logs.
* **Possible Options**:
  1. No Cash Refunds: Early closure funds can only be redeemed as jewellery without store bonus.
  2. Cash Refund Allowed with administrative deduction.
* **Current Assumption**: Funds are non-refundable in cash; early redemption allows purchasing jewellery equal to total principal paid without bonus.
* **Database Impact**: Status `CLOSED_EARLY` supported in `customer_schemes` and `redemptions`.

---

## 4. Grace Period for Monthly Due Dates
* **Status**: **DECISION REQUIRED**
* **Question**: What is the default grace period (in days) after the monthly due date before an installment is flagged as `OVERDUE`?
* **Why It Matters**: Used by background cron or batch functions calculating scheme status and sending overdue SMS/push notifications.
* **Possible Options**: 5 days, 7 days, or 10 days.
* **Current Assumption**: 5 days grace period default.
* **Database Impact**: Stored in `shop_settings.grace_period_days` (default `5`).

---

## 5. Gold Weight vs. Fixed Currency Accumulation
* **Status**: **DECISION REQUIRED**
* **Question**: Are savings scheme benefits calculated strictly in cash value (INR) or converted to gold grams based on the daily gold rate at each installment payment date?
* **Why It Matters**: If gold weight conversion is required, `payments` table needs `gold_rate_per_gram` and `gold_weight_accumulated_grams` fields.
* **Possible Options**:
  1. Cash Value Scheme (Customer pays ₹X/month, gets ₹X * duration + bonus at maturity).
  2. Gold Weight Scheme (Each payment locks gold grams at daily rate).
* **Current Assumption**: Both supported via `scheme_plans.gold_weight_based` boolean flag.
* **Database Impact**: Schema includes `gold_weight_based` flag on scheme plans.
