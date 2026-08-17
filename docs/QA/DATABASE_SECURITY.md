# TawzeefX — Database Architecture & RLS Security Audit

**Audit Date:** 2026-08-17  
**Database Engine:** PostgreSQL (Supabase)  
**Total Tables:** 32  
**RLS Status:** 100% Enabled on all tables  
**Multi-Tenant Model:** Strict Schema-Enforced Row-Level Isolation (`company_id` foreign key)

---

## 1. TABLE RLS STATUS & POLICIES

| # | Table Name | RLS Enabled | Policies Configured | Tenant Isolation Mechanism |
|---|------------|-------------|---------------------|----------------------------|
| 1 | `companies` | ✅ YES | View self/branch, update if owner/admin | `id IN (SELECT get_user_companies())` |
| 2 | `company_members` | ✅ YES | View company members, manage if owner/admin | Non-recursive `get_user_companies()` |
| 3 | `company_branches` | ✅ YES | View branches if member of parent, manage if owner | `parent_company_id IN (SELECT get_user_companies())` |
| 4 | `company_settings` | ✅ YES | View/Update if company access | `has_company_access(company_id)` |
| 5 | `profiles` | ✅ YES | View self + teammates, update self only | `user_id = auth.uid() OR team membership` |
| 6 | `user_roles` | ✅ YES | View own role, insert/update/delete admin only | `auth.uid() = user_id (SELECT)`, admin-only mutation |
| 7 | `jobs` | ✅ YES | Public SELECT for published jobs; CRUD if company member | `(is_published AND is_active) OR has_company_access(company_id)` |
| 8 | `job_applications` | ✅ YES | Candidate views own; recruiter views company applicants | `user_id = auth.uid() OR has_company_access(company_id)` |
| 9 | `candidates` | ✅ YES | Company members manage candidates; anon insert on apply | `has_company_access(company_id)` + anon apply trigger |
| 10 | `candidate_scorecards` | ✅ YES | Interviewers & recruiters view/create scorecard | `has_company_access(company_id)` |
| 11 | `interviews` | ✅ YES | Company members view/manage; candidate views own | `has_company_access(company_id) OR user_id = auth.uid()` |
| 12 | `job_offers` | ✅ YES | Recruiter manages; Candidate accesses via secure RPC token | `has_company_access(company_id)` (Direct public SELECT disabled) |
| 13 | `pipelines` | ✅ YES | Company members view/manage hiring pipelines | `has_company_access(company_id)` |
| 14 | `pipeline_stages` | ✅ YES | Company members view/manage pipeline stages | `has_company_access(company_id)` |
| 15 | `hiring_goals` | ✅ YES | Company members view/manage headcount targets | `has_company_access(company_id)` |
| 16 | `tasks` | ✅ YES | Company members view/manage task board items | `has_company_access(company_id)` |
| 17 | `assessments` | ✅ YES | Company members manage; Candidates submit via token RPC | `has_company_access(company_id)` |
| 18 | `assessment_questions` | ✅ YES | Company members view/manage; sanitized via RPC for candidates | `has_company_access(company_id)` |
| 19 | `candidate_assessments` | ✅ YES | Candidate submits with token; recruiter reviews score | `has_company_access(company_id) OR token match` |
| 20 | `custom_roles` | ✅ YES | Company admins manage custom RBAC roles | `has_company_access(company_id) AND is_company_owner(company_id)` |
| 21 | `granular_permissions` | ✅ YES | Company admins manage screen-level permissions | `has_company_access(company_id)` |
| 22 | `notification_templates` | ✅ YES | Company recruiters manage email/SMS notification templates | `has_company_access(company_id)` |
| 23 | `notifications` | ✅ YES | Users view/update own notifications only | `user_id = auth.uid()` |
| 24 | `audit_log` | ✅ YES | Admins view company audit trail; INSERT via triggers/RPC | `has_company_access(company_id) AND has_role(auth.uid(), 'admin')` |
| 25 | `activity_log` | ✅ YES | Company members view feed; auto-populated by DB triggers | `has_company_access(company_id)` |
| 26 | `subscriptions` | ✅ YES | Company owner/admin views billing and plan info | `is_company_owner(company_id)` |
| 27 | `invoices` | ✅ YES | Company owner/admin views invoices | `is_company_owner(company_id)` |
| 28 | `webhook_endpoints` | ✅ YES | Company admins manage outgoing webhooks | `is_company_owner(company_id)` |
| 29 | `webhook_deliveries` | ✅ YES | Company admins view delivery attempt logs | `is_company_owner(company_id)` |
| 30 | `login_otp_challenges` | ✅ YES | Sealed from direct client access (USING: false) | Accessed exclusively via Edge Function service role |
| 31 | `password_reset_tokens` | ✅ YES | Sealed from direct client access (USING: false) | Accessed exclusively via Edge Function service role |
| 32 | `resume_archive` | ✅ YES | Company members view and search parsed CVs | `has_company_access(company_id)` |

---

## 2. ROW-LEVEL ISOLATION & MULTI-TENANCY VERIFICATION

### Prevention of Cross-Tenant Data Leaks
1. **Parent Company & Branch Hierarchy**:
   - Company hierarchy uses `has_company_access(_company_id)`:
   ```sql
   CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = auth.uid()
     ) OR EXISTS (
       SELECT 1 FROM public.companies c
       JOIN public.company_members pm ON pm.company_id = c.parent_company_id
       WHERE c.id = _company_id AND pm.user_id = auth.uid()
     ) OR public.has_role(auth.uid(), 'admin'::app_role);
   $$;
   ```
2. **Infinite Recursion Prevention**:
   - Resolved by helper function `public.get_user_companies()` which executes in `SECURITY DEFINER` mode without re-evaluating the table's own RLS policy.
3. **Public Token Isolation (IDOR Prevention)**:
   - Sensitive tables (`job_offers`, `assessments`, `login_otp_challenges`) do not have public `SELECT` policies.
   - Public access is strictly mediated by parameterized `SECURITY DEFINER` RPC functions (`get_offer_by_token`, `get_assessment_by_token`) which validate the cryptographically random token before returning sanitized fields.

---

## 3. AUDIT TRAIL INTEGRITY

- All security-critical events (login, role modification, company invitation, stage moves, offer acceptance) are tracked in `audit_log`.
- Database triggers automatically extract `auth.jwt() ->> 'email'` and `auth.uid()` rather than relying on untrusted client inputs.

---

*Generated by Full System Engineering Audit — Database Security Complete*
