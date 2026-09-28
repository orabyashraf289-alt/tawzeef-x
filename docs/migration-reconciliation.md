# Migration reconciliation before a production push

Snapshot: 2026-09-28. Production project `rlfewneisuezsamhosct` has **113** recorded versions, including the individually applied signup fix `20260928170918`. The repository had 139 active files after PR #18. This change archives eight unrecorded historical scripts, leaving **131** active files and **18** versions missing from production. No version was marked as applied by archiving a file, and no production SQL was run for this change.

The observations below use repository files and read-only production catalog queries (`pg_class`, `pg_attribute`, `pg_constraint`, `pg_indexes`, `pg_proc`, `pg_trigger`, and `pg_policies`). No candidate, Auth, job, or company rows were read or changed. Existence of an object does not prove its definition or migration side effects match.

| Still pending | Production evidence / required reconciliation |
| --- | --- |
| `20260722110000` | `jobs.approval_chain` is absent. Add the column with a reviewed default; assess the effect of the original blanket UPDATE on existing jobs. |
| `20260722160000` | `handle_new_application()` exists, but its complete live body differs from this replacement. Compare triggers and candidate handling. |
| `20260722183000` | Another replacement of `handle_new_application()`. It differs from the live function and writes candidate and resume data when invoked. |
| `20260723020000` | `applications.tracking_code` exists. Its live btree index on that column has a **different name**, so the pending `CREATE INDEX IF NOT EXISTS` would create a redundant index. |
| `20260726162500` | `custom_roles` is absent, although the frontend queries it. Its proposed public read/write RLS policies use `true`; design tenant ownership and grants before creation. |
| `20260726203500` | `granular_permissions` is absent, although the frontend queries it. Its proposed public read/write RLS policies use `true`; design tenant ownership and grants before creation. |
| `20260726224500` | Depends on `granular_permissions`; review per-user overrides and the uniqueness key together with that table. |
| `20260727010000` | `tasks` lacks proposed candidate/job/subtask/tag/comment columns. Check intended task access and indexes before the additive change. |
| `20260729060000` | `company_invoices` and `subscription_upgrade_requests` exist with RLS and live policies. The pending unconditional `CREATE POLICY` statements conflict with existing policies; compare the complete schema and live `is_super_admin_user()` function first. |
| `20260729070000` | Live subscription policies already use `is_super_admin()` and ownership; compare their effective rules before any replacement. |
| `20260729180000` | `companies.manager_user_id` is absent, although the frontend reads it. Review the branch-manager access model before adding it. |
| `20260729190000` | `company_invitations.branch_id` is absent. **Do not replay the pending function:** it replaces the live `accept_company_invitation()` and removes the signed-in user's email match with the invitee. Validate branch ownership as well. |
| `20260805000000` | `automation_rules` and `automation_logs` are absent. Review cross-company access, rule execution, grants, and indexes together. |
| `20260809000000` | Backfills `companies.parent_company_id` by casting `notes` text to JSON. It needs an error-safe aggregate preflight and staging test; production rows were not inspected. |
| `20260912000000` | `google_indexing_logs` is absent. The pending INSERT policy allows `anon` and its SELECT policy allows every authenticated user; restrict both before deployment. |
| `20260913000000` | `delete_company_cascade(uuid)` is absent. Its pending body can permanently delete companies and candidates when called, and grants execution to `authenticated`. Keep deployment disabled pending a reviewed deletion flow and synthetic test. |
| `20260913010000` | `delete_company_permanently(uuid,uuid)` exists and only `service_role` can execute it. Compare its complete live definition with this pending replacement and preserve that ACL. |
| `20260913020000` | `platform_roles` and platform functions exist. The live SELECT policy queries `platform_roles` from itself, which needs an isolated RLS test. The pending file also updates company rows based on their names and changes status constraints; verify before deployment. |

## Archived in this reconciliation

| Unrecorded version | Reason / outstanding work |
| --- | --- |
| `20260722100000` | Contains candidate/job/application backfills and older tenant policies. Its backfills are **not assumed complete**; review them separately without exposing candidate data. |
| `20260722221500` | Contains candidate/application backfills, universally accessible RLS policies, and an outdated trigger body. Backfills remain unverified. |
| `20260723103000` | Adds public tracking-code SELECT policies that would expose rows without proving possession of a valid code. Later applied protections removed this approach. |
| `20260723104500` | Recreates a table already present and adds an unrestricted scorecard policy; the September production repair has narrower policies. |
| `20260724035700` | Would overwrite the individually applied hardened signup function and reconsider an invitation-supplied role during Auth insert. |
| `20260724040700` | Would allow caller-controlled JWT user metadata or an email address to grant super-admin access. Live authorization now uses `platform_roles`. |
| `20260724040900` | Its sole company-member SELECT policy matches the live policy's predicate; no new schema is needed. |
| `20260724044100` | Adds an unused SECURITY DEFINER diagnostic function to the exposed schema; absent in production. |

The archived SQL is preserved as `.sql.disabled` under `docs/archived-migrations/`. These eight versions were **not** added to production history. Archiving the first two avoids an unsafe replay while leaving their data repair work open; it is not proof that any existing rows were fixed.

## Deployment gate

1. Do not run a global `supabase db push`. A clean local replay tests chronological fresh-project setup, not the order these 18 older pending files would run on the live project after September's already applied repairs.
2. Compare each remaining file's full effect with the live catalog. Stage safe replacements on a disposable database; use synthetic records for data backfills and deletion flows. Record a historical version as applied only when its complete effects are verified equivalent.
3. Recheck the production migration list after each individual change. Keep deployment manual until both the migration history and the reviewed schema agree.
