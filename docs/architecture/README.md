# Ramyas Jeweller System Architecture

## 1. Project Purpose
The **Ramyas Jeweller Savings Scheme Management System** is an enterprise-grade platform designed to manage customer jewellery savings schemes, monthly installments, scheme completions, redemption processing, and financial reporting for Ramyas Jeweller.

## 2. Applications
* **Admin Web Application (`apps/admin-web`)**: Next.js App Router application built for Store Owners, Managers, and Staff to manage customers, schemes, payments, redemptions, and view analytical reports.
* **Customer Mobile Application (`apps/customer-app`)**: Flutter mobile application for customers to view active savings schemes, track installment passbooks, view payment history, and monitor redemption status.

## 3. Technology Stack
* **Frontend Web**: Next.js 14+, React 18, TypeScript, Tailwind CSS, lucide-react.
* **Frontend Mobile**: Flutter, Dart, Riverpod state management, GoRouter routing.
* **Backend & Database**: Supabase, PostgreSQL 15, Supabase Auth, Row Level Security (RLS).
* **Shared Libraries**: `@ramyas-jeweller/shared-types`, `@ramyas-jeweller/shared-validation`, `@ramyas-jeweller/shared-constants`.

## 4. High-Level Architecture
Both the Admin Web App and Customer Mobile App interact with the **SAME** Supabase backend and PostgreSQL database.

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Admin Web (Next.js)   │         │ Customer App (Flutter)  │
└────────────┬────────────┘         └────────────┬────────────┘
             │                                   │
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE LAYER                        │
│   Auth Services  │  Row Level Security  │  RPC Functions    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL DATABASE                     │
│  profiles │ customers │ scheme_plans │ customer_schemes ... │
└─────────────────────────────────────────────────────────────┘
```

## 5. Admin Web Layering
```
UI Component -> Feature Logic -> Centralized Service Layer -> Supabase Client -> Database / RPC
```
* **No Direct DB Queries in UI**: Components consume service methods.
* **Error Normalization**: All Supabase or network errors pass through `lib/errors/error-handler.ts` to convert raw errors into `AppError` instances with normalized user-friendly messages.

## 6. Customer Mobile App Architecture
```
Widget / Screen -> Riverpod State Provider -> Service / Repository -> Supabase Client -> Database / RPC
```
* Built using Clean Layered Architecture (`lib/core`, `lib/features`, `lib/shared`).
* Strict separation between presentation and network/database layers.

## 7. Supabase & PostgreSQL Security
* **Row Level Security (RLS)**: Enforced on every table.
  * Customers can read/update ONLY their own scheme and installment records.
  * Store Owners and Admins have access granted via validated JWT claims/role profiles.
* **No Service Role Key**: Client applications strictly use `anon` keys. Elevated operations are handled via security definer RPC functions or Supabase Edge Functions.

## 8. Shared Packages
* `packages/shared-types`: Standard TypeScript interfaces.
* `packages/shared-validation`: Common validation logic (e.g. Indian mobile number format validation).
* `packages/shared-constants`: Enums and constant maps (Roles, Statuses, Payment Methods).

## 9. Development Phases
* **Phase 1 (Current)**: Monorepo & System Foundation, App Shells, Error Architecture, Environment Configs, Documentation.
* **Phase 2**: PostgreSQL Database Schema, Supabase Auth Integration, RLS Policies, Database Migrations.
* **Phase 3**: Shared Business Logic, API Services, Customer Management & Scheme Plans.
* **Phase 4**: Installment & Payment Engine (Cash, UPI, Online Gateway).
* **Phase 5**: Passbook & Scheme Redemption Workflow.
* **Phase 6**: Admin Reports, Analytics Dashboard, Audit Logs, Settings.
* **Phase 7**: End-to-End Testing, Security Auditing, Production Build & Deployment.
