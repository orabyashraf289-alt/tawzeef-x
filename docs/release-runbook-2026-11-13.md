# Production Cutover & Security Governance Runbook — 2026-11-13
# دليل الإطلاق الإنتاجي والحوكمة الأمنية — ١٣ نوفمبر ٢٠٢٦

**Target Environment / البيئة المستهدفة:**
- **Repository / المستودع:** `https://github.com/orabyashraf289-alt/tawzeef-x`
- **Supabase Project Ref / معرّف مشروع Supabase:** `rlfewneisuezsamhosct`
- **Production URLs / روابط الإنتاج:** `https://tawzeefx.com`, `https://www.tawzeefx.com`, `https://tawzeef-x.vercel.app/`
- **Scope / النطاق:**
  - **Phase 0:** Rollout & verification of unpushed Hiring Integrity package (`2026-11-05`, 17 commits ahead of `origin/main`) + pre-release security audit.
  - **Phase 1–2:** `20261113170001_job_requisitions_manpower.sql`, `20261113170002_automation_outbound_runtime.sql`, and associated Edge Functions in this release window.
  - **Phase 4 Foundation:** PDPL / GDPR tenant data retention policies (`20261113170003_data_retention_policies.sql`).

> **Important / تنبيه:** Coordinate database migrations, Edge Function deployments, and the Vercel frontend cutover in a single short maintenance window. Once `20261105114059_assessment_attempt_integrity.sql` is applied, legacy frontend clients can no longer call the retired `start_assessment_response`, `submit_assessment_response`, or `apply_ai_evaluations` RPCs.
>
> يجب تنسيق ترحيلات قاعدة البيانات، ونشر وظائف الخادم (Edge Functions)، ونشر واجهة Vercel ضمن نافذة صيانة قصيرة متزامنة؛ لأن الترحيل `20261105114059` يُوقف صلاحية استدعاء دوال التقييم القديمة من المتصفح.

---

## 1. Pre-Flight Local & CI Gate / فحوص ما قبل النشر

Run and verify all automated checks **before** merging to `main` or touching production:

```bash
# 1. Security & migration invariant audit (Phase 0 + Phase 4)
npx vitest run src/test/release-readiness-audit.test.ts

# 2. TypeScript checks & full Vitest suite
npx tsc -p tsconfig.node.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npx vitest run

# 3. Production bundle build verification
npm run build
```

Confirm both GitHub Actions workflows succeed on the release PR against `main`:
- `.github/workflows/ci.yml` — rejects any migration containing `DELETE FROM auth.users`, runs `tsc`, `vitest run`, and `npm run build`.
- `.github/workflows/supabase-migrations.yml` — verifies unique 14-digit migration timestamps, replays all migrations on isolated PostgreSQL, verifies schema guardrails (e.g., `delete_company_permanently` restricted to `service_role`, `is_super_admin` uses `platform_roles` only), and executes all `supabase/tests/*.sql` rollback suites.

---

## 2. Phase 0 Ordered Deployment Commands / أوامر النشر المرتبة

### Step 2.1 — Link & Inspect Pending Migrations / ربط المشروع وفحص الترحيلات المعلقة

```bash
# Authenticate & link to production Supabase project (never run supabase/tests/*.sql on production!)
supabase login
supabase link --project-ref rlfewneisuezsamhosct

# Inspect remote vs local migration state
supabase migration list

# Mandatory dry-run before applying to production
supabase db push --dry-run
```

Verify the ordered migration sequence (skipping any `20261104*` / `20261105*` migrations that `supabase migration list` already shows as applied on remote):

1. `20261104114154_company_task_workflow.sql` *(if not yet applied on remote)*
2. `20261104114234_review_cycle_draft_workflow.sql` *(if not yet applied on remote)*
3. `20261105080654_hiring_integrity_permissions.sql` — `hiring_private.allowed()`, `has_hiring_permission()`, restrictive RLS guards, `create_question_bank_item()`.
4. `20261105114059_assessment_attempt_integrity.sql` — `hiring_private.assessment_attempts`, revokes legacy grading RPCs, `begin_assessment_attempt()`, `save_assessment_attempt()`, `finish_assessment_attempt()`, `claim_assessment_grading()`, `complete_assessment_grading()`, `review_assessment_response()`, `get_assessment_result_delivery()`.
5. `20261105114802_interview_booking_availability.sql` — `hiring_private.booking_slots`, conflict lock triggers, `interview_slot_workflow()`, `candidate_interview_booking()`.
6. `20261113170001_job_requisitions_manpower.sql` — Phase 1 Manpower Planning & Job Requisitions (`public.company_departments`, `public.job_requisitions`) with tenant isolation and workflow RPCs.
7. `20261113170002_automation_outbound_runtime.sql` — Phase 2 outbound automation queue (`public.automation_outbound_queue`), tenant-scoped `webhook_deliveries`, enqueue/claim/completion RPCs.
8. `20261113170003_data_retention_policies.sql` — Phase 4 PDPL/GDPR foundation: creates `public.company_retention_policies` with strict tenant admin (`owner`/`admin` in `company_members`) and `public.is_super_admin` RLS, audit trigger `sync_company_retention_policy_audit()`.

