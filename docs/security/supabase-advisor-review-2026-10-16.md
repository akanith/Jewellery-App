# Supabase production advisor review — 2026-10-16

**Project:** `ramyas-jeweller` (`yjpbswsgtbmgageburmy`, ap-south-1)  
**Database:** PostgreSQL 17.6  
**Scope:** Read-only review of the Supabase security and performance advisors. This document does not apply database changes.

## Summary

- The pre-launch admin-hardening migration `20261015231500_harden_admin_authorization_and_disable_test_account.sql` is **not yet applied** to production.
- No production data, indexes, grants, Auth users, or administrator rows were modified as part of this review.
- The two legitimate super-admin records, `ADMIN001` and `ADMIN002`, were verified active. `EMP-E2E-TEST` also remains active until the pending migration is approved and applied.
- A GitHub Actions run for main commit `d452e49` succeeded; GitHub’s commit-status API also reports the Vercel status as successful for that commit.

## Security advisor findings

### 1. RLS enabled, no policies — 3 informational findings

Tables:
- `public.customer_auth`
- `public.customer_sessions`
- `public.customer_password_reset_requests`

**Assessment:** Intentional for the current Customer BFF architecture, not a request to add permissive policies.

Evidence collected from production:
- RLS is enabled on all three tables.
- Direct `SELECT` and `INSERT` privileges are false for both `anon` and `authenticated`.
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

**Assessment:** The production privilege audit reports `anon` cannot execute these functions; `authenticated` can. Inspection confirmed the expected `private.is_admin()` or `private.is_super_admin()` guard reference in each flagged function. Authenticated execution is currently used by Admin Web calls, so a blanket revoke would break legitimate admin workflows.

**Disposition:** Documented as an intentional grant pattern conditional on the internal authorization check. The proposed admin-hardening migration strengthens those private helper functions to require an active profile with role `ADMIN`. Before deployment, validate the entire function bodies and real admin/non-admin behavior. Do not switch these to SECURITY INVOKER or revoke all authenticated grants indiscriminately.

### 3. Leaked-password protection — 1 warning

**Assessment:** Unresolved plan-level security gap. The Supabase organization currently reports the Free plan. Supabase’s official password-security documentation says leaked-password protection is available on Pro and above: https://supabase.com/docs/guides/auth/password-security

**Disposition:** Cannot be enabled on the current plan. Owner decision required to upgrade the project plan. Until then, retain strong minimum password requirements, password-reset protections, and the customer BFF login protections; do not mark this warning resolved.

## Performance advisor findings

### 4. Unindexed foreign keys — 8 informational findings

| Table | Foreign-key column |
|---|---|
| `customer_password_reset_requests` | `processed_by` |
| `customers` | `created_by` |
| `notifications` | `scheme_id` |
| `payments` | `recorded_by` |
| `redemptions` | `recorded_by` |
| `scheme_bonuses` | `credited_by` |
| `schemes` | `emergency_refund_by` |
| `schemes` | `enrolled_by` |

**Disposition:** Index candidates for a separately reviewed migration. Confirm no existing multi-column index already covers the key, measure table sizes, and test migration performance on a restored copy before production deployment.

### 5. Duplicate indexes — 6 warnings

Advisor-reported identical definitions:

- `payments`: `idx_payments_customer` / `idx_payments_customer_rls`
- `redemption_items`: `idx_redemption_items_parent` / `idx_redemption_items_redemption`
- `redemptions`: `idx_redemptions_customer` / `idx_redemptions_customer_rls`
- `scheme_bonuses`: `idx_bonuses_customer_rls` / `idx_scheme_bonuses_customer`
- `scheme_installments`: `idx_installments_customer_rls` / `idx_scheme_installments_customer`
- `schemes`: `idx_schemes_customer` / `idx_schemes_customer_rls`

Production index-statistics snapshot collected in the review showed higher usage for the RLS-suffixed index on each pair. The paired indexes are not backing constraints. Statistics are observations over the current stats-reset window, not a permanent guarantee.

**Disposition:** Recommend retaining the higher-usage RLS-suffixed indexes and planning to drop their exact redundant counterparts only after a fresh backup/restore validation and application-query review. No index was dropped.

### 6. Unused indexes — 11 informational findings

The advisor reported:
`idx_customers_phone`, `idx_schemes_customer`, `idx_schemes_code`, `idx_scheme_installments_customer`, `idx_payments_receipt`, `idx_redemptions_customer`, `idx_redemptions_date`, `idx_redemption_items_redemption`, `idx_redemption_items_category`, `idx_customer_auth_locked_until`, `idx_reset_req_status_requested`.

**Disposition:** Do not automatically drop these. Low/zero scan count may reflect the workload and stats-reset window. Verify constraint/uniqueness role, app query patterns, and index size before removal. Some are also part of the duplicate-index set above.

## Production change gate

Before applying `20261015231500_harden_admin_authorization_and_disable_test_account.sql`:

1. Take a fresh production logical backup after the multiple-scheme migration and verify its file sizes and a restore to an isolated database.
2. Reconfirm `ADMIN001` and `ADMIN002` are the intended active super-admins and that the E2E test admin is disposable.
3. Run the migration against isolated CI and verify admin/non-admin behavior; preserve all audit history.
4. Apply only after the owner approves the backup and preflight.
5. Re-run RPC permission probes, the Supabase advisors, Admin Web login/core workflows, and GitHub CI.

The local backups previously mentioned in project notes predate the multiple-scheme production migration and were not restore-tested. They are not sufficient evidence of a current restorable backup. No production migration is applied by this review.
