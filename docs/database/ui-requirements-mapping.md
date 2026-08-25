# UI Requirements to Database Schema Mapping

This document maps approved visual screen components and user interactions to backend database entities, fields, queries/RPCs, required roles, and RLS permissions.

---

## 1. Admin Web Portal Screens

### 1.1 Customer Management Screen (`/customers`)
* **UI Purpose**: Create new customers, search customer records by mobile/name/customer number, view profile details, and inspect linked active schemes.
* **Required Business Data**: Full Name, Indian Mobile Number, Email, Address, City, Pincode, Nominee Name, Nominee Relationship, Nominee Mobile, Status.
* **Required Entity**: `public.customers` (linked to `public.profiles`).
* **Required Database Fields**: `id`, `customer_number`, `profile_id`, `full_name`, `mobile_number`, `email`, `address`, `city`, `pincode`, `nominee_name`, `nominee_relationship`, `nominee_mobile`, `status`, `created_at`.
* **Required Query / RPC**:
  * Select: `SELECT * FROM customers WHERE mobile_number ILIKE %q% OR full_name ILIKE %q% OR customer_number = q;`
  * Insert: `INSERT INTO customers (...) VALUES (...);`
* **Required User Role**: `OWNER`, `ADMIN`, `STAFF`.
* **Required Permission**: `customers.select`, `customers.insert`, `customers.update`.

---

### 1.2 Scheme Plan Configuration (`/schemes/plans`)
* **UI Purpose**: Define reusable savings scheme templates (e.g. 11-Month Gold Scheme, Fixed Installment Scheme).
* **Required Business Data**: Scheme Code, Title, Description, Monthly Installment Amount, Duration (months), Bonus Months/Discount, Gold Weight tracking flag, Active status.
* **Required Entity**: `public.scheme_plans`.
* **Required Database Fields**: `id`, `code`, `title`, `description`, `monthly_amount`, `total_installments`, `bonus_months`, `discount_percentage`, `gold_weight_based`, `is_active`, `created_at`.
* **Required Query / RPC**: `SELECT * FROM scheme_plans WHERE is_active = true ORDER BY monthly_amount ASC;`
* **Required User Role**: `OWNER`, `ADMIN`.
* **Required Permission**: `scheme_plans.select`, `scheme_plans.insert`, `scheme_plans.update`.

---

### 1.3 Customer Scheme Enrollment (`/schemes/enroll`)
* **UI Purpose**: Enroll an existing customer into a Scheme Plan and generate their installment passbook schedule.
* **Required Business Data**: Customer ID, Scheme Plan ID, Start Date, Expected Maturity Date, Monthly Amount, Total Installments, Account Number.
* **Required Entity**: `public.customer_schemes` & `public.installments`.
* **Required Database Fields**:
  * `customer_schemes`: `id`, `scheme_account_number`, `customer_id`, `scheme_plan_id`, `start_date`, `maturity_date`, `monthly_amount`, `total_installments`, `status`.
  * `installments`: `id`, `customer_scheme_id`, `installment_number`, `due_date`, `expected_amount`, `status`.
* **Required User Role**: `OWNER`, `ADMIN`, `STAFF`.
* **Required Permission**: `customer_schemes.insert`, `installments.insert`.

---

### 1.4 Installment & Payment Collection Screen (`/payments`)
* **UI Purpose**: Record cash/UPI/card installment payments, issue receipts, and update passbook status.
* **Required Business Data**: Customer Scheme ID, Installment ID, Payment Amount, Method (Cash/UPI/Card), Payment Reference, Received By, Notes.
* **Required Entity**: `public.payments`, `public.installments`, `public.customer_schemes`.
* **Required Query / RPC**: Stored procedure `public.record_installment_payment(p_customer_scheme_id, p_installment_id, p_amount, p_payment_method, p_payment_reference, p_notes)`.
* **Required User Role**: `OWNER`, `ADMIN`, `STAFF`.
* **Required Permission**: `payments.insert`, `installments.update`, `customer_schemes.update`.

---

### 1.5 Scheme Redemption Screen (`/redemptions`)
* **UI Purpose**: Process completed schemes at maturity, apply plan bonus/discounts, calculate final jewellery purchase voucher value, and close scheme.
* **Required Business Data**: Scheme Account Number, Total Collected Amount, Bonus/Discount Value, Net Redeemed Value, Redemption Date, Status, Approved By.
* **Required Entity**: `public.redemptions`, `public.customer_schemes`.
* **Required Query / RPC**: Stored procedure `public.process_scheme_redemption(p_customer_scheme_id, p_notes)`.
* **Required User Role**: `OWNER`, `ADMIN`.
* **Required Permission**: `redemptions.insert`, `customer_schemes.update`.

---

### 1.6 Admin Dashboard (`/dashboard`)
* **UI Purpose**: Display key store performance metrics: Total Active Customers, Total Active Schemes, Total Collections Today/Month, Pending Due Installments.
* **Required Business Data**: Aggregated financial metrics.
* **Required Query / RPC**: Stored procedure `public.get_admin_dashboard_stats()`.
* **Required User Role**: `OWNER`, `ADMIN`.
* **Required Permission**: Execute RPC `get_admin_dashboard_stats()`.

---

## 2. Customer Mobile App Screens

### 2.1 Customer Dashboard (`DashboardScreen`)
* **UI Purpose**: Overview of customer's active schemes, total accumulated savings, and next installment due date.
* **Required Data**: Linked Customer Schemes list, next due installment amount & date.
* **Required Query**: `SELECT cs.*, sp.title FROM customer_schemes cs JOIN scheme_plans sp ON cs.scheme_plan_id = sp.id WHERE cs.customer_id = get_current_customer_id() AND cs.status = 'ACTIVE';`
* **Required User Role**: `CUSTOMER`.
* **Required RLS Permission**: Read own customer scheme records.

---

### 2.2 Digital Passbook Screen (`PassbookScreen`)
* **UI Purpose**: Display complete itemized installment payment history for a selected scheme.
* **Required Data**: Installment number, due date, payment date, amount paid, payment method, payment status (PAID/PENDING/OVERDUE).
* **Required Query**: `SELECT i.*, p.payment_number, p.payment_method FROM installments i LEFT JOIN payments p ON i.id = p.installment_id WHERE i.customer_scheme_id = :scheme_id ORDER BY i.installment_number ASC;`
* **Required User Role**: `CUSTOMER`.
* **Required RLS Permission**: Read installments where linked customer scheme belongs to authenticated customer.
