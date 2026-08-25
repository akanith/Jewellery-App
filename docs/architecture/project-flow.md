# Ramyas Jeweller Project Business Workflows

## 1. Core Business Flow

```
Customer
  │
  ▼
Customer Scheme (Enrollment in a Savings Plan)
  │
  ▼
Installments (Monthly Payments tracked via Passbook)
  │
  ▼
Scheme Completion (All installments paid / Term completed)
  │
  ▼
Redemption (Jewellery Purchase / Benefit Claim)
  │
  ▼
Financial Transaction & Audit Log
```

---

## 2. Owner / Admin Workflow

```
OWNER / ADMIN
  │
  ▼
Admin Login (Supabase Auth via Email/Password)
  │
  ▼
Admin Dashboard (Key Metrics, Daily Collections, Overdue Installments)
  │
  ├──> Customer Management (Create Customer, Search, View Details, Linked Schemes)
  │
  ├──> Scheme Management (Create Scheme Plans, Define Term & Gold Weight Benefits)
  │
  ├──> Installment Management (Record Cash/UPI Payments, Generate Receipts)
  │
  ├──> Redemption Management (Approve Scheme Maturity Redemptions, Apply Benefits)
  │
  ├──> Reports & Financials (Daily Cashbook, Scheme Maturity Schedules, Audit Logs)
  │
  └──> Shop Settings (Store Info, Terms & Conditions, Payment Rules)
```

---

## 3. Customer Mobile Workflow

```
CUSTOMER
  │
  ▼
Customer Login (Mobile Number + OTP / Password via Supabase Auth)
  │
  ▼
Customer Dashboard (Active Schemes Overview, Next Installment Due Date)
  │
  ├──> My Schemes (View Enrolled Savings Schemes, Total Paid, Benefit Accumulated)
  │
  ├──> Digital Passbook (Itemized Installment Payment History, Download Receipts)
  │
  ├──> Pay Installment (Initiate Online Payment / View Payment Counter Info)
  │
  ├──> Profile & Security (View Account Info, Linked Mobile, Passcode/Auth Settings)
  │
  └──> Redemption Status (Track Scheme Completion & Maturity Redemption Options)
```

---

## 4. Complete Business Relationship Model

* **Customer**: A physical customer registered in the system with verified phone number and profile metadata.
* **Customer Scheme**: An instance of a `SchemePlan` assigned to a specific `Customer` with a agreed monthly amount, start date, and target duration.
* **Installments**: Scheduled payment records (typically 11 or 12 monthly installments) associated with a `CustomerScheme`.
* **Redemption**: The final closing event where total collected installments + scheme bonus/benefit are applied towards jewellery purchases.
