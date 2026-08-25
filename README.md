# Ramyas Jeweller — Savings Scheme Management System

Production-oriented monorepo for the **Ramyas Jeweller Savings Scheme Management System**.

## System Architecture

```
ramyas-jeweller/
├── apps/
│   ├── admin-web/       # Next.js 14+ Owner/Admin Web Application
│   └── customer-app/    # Flutter Customer Mobile Application
├── packages/
│   ├── shared-types/    # Shared TypeScript type definitions
│   ├── shared-validation/ # Shared data validation schemas
│   └── shared-constants/  # Shared business constants & enums
├── supabase/            # Supabase migrations, edge functions, seed scripts & config
└── docs/                # Architecture and database documentation
```

## Current Phase Status

* **Phase 1 (Foundation)**: ✅ Completed
  * Monorepo architecture created
  * Admin Web App shell established
  * Customer Mobile App structure established
  * Shared package structure established
  * Supabase foundation & config established
  * Environment configuration templates prepared safely
  * Normalized error handling architecture implemented
  * System architecture documentation generated
* **Phase 2 (Database & Security)**: Pending

## Core Business Flow

```
Customer ──> Customer Scheme ──> Installments ──> Scheme Completion ──> Redemption ──> Financial Audit
```

## Security Rules
1. Both Admin Web and Customer App share the **SAME** Supabase backend.
2. All database queries must be guarded by PostgreSQL **Row Level Security (RLS)**.
3. Client applications must **NEVER** expose the Supabase `service_role` key.
4. Business queries must be routed through service abstractions, **NEVER** called directly inside UI components.