Apply migrations:

```bash
supabase db push
```

> **NEVER** execute `supabase/tests/*.sql` against the production database (`rlfewneisuezsamhosct`). Those scripts contain synthetic test fixtures intended only for disposable migration-replay databases.
>
> **يُمنع منعًا باتًا** تشغيل ملفات `supabase/tests/*.sql` على قاعدة الإنتاج؛ فهي مخصصة لبيئات الاختبار المعزولة فقط.

---

### Step 2.2 — Deploy Edge Functions & Verify Secrets / نشر وظائف الخادم والتحقق من المفاتيح

Verify required server secrets exist (do not print secret values in logs):

```bash
supabase secrets list --project-ref rlfewneisuezsamhosct
```

Confirm `ASSESSMENT_GRADING_MODEL` (defaults to `gemini-3.8-flash` when unset), AI provider API keys, and SMTP secrets are configured.

Deploy all modified Hiring Integrity functions (`2026-11-05` package) and governance/security-critical functions (`supabase/config.toml` governs `verify_jwt` for each function):

```bash
# Hiring integrity Edge Functions (all verify_jwt = true in supabase/config.toml)
supabase functions deploy auto-rank --project-ref rlfewneisuezsamhosct
supabase functions deploy book-interview --project-ref rlfewneisuezsamhosct
supabase functions deploy evaluate-assessment-answers --project-ref rlfewneisuezsamhosct
supabase functions deploy send-assessment-results --project-ref rlfewneisuezsamhosct
supabase functions deploy evaluate-candidate --project-ref rlfewneisuezsamhosct
supabase functions deploy chat --project-ref rlfewneisuezsamhosct

# Tenant governance, deletion & email delivery functions (verify_jwt = true in supabase/config.toml)
supabase functions deploy delete-company --project-ref rlfewneisuezsamhosct
supabase functions deploy resolve-tenant-route --project-ref rlfewneisuezsamhosct
supabase functions deploy manage-smtp --project-ref rlfewneisuezsamhosct
supabase functions deploy send-email --project-ref rlfewneisuezsamhosct

# Phase 1/2 automation & calendar functions in workspace (verify supabase/config.toml verify_jwt settings before deploy)
supabase functions deploy execute-automation-actions --project-ref rlfewneisuezsamhosct
supabase functions deploy calendar-ics-feed --project-ref rlfewneisuezsamhosct
supabase functions deploy interview-reminders --project-ref rlfewneisuezsamhosct
```

*(Ensure `supabase/config.toml` explicitly defines `verify_jwt` for any newly added Phase 1/2 functions such as `execute-automation-actions` and `calendar-ics-feed` prior to deployment; never pass `--no-verify-jwt` unless the function performs its own strict capability/cron-secret verification.)*

---

### Step 2.3 — Vercel Frontend Cutover / نشر الواجهة عبر Vercel

1. Merge the release PR into `main` on GitHub **only after** `ci.yml` and `supabase-migrations.yml` both pass.
2. Confirm Vercel triggers the production build from `main` and deploys cleanly to `https://tawzeef-x.vercel.app/` and `https://tawzeefx.com`.
3. Verify Vercel production environment variables point to Supabase project `rlfewneisuezsamhosct` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` / anon key) and **no** `SERVICE_ROLE` key is exposed in `VITE_*` variables.

---

## 3. Manual Supabase Dashboard Actions / الإجراءات اليدوية في لوحة تحكم Supabase

Complete these actions directly in the Supabase Dashboard for project `rlfewneisuezsamhosct`:

1. **Enable Leaked Password Protection / تفعيل الحماية من كلمات المرور المسربة:**
   - Navigate to **Authentication → Providers → Email** (or **Authentication → Attack Protection / Password Security** depending on dashboard layout).
   - Enable **Prevent use of leaked passwords** (HaveIBeenPwned integration).
   - *Note from `docs/release-closeout-2026-10-05.md`:* If the current Supabase plan restricts this toggle, document the plan requirement and schedule the plan upgrade before closing this security advisory.
   - Re-run **Database / Auth Advisors** in Supabase Dashboard to confirm the leaked-password warning clears.

2. **SMTP Live Delivery Test / اختبار الإرسال الحي للبريد الإلكتروني (SMTP):**
   - Verify active SMTP credentials in the platform / company SMTP configuration (`manage-smtp` / `send-email`) without exposing secrets in logs.
   - Send **one** test email strictly to an explicitly approved internal QA/owner email address (NEVER send test emails to real candidate records).
   - Confirm delivery, sender domain alignment (SPF / DKIM / DMARC), and clean response from `send-email`.

3. **Auth URLs & CORS Sanity / مراجعة روابط المصادقة وCORS:**
   - Under **Authentication → URL Configuration**, verify **Site URL** and **Redirect URLs** include only trusted domains (`https://tawzeefx.com`, `https://www.tawzeefx.com`, `https://tawzeef-x.vercel.app` and authorized Vercel preview patterns).

