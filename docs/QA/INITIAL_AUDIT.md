# TawzeefX — Full System Engineering Audit: Initial Discovery
**Audit Date:** 2026-08-17  
**Auditor Role:** Principal QA + SDET + AppSec + DevSecOps Engineer  
**Phase:** PHASE 0–1 — Repository Discovery & Initial Audit

---

## 1. TECHNOLOGY STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.8.3 |
| **Build Tool** | Vite | 5.4.19 |
| **UI Components** | Radix UI + shadcn/ui | Latest |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Routing** | React Router DOM | 6.30.1 |
| **State/Data** | TanStack React Query | 5.83.0 |
| **Animations** | Framer Motion | 11.18.2 |
| **Forms** | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| **Charts** | Recharts | 2.15.4 |
| **BaaS** | Supabase (PostgreSQL + Auth + Edge Functions) | 2.95.3 |
| **Serverless** | Deno Edge Functions (37 functions) | — |
| **Email** | Nodemailer (via SMTP edge function) | 6.9.16 |
| **AI** | External AI/GPT API via edge function | — |
| **Voice/TTS** | ElevenLabs API | — |
| **PDF** | pdfjs-dist + jsPDF | 6.0.227 / 4.2.0 |
| **Excel** | xlsx (SheetJS) | 0.18.5 |
| **Video** | Custom WebRTC room | — |
| **Testing** | Vitest + Testing Library | 3.2.4 |
| **CI/CD** | GitHub Actions | — |
| **Hosting** | Vercel | — |
| **CDN** | Vercel Edge Network | — |

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  React 18 SPA (Vite) — RTL Arabic + English bilingual       │
│  58 Pages · 66+ Components · Lazy-loaded routes             │
├─────────────────────────────────────────────────────────────┤
│                    ROUTING / AUTH                           │
│  React Router v6 · ProtectedRoute · RoleProtectedRoute      │
│  Roles: super_admin, admin, recruiter, reviewer, job_seeker  │
├─────────────────────────────────────────────────────────────┤
│                   SUPABASE BaaS LAYER                       │
│  PostgreSQL (RLS enabled on all tables)                     │
│  Auth: JWT, OTP, LinkedIn OAuth, Password Reset             │
│  Storage: avatars, resumes buckets                          │
│  37 Deno Edge Functions                                     │
├─────────────────────────────────────────────────────────────┤
│               EXTERNAL INTEGRATIONS                         │
│  OpenAI/AI API · ElevenLabs TTS · LinkedIn OAuth           │
│  SMTP (nodemailer via edge fn) · Webhook deliveries         │
├─────────────────────────────────────────────────────────────┤
│                  INFRASTRUCTURE                             │
│  Vercel (SPA hosting + edge) · GitHub Actions CI            │
│  Supabase Cloud (DB + Functions + Auth)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. FRONTEND ARCHITECTURE

### Route Structure (58 pages total)
**Public Routes (no auth required):**
- `/` — Landing Page
- `/auth` — Login / Register / OTP
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset execution
- `/careers` — Public job board
- `/apply/:id` — Job application (public)
- `/portal` — Candidate tracking portal (public)
- `/book/:candidateId` — Interview booking (public token)
- `/offer/:token` — Offer portal (public token)
- `/assessment/:token` — Assessment portal (public token)
- `/meeting/:roomId` — Video meeting room (public)
- `/install` — PWA install page
- `/pricing`, `/about`, `/features`, `/contact` — Marketing
- `/blog`, `/blog/:slug` — Blog
- `/privacy`, `/terms` — Legal
- `/invitation/:token` — Accept invitation (public token)
- `/typography` — Dev page (⚠️ should be removed in production)

**Protected (authenticated, any role):**
- `/onboarding` — Post-signup onboarding
- `/seeker-dashboard` — Job seeker dashboard
- `/company` — Company portal
- `/agency` — Agency portal

