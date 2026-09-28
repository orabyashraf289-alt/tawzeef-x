# Migration reconciliation before a production push

Snapshot: 2026-09-28. Production project `rlfewneisuezsamhosct` has 112 recorded versions. This branch has 138 active timestamped SQL files; 26 versions are not recorded in production. The six `20260927124...` repairs were applied independently even though older versions remain pending. A clean local replay tests the repository's chronological order, **not** the order that a production push would encounter. Do not run `supabase db push` against production on the basis of the local replay.

The observations below use migration files and read-only catalog queries (`information_schema`, `pg_class`, `pg_proc`, `pg_policies` and function ACLs). No candidate or Auth rows were read or changed. A table or function appearing in production does not prove that its definition matches an unrecorded migration.

| Pending version | Production evidence / decision before deployment |
| --- | --- |
| `20260722100000` | Candidate/company isolation policies: compare each policy with the six already-applied September tenant fixes; do not restore a broader policy. |
| `20260722110000` | `jobs.approval_chain` is absent; review column semantics and existing job data before adding it. |
| `20260722160000` | `handle_new_application()` exists; compare its actual definition and triggers before replacing it. |
| `20260722183000` | Another replacement of `handle_new_application()`; compare with the live function and storage flow. |
| `20260722221500` | Candidate/application RLS and trigger replacement; compare against later September tenant policies first. |
| `20260723020000` | `applications.tracking_code` already exists; check column properties, indexes and trigger before recording the version. |
| `20260723103000` | Anonymous candidate-portal read policies could conflict with the later tenant hardening; review before applying. |
| `20260723104500` | `candidate_scorecards` already exists with RLS; compare policies and constraints. |
| `20260724035700` | Live signup trigger exists, but grants `admin` based on email text or user-provided metadata. The pending file is corrected on this branch; production needs a separate reviewed fix. |
| `20260724040700` | `is_super_admin(uuid)` exists; compare with the platform-role-only version already present in production. |
| `20260724040900` | Company-member RLS change; compare with current company-member policies and recursion behavior. |
| `20260724044100` | Diagnostic `get_auth_triggers()` function is absent; decide whether the production diagnostic is still required. |
| `20260726162500` | `custom_roles` is absent; review tenant ownership and grants before creation. |
| `20260726203500` | `granular_permissions` is absent; review its RLS and ownership before creation. |
| `20260726224500` | Depends on the preceding `granular_permissions` table; review its user-scoped design together with that table. |
| `20260727010000` | `tasks` lacks the proposed candidate/job/subtask/tag/comment columns; review the change as a group. |
| `20260729060000` | `company_invoices` and `subscription_upgrade_requests` already exist with RLS; direct `CREATE POLICY` statements may conflict with live policies. Compare definitions and data constraints. |
| `20260729070000` | Subscription RLS replacement; compare with live policies before changing existing access. |
| `20260729180000` | `companies.manager_user_id` is absent; review branch-manager model. |
| `20260729190000` | `company_invitations.branch_id` is absent while `accept_company_invitation()` exists; compare function and invitation schema together. |
| `20260805000000` | `automation_rules` and `automation_logs` are absent. Three invalid index column references were fixed for clean replay; the rule-write policy now checks company ownership. Review the wider automation flow before deployment. |
| `20260809000000` | Backfills `companies.parent_company_id` by casting `notes` JSON. Requires a guarded data preflight and staging test; no production rows were inspected here. |
| `20260912000000` | `google_indexing_logs` is absent; normalize its timestamped filename and review table RLS/grants. |
| `20260913000000` | `delete_company_cascade(uuid)` is absent; its body deletes company, candidate and user-linked records when called. Keep invocation disabled until the deletion flow is reviewed with synthetic records. |
| `20260913010000` | `delete_company_permanently(uuid,uuid)` already exists. Its production ACL permits `service_role`, not `authenticated` or `anon`. The pending migration now preserves that restriction; the service Edge Function supplies a verified human caller. |
| `20260913020000` | `platform_roles` and several platform functions already exist. Its live SELECT policy contains a self-reference that needs a synthetic RLS test. The pending file removes automatic super-admin grants based on email and avoids a self-query in that policy; compare all status constraints before applying. |

The unrecorded `20260724033600` super-admin mass grant and `20260725052500` anonymous password-changing RPC have been archived. The earlier destructive `20260724031500` clean-slate migration remains archived. Two untimestamped scripts that the CLI skipped have also been archived; they must not be renamed into active migrations.

## Reconciliation gate

1. Fix the live signup-trigger privilege escalation in a dedicated reviewed migration; editing a historically recorded file cannot change production.
2. For each of the 26 pending versions, compare the **complete** live definition and dependencies, then use a separately reviewed additive replacement or record an already-equivalent version only after verification. Test data-dependent backfills and deletion routines with synthetic records in a disposable environment.
3. Recheck the live migration list and migration diff after reconciliation. Keep deployment manual. Enable automatic deployment only after the production history and reviewed schema agree and the local replay remains green.