---

## 4. Running `supabase/audits/pre_release_security_audit.sql` / تشغيل فحص الأمان للقراءة فقط

Run [`supabase/audits/pre_release_security_audit.sql`](../supabase/audits/pre_release_security_audit.sql) in the **Supabase Dashboard SQL Editor** (or via read-only `psql` session) immediately after applying the migrations.

- **Safety guarantee / ضمان السلامة:** The script contains **only `SELECT` queries** and returns aggregated counts and catalog metadata only (zero candidate names, emails, row IDs, or Auth secrets).
- **Expected Results / النتائج المتوقعة:**

| `audit_section` | Expected `status` | Action if `WARN` or `FAIL` |
| --- | --- | --- |
| `legacy_candidate_links` | `PASS` (or `WARN` only if known July legacy row remains) | `FAIL` if `conflicting_company > 0` or `missing_job > 0` or `applications.missing_company > 0`. If `candidates.missing_user_without_job > 0` matches the single legacy July candidate documented in `docs/release-closeout-2026-10-05.md`, **do not auto-assign or delete**; confirm ownership with the platform owner. |
| `platform_roles_and_admin_checks` | `PASS` | `FAIL` if `platform_roles_rls_enabled = false`, `super_admin_count = 0`, `is_super_admin` references `user_metadata` / `user_roles` / hardcoded email, `security_definer_missing_search_path = true`, or `client_can_execute_delete_company_permanently = true`. |
| `legacy_rls_admin_policies` | `PASS` | `FAIL` if `flagged_policies` is non-empty (`has_role(..., 'admin')`, `user_metadata`, or hardcoded email in `pg_policies`) or any public/unscoped candidate/application policy exists. Remediate before opening traffic. |
| `orphaned_memberships_and_tenants` | `PASS` | `FAIL` if `memberships_without_company > 0`, `active_branches_without_active_parent > 0`, or `invalid_ready_registry_entries > 0`. Investigate `WARN` counts (`memberships_without_active_company`, `root_companies_missing_registry`). |
| `assessment_attempts_sanity` | `PASS` | `FAIL` if `company_mismatch_count > 0` or `missing_linked_records > 0`. Review `WARN` counts (`expired_still_in_progress`, `stale_grade_claims`, `max_grade_attempts_reached`). |
| `booking_slots_sanity` | `PASS` | `FAIL` if `company_mismatch_count > 0`. Review `WARN` counts (`booked_slots_missing_or_cancelled_interview`, `inactive_interviewer_open_slots`). |
| `rls_coverage_audit` | `PASS` | `FAIL` if `tables_without_rls_count > 0`. Verify `retention_policies_table_present = true` after Phase 4 migration. |

---

## 5. Verified Security Architecture Findings (Pre-Cutover Audit) / نتائج التدقيق الأمني

1. **`is_super_admin` Single Source of Truth (`public.platform_roles`):**
   - `20260927124005_restore_candidate_tenant_boundaries.sql` and `20261003163527_harden_platform_role_access.sql` enforce `public.platform_roles` as the sole authority for `is_super_admin(uuid)` and `is_super_admin_user()`.
   - Tenant `user_roles.role = 'admin'`, `profiles.role`, JWT `user_metadata`, and hardcoded emails are completely ignored.
   - `platform_roles` enables RLS, restricts `SELECT` to self or `is_super_admin`, and revokes all client writes (`INSERT/UPDATE/DELETE` restricted to `service_role`).