**Role-Protected (admin + recruiter + reviewer):**
- `/dashboard`, `/jobs`, `/jobs/:id`, `/candidates`, `/candidates/:id`
- `/ai-assistant`, `/reports`, `/interviews`, `/notifications`
- `/pipeline`, `/offers`, `/settings`, `/hiring-plan`
- `/tutorial`, `/talent-pool`, `/task-board`, `/performance-evaluation`
- `/resume-archive`, `/audit-log`

**Admin + Recruiter only:**
- `/question-bank`, `/workflow`, `/checklist-tracker`, `/company/agencies`

**Admin only:**
- `/team`, `/admin/blog`, `/admin/companies`, `/admin/companies/:id`
- `/admin/agencies`, `/admin/quality`

**Super Admin only:**
- `/roadmap`

---

## 4. BACKEND ARCHITECTURE

### Supabase Edge Functions (37 total)
| Function | Auth Required | Risk Level |
|----------|--------------|------------|
| `evaluate-candidate` | Optional (degrades gracefully) | Medium |
| `send-email` | Required | **High** |
| `candidate-portal` | None (public) | **High** |
| `book-interview` | None (public token) | Medium |
| `offer-portal` (via `/offer/:token`) | None (public token) | Medium |
| `manage-smtp` | Required (admin) | **Critical** |
| `execute-password-reset` | Token-based | **High** |
| `request-password-reset` | None (public) | High |
| `log-audit-event` | Required | Medium |
| `linkedin-oauth` | None (OAuth flow) | High |
| `linkedin-post` | Required | Medium |
| `parse-resume` | Required | Medium |
| `semantic-search-candidates` | Required | Medium |
| `auto-rank` | Required | Low |
| `analyze-sentiment` | Required | Low |
| `generate-job-description` | Required | Low |
| `generate-interview-questions` | Required | Low |
| `generate-assessment-questions` | Required | Low |
| `evaluate-assessment-answers` | Token-based | Medium |
| `notify-stage-change` | Service role | Medium |
| `send-application-confirmation` | Service role | Medium |
| `send-welcome-email` | Service role | Low |
| `send-invitation` | Required | Medium |
| `send-webhook` | Required | Medium |
| `interview-reminders` | Scheduled | Low |
| `process-scheduled-emails` | Scheduled | Low |
| `request-login-otp` | None (public) | **High** |
| `verify-login-otp` | None (public) | **High** |
| `auto-create-candidate-account` | None/trigger | Medium |
| `candidate-chatbot` | Optional | Low |
| `chat` | Required | Medium |
| `elevenlabs-transcribe` | Required | Low |
| `elevenlabs-tts` | Required | Low |
| `email-tracking-pixel` | None (public) | Low |
| `og-apply`, `og-image` | None (public) | Low |
| `send-assessment-results` | Service | Low |

### Database
- **Engine:** PostgreSQL (Supabase)
- **RLS:** Enabled on all tables
- **Migrations:** 132 migration files (active schema evolution)
- **Key Tables:** candidates, jobs, interviews, offers, company_members, user_roles, audit_log, activity_log, notifications, assessments, tasks, pipelines, custom_roles, granular_permissions, subscription_plans, invoices

---

## 5. AUTHENTICATION & AUTHORIZATION

### Auth Methods
- Email/Password (via Supabase Auth)
- OTP (custom via edge function `request-login-otp` / `verify-login-otp`)
- LinkedIn OAuth (`linkedin-oauth` edge function)
- Magic Link / Invite flow

### Authorization Architecture
```
Frontend Guards:
  ProtectedRoute  → checks auth session only
  RoleProtectedRoute → checks session + DB role + granular screen permissions

Backend Guards (Supabase RLS):
  has_role(user_id, role) — checks user_roles table
  has_company_access(company_id) — checks company_members
  is_company_owner(company_id) — checks member_role = 'owner'
  get_user_companies() — returns all company IDs for user
  is_super_admin() — checks super_admin flag

Edge Function Auth:
  Manual JWT verification via auth.getUser(token)
  Service role key for internal operations
```

