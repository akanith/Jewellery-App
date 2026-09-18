# Project Architecture - Ramyas Jeweller

## 1. System Overview

**Ramyas Jeweller Savings Scheme Management System** is a production-grade multi-platform software suite designed to streamline jewellery savings scheme administration, monthly payment tracking, and maturity redemptions for Ramyas Jeweller.

The system is composed of:
1. **Admin Web Application (`admin-web`)**: Next.js (App Router) web dashboard for store management (Owner & Son) to record payments, manage customers, view analytics, and administer scheme redemptions.
2. **Customer Android App (`customer-app`)**: React Native + Expo application for Android customers to view scheme progress, payment history, and maturity status.
3. **Shared Core (`shared`)**: Shared TypeScript interfaces, domain constants, and validation rules.
4. **Backend Layer (`supabase`)**: PostgreSQL database, Supabase Auth, Row Level Security (RLS) policies, and database functions (to be connected).

```
+-------------------------------------------------------------------------+
|                              RAMYAS JEWELLER                            |
|                  Jewellery Savings Scheme Management System             |
+-------------------------------------------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+-------------------------------+               +-------------------------------+
|      Admin Web Application    |               |      Customer Mobile App      |
|    (Next.js / TypeScript)     |               |    (React Native / Expo)      |
|    - Store Owner / Son        |               |    - Android Customers        |
|    - Scheme & Payment Admin   |               |    - Read-only Financial View |
|    - Reports & Redemptions    |               |    - Scheme Progress & Passbook|
+-------------------------------+               +-------------------------------+
         |                                                       |
         +---------------------------+---------------------------+
                                     |
                                     v
                  +-------------------------------------+
                  |           Shared Package            |
                  |     - TypeScript Interfaces         |
                  |     - Constants & Business Rules    |
                  |     - Input Validation Routines     |
                  +-------------------------------------+
                                     |
                                     v
                  +-------------------------------------+
                  |           Supabase Backend          |
                  |     - PostgreSQL with RLS           |
                  |     - Database Triggers & Functions |
                  |     - Audit Logs & Authority Model  |
                  +-------------------------------------+
```

---

## 2. Directory Structure

```
E:\Jewellery App\
├── admin-web/               # Admin web dashboard (Next.js, TypeScript, Tailwind CSS, shadcn/ui)
│   ├── src/
│   │   └── app/             # Next.js App Router
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── customer-app/            # Customer Android mobile application (React Native, Expo, TypeScript)
│   ├── app/                 # Expo Router file-based navigation
│   ├── components/          # Reusable UI components
│   ├── constants/           # Mobile theme & styling constants
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                  # Common TypeScript definitions & constants
│   ├── types/               # Type definitions & data interfaces
│   ├── constants/           # Business and financial constants
│   ├── validation/          # Validation schemas and utilities
│   ├── business/            # Domain calculation and rule definitions
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/                # Database migrations, seed data, and Edge Functions
│   ├── migrations/          # Versioned SQL migration scripts
│   ├── functions/           # Supabase Edge Functions (when required)
│   └── seed/                # Development and test seed scripts
│
├── docs/                    # Architectural, setup, and business documentation
│   ├── PROJECT_ARCHITECTURE.md
│   ├── DEVELOPMENT_SETUP.md
│   └── BUSINESS_RULES.md
│
├── .gitignore               # Unified repository git ignore
├── README.md                # Repository root overview and guide
└── package.json             # Root monorepo orchestration & scripts
```

---

## 3. Technology Stack

| Layer | Technology | Target & Role |
| :--- | :--- | :--- |
| **Admin Web** | Next.js, React, TypeScript, Tailwind CSS, Lucide Icons, Recharts | Web app deployed on Vercel |
| **Customer App** | React Native, Expo (SDK 57+), Expo Router, TypeScript | Android APK / Google Play Store (Android only) |
| **Shared** | TypeScript | Common contracts, constants, and validators |
| **Backend & DB** | Supabase, PostgreSQL | Managed database, RLS, Auth, Edge Functions |

---

## 4. Security & Data Integrity Principles

1. **Authoritative Backend**: All financial calculations, maturity statuses, and bonus awards are strictly validated and computed server-side in PostgreSQL/Supabase.
2. **Row Level Security (RLS)**:
   - Customers can only read their own scheme enrollments and payment records.
   - Financial ledger entries are immutable once recorded.
   - Admin operations require authenticated and authorized admin roles.
3. **No Service-Role Key on Frontend**: The Supabase `service_role` key must never be bundled into the Admin Web or Customer Mobile applications.
4. **Audit Trail**: Every transaction, manual entry, cancellation, or redemption recorded in the system must track which administrator performed the action.
