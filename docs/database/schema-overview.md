# Database Schema Overview

The database architecture for **Ramyas Jeweller Savings Scheme Management System** is built on PostgreSQL 15 and Supabase, structured across 9 core domain entities.

---

## 1. Core Tables Summary

| Table Name | Primary Key | Purpose | Key Constraints |
| :--- | :--- | :--- | :--- |
| `profiles` | `uuid` (FK -> `auth.users`) | Application User Identities & Roles | `role IN ('OWNER','ADMIN','STAFF','CUSTOMER')` |
| `customers` | `uuid` | Customer Domain Information | `mobile_number UNIQUE`, `customer_number UNIQUE` |
| `scheme_plans` | `uuid` | Reusable Scheme Configuration Templates | `code UNIQUE`, `monthly_amount > 0` |
| `customer_schemes` | `uuid` | Customer Savings Scheme Enrollments | `scheme_account_number UNIQUE`, `status` ENUM |
| `installments` | `uuid` | Monthly Scheduled Payment Records | `UNIQUE(customer_scheme_id, installment_number)` |
| `payments` | `uuid` | Financial Payment Ledger Transactions | `payment_number UNIQUE`, `amount > 0` |
| `redemptions` | `uuid` | Maturity Redemption Ledger | `redemption_number UNIQUE`, `customer_scheme_id UNIQUE` |
| `audit_logs` | `uuid` | Financial & System Audit Trail | Read-Only (no UPDATE or DELETE policies) |
| `shop_settings` | `integer` (`id=1`) | Singleton Shop Config & Terms | `CHECK (id = 1)` |

---

## 2. PostgreSQL Data Types Standard
* **Primary Keys**: `uuid` generated via `uuid_generate_v4()`.
* **Monetary Values**: `numeric(12,2)` strictly used for all financial amounts (`monthly_amount`, `paid_amount`, `final_redeemed_value`). `float`/`double` types are strictly prohibited.
* **Timestamps**: `timestamptz` (timestamp with time zone) for audit precision.
* **Strings**: `text` used over bounded `varchar` per PostgreSQL best practices.