### RBAC Roles
| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | Platform | Full system access, cross-tenant |
| `admin` | Tenant | Company-level admin |
| `recruiter` | Tenant | Hiring team member |
| `reviewer` | Tenant | Interview panel member |
| `job_seeker` | Public | Candidate/applicant |

---

## 6. EXISTING TEST COVERAGE

### Test Files (17 total, Vitest)
| File | Tests | Coverage Area |
|------|-------|--------------|
| `security.test.ts` | 14 tests | RBAC matrix, rate limiting, input sanitization, JWT, session |
| `rpc-security.test.ts` | 20 tests | Offer RPC, privilege escalation, OTP access |
| `rls-assessment.test.ts` | ~10 tests | Assessment RLS logic |
| `file-validation.test.ts` | 12 tests | File type, size, MIME validation |
| `jobs.test.ts` | ~18 tests | Job CRUD business rules |
| `applications.test.ts` | ~14 tests | Application workflow |
| `interviews.test.ts` | ~16 tests | Interview scheduling |
| `offers.test.ts` | ~12 tests | Offer management |
| `audit-log.test.ts` | ~10 tests | Audit logging |
| `auth.test.tsx` | ~12 tests | Auth component rendering |
| `integration.test.ts` | ~10 tests | Integration scenarios |
| `ui-upgrades.test.tsx` | ~20 tests | UI component rendering |
| `kpi-details.test.tsx` | ~8 tests | KPI dialog rendering |
| `question-bank-render.test.tsx` | ~4 tests | Question bank UI |
| `typography-clipping.test.tsx` | ~6 tests | Typography rendering |
| `example.test.ts` | 1 test | Sanity check |
| **TOTAL** | **~173** | **Multiple areas** |

**Current Test Pass Rate: 173/173 (100%)**

---

## 7. EXISTING CI/CD

### GitHub Actions (`ci.yml`)
```yaml
Triggers: push to main/dev, PR to main
Steps:
  1. Checkout
  2. Node 20 setup
  3. npm ci
  4. TypeScript check (tsc --noEmit)
  5. Vitest run
  6. Vite build
```

**⚠️ MISSING FROM PIPELINE:**
- ESLint step
- Security scanning (SAST/SCA)
- Secrets scanning
- E2E tests (Playwright)
- DAST
- Accessibility tests
- Performance tests
- Coverage reporting
- Deployment to staging before production

---

## 8. SECURITY CONTROLS (EXISTING)

✅ Supabase RLS on all tables  
✅ Row-level isolation per tenant (company_id scoping)  
✅ JWT-based session management  
✅ OTP for trusted device verification  
✅ Audit log table with trigger auto-fill  
✅ RBAC with granular screen-level permissions  
✅ File upload validation (type, size, MIME)  
✅ Password reset token with expiry  
✅ SMTP credentials encrypted with AES-GCM  
✅ Rate limiting logic (in tests; needs backend verification)  
✅ `SECURITY DEFINER` RLS helper functions with `search_path = public`  

---

## 9. DEPENDENCY SECURITY FINDINGS (npm audit)

**Total Vulnerabilities: 23**

| Severity | Count |
|----------|-------|
| 🔴 Critical | **1** |
| 🟠 High | **17** |
| 🟡 Moderate | 4 |
| 🟢 Low | 1 |

### Critical
| Package | Issue | Fix Available |
|---------|-------|--------------|
| `vitest` | Arbitrary file read/execute via Vitest UI server | ✅ Yes |

### High (Selected — See SECURITY_FINDINGS.md for full list)
| Package | Issue | Fix Available |
|---------|-------|--------------|
| `react-router` / `react-router-dom` | XSS via open redirect, protocol-relative URL reinterpretation, arbitrary constructor injection | ✅ Yes |
| `pdfjs-dist` | Arbitrary JavaScript execution via malicious PDF | ✅ Yes |
| `vite` | Path traversal, `server.fs.deny` bypass on Windows | ✅ Yes |
| `xlsx` | Prototype pollution, ReDoS | ❌ **No fix available** |
| `postcss` | XSS, arbitrary file read via sourceMappingURL | ✅ Yes |
| `lodash` | Code injection via `_.template`, Prototype Pollution | ✅ Yes |
| `rollup` | Arbitrary file write via path traversal | ✅ Yes |
| `nanoid` | Infinite loops with zero/negative size | ✅ Yes |
| `form-data` | CRLF injection | ✅ Yes |
| `flatted` | Prototype Pollution, unbounded recursion DoS | ✅ Yes |
| `js-yaml` | Prototype Pollution, DoS via merge keys | ✅ Yes |
| `minimatch` / `picomatch` | ReDoS vulnerabilities | ✅ Yes |
| `brace-expansion` | Process hang, memory exhaustion | ✅ Yes |