2. **`delete-company` Edge Function & `delete_company_permanently` RPC:**
   - `delete-company/index.ts` enforces `verify_jwt = true`, requires `Authorization`, validates the caller via `auth.getUser()`, verifies `platform_roles.role === "super_admin"` (403 otherwise), and protects the platform owner company (`is_platform_company === true` / `00000000-0000-0000-0000-000000000001`).
   - Exclusive company users (excluding `platform_roles`, `job_seeker` accounts, and multi-company staff) are signed out via `auth.admin.signOut()` and removed/banned via Auth Admin API before invoking `delete_company_permanently` (which is revoked from `PUBLIC, anon, authenticated` and restricted to `service_role`).
   - `delete_company_permanently` locks the tenant (`status = 'deleting'`), clears `auth.sessions`/`auth.refresh_tokens` and sets `banned_until` as defense-in-depth, decouples `audit_log.company_id = NULL` to preserve history, and cascades deletion across branches and child records (including `company_retention_policies` via `ON DELETE CASCADE`).
   - *Follow-up hardening notes (non-blocking):* in `delete-company/index.ts`, `listUsers({ perPage: 1000 })` in `purge_orphans` is single-page (should paginate once >1000 auth users), and `storageBuckets` (`resumes`, `company-logos`, `avatars`, `documents`) does not include `agency-documents` or `interview-recordings`.
3. **`resolve-tenant-route` Edge Function:**
   - Enforces `verify_jwt = true`, explicitly rejects missing tokens, `token === anonKey`, `token === serviceKey`, and `user.is_anonymous` (HTTP 401 `AUTH_REQUIRED`).
   - Verifies both target company and parent company `status === "active"`, validates `company_members` or `platform_roles` (`super_admin`), fails closed (`403 TENANT_ACCESS_DENIED` / `503` / `500`), and never returns `database_ref` or `serviceKey`.

---

## 6. Post-Deploy Verification Checklist / قائمة التحقق بعد النشر

### English Checklist
- [ ] **Migrations Recorded:** `supabase migration list` shows `20261105*` and `20261113*` applied cleanly with zero drift.
- [ ] **Audit Script Green:** `supabase/audits/pre_release_security_audit.sql` returns `PASS` across all critical sections (and any documented `WARN` is triaged).
- [ ] **Fail-Closed Auth & Tenant Checks:**
  - Unauthenticated or `anonKey`-only request to `resolve-tenant-route` or `delete-company` returns `401`.
  - Non-super-admin (including a tenant `owner`/`admin`) calling `delete-company` (`dry_run`) receives `403`.
  - `resolve-tenant-route` returns `200` (`route: "shared"`) for an active tenant member and `403` for a non-member.
- [ ] **Hiring Integrity Smoke Test (authorized test accounts, no synthetic candidate clutter left behind):**
  - Question bank create/edit respects `has_hiring_permission` (`create` works without `edit`).
  - Candidate assessment starts only with a valid `TX-*` tracking code, enforces server timer, prevents stale autosave overwrite, grades server-side, and `send-assessment-results` rejects browser-supplied recipient/score overrides.
  - Interview availability slot creation, self-booking, double-booking lock, cancel, and reschedule behave correctly in Cairo/Riyadh time zones.
- [ ] **Phase 4 PDPL/GDPR Foundation (`company_retention_policies`):**
  - Tenant `owner`/`admin` can read/upsert retention settings for their active company; `updated_by` and `updated_at` are stamped server-side.
  - Cross-tenant user, `viewer`, and `anon` requests to `company_retention_policies` are denied by RLS.
- [ ] **Dashboard Actions Closed:** Leaked Password Protection status verified and SMTP live delivery test confirmed with approved internal recipient.
- [ ] **Rollback Rule:** If a defect occurs post-cutover, **fix forward** — NEVER re-grant execution on retired client-side grading RPCs (`start_assessment_response`, `submit_assessment_response`, `apply_ai_evaluations`).

### القائمة العربية للتحقق بعد النشر
- [ ] **تسجيل الترحيلات:** التأكد عبر `supabase migration list` من تطبيق ترحيلات `20261105*` و`20261113*` بالترتيب الصحيح دون أخطاء.
- [ ] **نتيجة التدقيق الأمني:** تشغيل `pre_release_security_audit.sql` والتأكد من حالة `PASS` في كافة الأقسام الحرجة ومراجعة أي `WARN` موثق.
- [ ] **فحص الإغلاق الآمن (Fail-Closed):**
  - رفض الطلبات غير المصرح بها أو المعتمدة على `anonKey` فقط برمز `401` في `resolve-tenant-route` و`delete-company`.
  - رفض استدعاء `delete-company` (`dry_run`) من مدير شركة عادي برمز `403`.
  - إرجاع `200` (`route: "shared"`) لعضو الشركة النشطة و`403` لغير العضو في `resolve-tenant-route`.
