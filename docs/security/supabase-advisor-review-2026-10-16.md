# Supabase production advisor review & deployment verification — 2026-10-16

**Project:** `ramyas-jeweller` (`yjpbswsgtbmgageburmy`, ap-south-1)  
**Database:** PostgreSQL 17.6  
**Scope:** Production post-deployment review and advisor disposition following verified backup and application of migrations `20261015231500` and `20261016130000`.

## Summary

- Both pre-launch migrations are **recorded as applied** to production:
  - `20261015231500_harden_admin_authorization_and_disable_test_account.sql`
  - `20261016130000_supabase_advisor_fk_indexes_and_duplicate_cleanup.sql`
- Production logical backup (schema: 155,314 B, data: 414,792 B, roles: 370 B) was taken and verified via an isolated restore test on local PostgreSQL 17.6 prior to applying migrations.
- The two legitimate super-admin records, `ADMIN001` (A.B.Kathiravven) and `ADMIN002` (A.K.Anith), remain active with `is_super_admin = true` and `permissions = {"all": true}`.
- Test administrator `EMP-E2E-TEST` (`7253715b-5508-489d-bcea-7f58d26e60c0`) is deactivated with `is_active = false`, `is_super_admin = false`, and `permissions = {}`. Historical audit logs (146 records) remain fully intact.
- Foreign-key indexes (8) and duplicate-index cleanup (9 dropped) were applied concurrently (`-- pg-delta: transaction=false`) via the Supabase CLI and verified in production.
- GitHub Actions CI for main commit `cc8fd5c` succeeded (Run #38867307512); Vercel deployment succeeded.

## Security advisor findings

### 1. RLS enabled, no policies — 3 informational findings

Tables:
- `public.customer_auth`
- `public.customer_sessions`
- `public.customer_password_reset_requests`

**Assessment:** Intentional for the current Customer BFF architecture, not a request to add permissive policies.

Evidence collected from production:
- RLS is enabled on all three tables.
- Direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges are false for both `anon` and `authenticated`.
- `service_role` retains the table access required by the server-side Customer BFF.

**Disposition:** Documented as intentional. Keep these tables inaccessible to client roles. Revisit only if the data-access architecture changes; do not add broad or placeholder RLS policies just to suppress the advisor.

### 2. Authenticated execution of SECURITY DEFINER functions — 11 warnings

Functions flagged by the advisor:
- `admin_reset_customer_password(uuid)`
- `cancel_customer_password_reset_request(uuid)`
- `complete_customer_password_reset_request(uuid)`
- `create_customer_with_scheme(...)`
- `delete_customer_account(...)`
- `enroll_customer_scheme(...)`
- `get_pending_customer_password_reset_requests(...)`
- `process_emergency_refund(...)`
- `record_installment_payment(...)`
- `record_scheme_redemption(...)`
- `update_customer_profile(...)`

**Assessment:** The production privilege audit reports `anon` cannot execute these functions; `authenticated` can. Authenticated execution is required by Admin Web workflows.

**Disposition & Verification:** Documented as an intentional grant pattern conditional on internal authorization checks:
- Helper functions `private.is_admin()` and `private.is_super_admin()` were hardened in migration `20261015231500` to strictly require `p.role = 'ADMIN' AND p.is_active = TRUE`.
- The test account `EMP-E2E-TEST` is deactivated and cannot execute these functions.
- Probes confirmed anonymous access returns `401 Unauthorized` (`permission denied for function ...`).

### 3. Leaked-password protection — 1 warning

**Assessment:** Unresolved plan-level security gap. The Supabase organization currently reports the Free plan. Supabase’s official password-security documentation states that leaked-password protection is available on Pro and above: https://supabase.com/docs/guides/auth/password-security

**Disposition:** Cannot be enabled on the current plan. Requires an explicit owner decision to upgrade the project plan. Until then, retain strong minimum password requirements, password-reset protections, and customer BFF login protections. Do not mark this warning resolved.

## Performance advisor findings

### 4. Unindexed foreign keys — 8 informational findings

| Table | Foreign-key column | Supporting Index Created |
|---|---|---|
| `customer_password_reset_requests` | `processed_by` | `idx_customer_password_reset_requests_processed_by` |
| `customers` | `created_by` | `idx_customers_created_by` |
| `notifications` | `scheme_id` | `idx_notifications_scheme_id` |
| `payments` | `recorded_by` | `idx_payments_recorded_by` |
| `redemptions` | `recorded_by` | `idx_redemptions_recorded_by` |
| `scheme_bonuses` | `credited_by` | `idx_scheme_bonuses_credited_by` |
| `schemes` | `emergency_refund_by` | `idx_schemes_emergency_refund_by` |
| `schemes` | `enrolled_by` | `idx_schemes_enrolled_by` |

**Disposition:** **RESOLVED.** All 8 missing foreign-key indexes were created concurrently via migration `20261016130000` and verified in production.

### 5. Duplicate indexes — 6 warnings & redundant unique-covering indexes

Duplicate pairs remediated:
- `payments`: `idx_payments_customer` (dropped) / `idx_payments_customer_rls` (retained)
- `redemption_items`: `idx_redemption_items_redemption` (dropped) / `idx_redemption_items_parent` (retained)
- `redemptions`: `idx_redemptions_customer` (dropped) / `idx_redemptions_customer_rls` (retained)
- `scheme_bonuses`: `idx_scheme_bonuses_customer` (dropped) / `idx_bonuses_customer_rls` (retained)
- `scheme_installments`: `idx_scheme_installments_customer` (dropped) / `idx_installments_customer_rls` (retained)
- `schemes`: `idx_schemes_customer` (dropped) / `idx_schemes_customer_rls` (retained)

Redundant indexes covering existing unique constraints dropped:
- `idx_customers_phone` (covered by `uq_customers_phone_number`)
- `idx_schemes_code` (covered by `schemes_scheme_code_key`)
- `idx_payments_receipt` (covered by `payments_receipt_number_key`)

**Disposition:** **RESOLVED.** All 9 redundant/duplicate indexes were dropped concurrently via migration `20261016130000`. Production verification confirmed the retained indexes exist with intact constraints.

### 6. Unused indexes — informational findings

The advisor reported low or zero scan counts on pre-production indexes (`idx_customer_auth_locked_until`, `idx_reset_req_status_requested`, `idx_redemptions_date`, `idx_redemption_items_category`, etc.).

**Disposition:** Do not automatically drop these. Low/zero scan count reflects the low pre-launch transaction volume and stats-reset window rather than an unnecessary index. Application query patterns and uniqueness constraints rely on these definitions.

## Production change gate history

1. Fresh logical backup taken on 2026-10-16 (schema, data, roles). Checksums recorded in local manifest.
2. Isolated restore tested successfully in a disposable local PostgreSQL 17.6 database (`restore_validation`). Validated table counts, financial records, constraints, and pre-migration administrator state.
3. Production preflight confirmed table record counts, active super-admins (`ADMIN001`, `ADMIN002`), test admin (`EMP-E2E-TEST`), and dry-run migration list.
4. Migrations applied via `npx supabase db push --linked`. CLI honored `-- pg-delta: transaction=false` for concurrent index operations.
5. Post-deployment verification re-confirmed:
   - Migration history up-to-date (28/28 applied).
   - `ADMIN001` and `ADMIN002` active super-admins.
   - `EMP-E2E-TEST` deactivated (`is_active = false`, `is_super_admin = false`, `permissions = {}`).
   - Customer, scheme, installment, payment, bonus, redemption, and audit log counts unchanged.
   - Anonymous RPC access strictly denied (`401 Unauthorized`).