---

## 10. TYPESCRIPT CHECK RESULT

```
Exit code: 0 — No TypeScript errors found ✅
```

---

## 11. SECURITY HEADERS AUDIT (vercel.json)

**⚠️ CRITICAL MISSING:**  
`vercel.json` currently only contains SPA rewrite rules. **No security headers are configured.**

Missing headers:
- ❌ `Content-Security-Policy` — **CRITICAL**
- ❌ `Strict-Transport-Security` (HSTS) — **HIGH**
- ❌ `X-Content-Type-Options` — **HIGH**
- ❌ `Referrer-Policy` — **MEDIUM**
- ❌ `Permissions-Policy` — **MEDIUM**
- ❌ `X-Frame-Options` / `frame-ancestors` — **HIGH**

---

## 12. IDENTIFIED SECURITY RISKS

### P0 — CRITICAL
| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-001 | `Access-Control-Allow-Origin: *` on ALL 37 Edge Functions | All edge functions | CORS misconfiguration — any origin can call sensitive APIs |
| SEC-002 | No Security Headers on Vercel deployment | `vercel.json` | XSS, clickjacking, MIME sniffing exposure |
| SEC-003 | Critical vulnerability in `vitest` (arbitrary file read/exec) | `package.json` | Fixable via update |
| SEC-004 | `pdfjs-dist` HIGH: arbitrary JS execution via malicious PDF upload | PDF viewer pages | Resume upload vector |

### P1 — HIGH
| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-005 | `react-router` open redirect XSS vector | `package.json` | Phishing / redirect attacks |
| SEC-006 | Auth session stored in `localStorage` (XSS accessible) | `client.ts` L13 | Should prefer httpOnly cookies where possible |
| SEC-007 | `/typography` debug route accessible in production | `App.tsx` L114 | Dev page leak |
| SEC-008 | `xlsx` (SheetJS) prototype pollution — **NO FIX available** | Excel export | Requires replacement or workaround |
| SEC-009 | `vite` path traversal on Windows | `package.json` | Build server risk |
| SEC-010 | `rollup` arbitrary file write via path traversal | `package.json` | Build pipeline risk |

### P2 — MEDIUM
| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-011 | `evaluate-candidate` allows unauthenticated calls (auth optional) | Edge function | May expose candidate evaluation to anon callers |
| SEC-012 | No explicit rate limiting on public endpoints (OTP, portal, apply) | Edge functions | Brute force / enumeration |
| SEC-013 | Audit log `user_email` auto-fill depends on JWT (correct), but legacy fallback accepts client-provided email | audit trigger | Minor trust boundary issue |
| SEC-014 | Static hardcoded PBKDF2 salt `"smtp-settings-salt"` in send-email function | `send-email/index.ts` | Predictable salt weakens SMTP credential protection |

### P3 — LOW
| ID | Finding | Location | Risk |
|----|---------|----------|------|
| SEC-015 | `localStorage.removeItem("tawzeef-x_trusted_device")` key hardcoded | `AuthContext.tsx` | Minor secret in source |
| SEC-016 | `minimatch`, `brace-expansion`, `picomatch` DoS vectors | devDependencies | Build-time only risk, not runtime |

---

## 13. CODE QUALITY FINDINGS