- [ ] **فحص مسارات التوظيف الحية (بحسابات اختبار معتمدة دون ترك بيانات وهمية):**
  - صلاحيات بنك الأسئلة، وبدء الاختبار برمز `TX-*` حقيقي، ومنع الكتابة المتأخرة، والتصحيح والمراجعة من الخادم، ورفض تعديل المستلم أو الدرجة من المتصفح في `send-assessment-results`.
  - إتاحة مواعيد المقابلات، الحجز الذاتي، منع التعارض، الإلغاء، وإعادة الجدولة بتوقيت القاهرة/الرياض.
- [ ] **فحص سياسات الاحتفاظ بالبيانات (PDPL/GDPR):**
  - تمكّن مالك/مدير الشركة النشطة فقط من قراءة وتحديث `company_retention_policies` مع توثيق `updated_by` تلقائيًا، ورفض الوصول عبر الشركات أو للمشاهدين والزوار.
- [ ] **إغلاق المهام اليدوية:** تفعيل حماية كلمات المرور المسربة (Leaked Password Protection) وإتمام اختبار إرسال SMTP لبريد داخلي معتمد.
- [ ] **سياسة الرجوع عند الطوارئ:** الإصلاح للأمام مع الإبقاء على حماية الدرجات؛ يُمنع إعادة تفعيل دوال التقييم القديمة من المتصفح.

---

## 7. Safe Cleanup Steps for the ~85 Merged GitHub Branches / خطوات التنظيف الآمن للفروع المدمجة (~85 فرعًا)

Follow this **verify-first** procedure before deleting any remote branch:

```bash
# 1. Refresh local remote-tracking refs and prune already-deleted branches
git fetch origin --prune

# 2. List all remote branches fully merged into origin/main (excluding protected branches)
git branch -r --merged origin/main \
  | sed 's|^[[:space:]]*origin/||' \
  | grep -Ev '^(HEAD|main|dev|production|staging)$' \
  | sort > /tmp/merged_branches.txt

wc -l /tmp/merged_branches.txt
cat /tmp/merged_branches.txt
```

### Double-check against open PRs & commit history (using GitHub CLI `gh`) / التحقق المزدوج من طلبات الدمج المفتوحة:

```bash
# 3. Export branches attached to ANY open PR so they are never deleted
gh pr list --repo orabyashraf289-alt/tawzeef-x --state open --limit 200 --json headRefName --jq '.[].headRefName' \
  | sort -u > /tmp/open_pr_branches.txt

# 4. Compute safe deletion candidates = merged into origin/main AND NOT in any open PR
comm -23 /tmp/merged_branches.txt /tmp/open_pr_branches.txt > /tmp/safe_to_delete_branches.txt

# 5. Record a timestamped audit manifest of branch -> commit SHA before deleting anything
while read -r branch; do
  sha=$(git rev-parse "origin/$branch")
  echo "$sha refs/heads/$branch"
done < /tmp/safe_to_delete_branches.txt > "branch-cleanup-manifest-$(date +%Y%m%d).txt"

cat /tmp/safe_to_delete_branches.txt
```

### Execute Deletion in Controlled Batches / التنفيذ على دفعات بعد المراجعة:

```bash
# 6. Verify each candidate still has 0 commits ahead of origin/main, then delete remotely
while read -r branch; do
  ahead=$(git rev-list --count "origin/main..origin/$branch")
  if [ "$ahead" -eq 0 ]; then
    echo "Deleting merged branch: $branch"
    git push origin --delete "$branch"
  else
    echo "SKIPPED (ahead=$ahead): $branch"
  fi
done < /tmp/safe_to_delete_branches.txt

# 7. Clean up local tracking refs afterward
git fetch origin --prune
```

> **Safety Rules / قواعد الأمان:**
> - **Never** delete `main`, `dev`, `production`, `staging`, or any branch with `ahead > 0` or an open PR.
> - Keep the generated `branch-cleanup-manifest-YYYYMMDD.txt` file temporarily outside git (or in ops archive) so any deleted branch SHA can be restored via `git branch <name> <sha>` if ever needed.
> - **لا تحذف** أبدًا الفروع الأساسية أو أي فرع يحتوي على التزامات غير مدمجة أو طلب دمج مفتوح، واحتفظ بسجل الـ SHA للرجوع عند الحاجة.