### Architecture
- ✅ Lazy-loading properly implemented for all non-critical routes
- ✅ ErrorBoundary at root level
- ✅ TanStack Query for server state with proper staleTime/gcTime
- ✅ Separation of concerns: hooks, contexts, pages, components
- ⚠️ Some components are very large (AIAssistant.tsx: 117KB, Settings.tsx: 106KB, Reports.tsx: 93KB) — violates Single Responsibility
- ⚠️ `(job as any)` TypeScript casts in multiple files — type safety gaps
- ⚠️ `(supabase.from("hiring_goals" as any))` — using `as any` to bypass TypeScript types on DB

### Missing Areas
- ❌ No E2E tests (Playwright/Cypress)
- ❌ No API integration tests against real/mock Supabase
- ❌ No performance tests (Lighthouse/k6)
- ❌ No accessibility tests (axe-core)
- ❌ No DAST scan configured
- ❌ No secrets scanning (Gitleaks)
- ❌ No SAST beyond basic ESLint
- ❌ No test coverage reporting configured

---

## 14. INITIAL RISK ASSESSMENT

| Category | Risk Level | Key Findings |
|----------|-----------|--------------|
| Authentication | 🟡 Medium | OTP + JWT solid; localStorage session is industry standard for SPAs but XSS-accessible |
| Authorization (RBAC) | 🟢 Low-Medium | RLS well-implemented; multi-tenant isolation hardened in recent migrations |
| Input Validation | 🟡 Medium | Frontend validation good; server-side RLS enforced; PDF parsing risk |
| File Uploads | 🟠 High | Type/size validation exists; pdfjs-dist HIGH CVE for malicious PDF execution |
| API Security | 🟠 High | Wildcard CORS on all edge functions is high risk |
| Dependencies | 🔴 Critical | 1 Critical, 17 High CVEs; xlsx has no fix available |
| Security Headers | 🔴 Critical | Zero security headers on production deployment |
| CI/CD | 🟠 High | No SAST, SCA, secrets scanning, or E2E in pipeline |
| Performance | 🟡 Medium | Large bundles (>600KB); no performance benchmarks |
| Accessibility | ⚪ Unknown | NOT TESTED — axe not configured |

---

## 15. RECOMMENDED TESTING STRATEGY

### Priority 1 — Fix Immediately (P0/P1)
1. Add security headers to `vercel.json` (CSP, HSTS, X-Frame-Options)
2. Fix wildcard CORS on edge functions (restrict to production domain)
3. Update `vitest`, `react-router`, `vite`, `rollup`, `pdfjs-dist` packages
4. Remove `/typography` debug route from production build
5. Fix static PBKDF2 salt in `send-email`

### Priority 2 — Add Test Coverage
1. Install Playwright + configure E2E framework
2. Add axe-core accessibility tests
3. Add k6 or Artillery performance smoke tests
4. Configure Gitleaks for secrets scanning

### Priority 3 — CI/CD Hardening
1. Add ESLint step to GitHub Actions
2. Add `npm audit --audit-level=high` quality gate
3. Add E2E smoke test step post-build
4. Add secrets scanning step (Gitleaks action)

---

## 16. NEXT STEPS (Execution Order)

| Step | Action | Priority |
|------|--------|----------|
| STEP 1 ✅ | Repository Discovery & Architecture Analysis | DONE |
| STEP 2 | Fix P0 Security Issues (CORS, Headers, CVEs) | **NOW** |
| STEP 3 | Create Screen Inventory (SCREEN_INVENTORY.md) | High |
| STEP 4 | Create API Inventory (API_INVENTORY.md) | High |
| STEP 5 | Create Playwright E2E framework | High |
| STEP 6 | Add Security Headers to vercel.json | **Immediate** |
| STEP 7 | Fix CORS wildcards in edge functions | **Immediate** |
| STEP 8 | Update vulnerable packages | High |
| STEP 9 | Add accessibility tests | Medium |
| STEP 10 | CI/CD hardening | Medium |
| STEP 11 | Final regression suite + full test run | Last |
| STEP 12 | Final Report & Release Decision | Last |

---

*Generated by Full System Engineering Audit — Phase 0 & 1 Complete*
