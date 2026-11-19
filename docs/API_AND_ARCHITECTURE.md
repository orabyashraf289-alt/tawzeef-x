# TawzeefX — API, Security & Architecture Documentation

## 1. Platform Architecture Overview
TawzeefX is a multi-tenant AI recruitment & Applicant Tracking System (ATS) built with:
- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind CSS + Radix UI + Framer Motion
- **Backend & Data**: Supabase (PostgreSQL with Row-Level Security, Edge Functions, Auth, Storage)
- **Hosting & Edge Routing**: Vercel (`vercel.json` with strict CSP, HSTS preload, pre-rendered SEO routes, and serverless dynamic SEO pages)

---

## 2. Public Developer REST API v1 & SDKs (`p5-api`, `p5-sdk`)
- **Engine**: `src/lib/developerApiEngine.ts`
- **Portal UI**: `/settings?tab=api` (`src/components/settings/DeveloperApiHub.tsx`)
- **Authentication**: Bearer token header `Authorization: Bearer tx_live_<key>`
- **Supported Scopes**:
  - `jobs:read` — List and retrieve open vacancies
  - `jobs:write` — Create and update job postings
  - `candidates:read` — Read candidate profiles and pipeline statuses
  - `candidates:write` — Programmatically submit candidate applications
  - `webhooks:manage` — Register and manage outbound event webhooks
- **Core Endpoints (OpenAPI 3.1)**:
  - `GET /v1/jobs` — Returns active published vacancies for the authenticated tenant
  - `POST /v1/candidates` — Creates a candidate record and returns a tracking code
- **SDK Snippets**: Auto-generated for TypeScript (`@tawzeefx/sdk`), Python (`requests`), and `cURL`.

---

## 3. Security, Compliance & E2E Encryption (`p2-e2e`, `p5-soc2`, `p5-compliance-reports`)
- **Field-Level End-to-End Encryption**: `src/lib/e2eEncryption.ts`
  - Uses Web Crypto API (`PBKDF2-SHA256`, 100,000 iterations + `AES-256-GCM`)
  - Envelope format: `TXENC:v1:<base64-salt>:<base64-iv>:<base64-ciphertext>`
  - Protects candidate PII fields (`national_id`, `phone`, `expected_salary`, `notes`, `license_number`) and provides safe masked log output via `maskSensitiveValue()`.
- **SOC 2 Type II & Saudi PDPL Readiness Engine**: `src/lib/complianceEngine.ts`
  - Evaluates Trust Services Criteria (`CC6.1`, `CC6.6`, `CC6.7`, `CC7.2`, `A1.2`) and Saudi PDPL controls (`PDPL-18`, `PDPL-19`, `PDPL-24`).
  - Exports timestamped audit bundles in **PDF**, **CSV**, and **JSON Evidence** formats from `/audit-log` → **Compliance Center**.
- **Data Retention**: `company_retention_policies` + `execute_company_data_retention` (with Dry Run preview) inside `/settings?tab=security`.
- **Guest & Live Session Telemetry**: `src/components/security/GuestVisitorsMonitor.tsx`, `LiveSessionsMonitor.tsx`, and `VisitorTrackerManager.tsx`.

---

## 4. Regionalization, Legal Contracts & Localization (`p5-hijri`, `p5-currency`, `p5-contracts`, `p5-langs`)
- **Languages (`src/contexts/I18nContext.tsx`)**:
  - Arabic (`ar`, RTL), English (`en`, LTR), French (`fr`, LTR), Urdu (`ur`, RTL)
- **Regional Settings (`src/lib/regionalSettings.ts`)**:
  - Calendar modes: Gregorian, Hijri (Umm al-Qura `islamic-umalqura`), and Dual display
  - 10 supported currencies (`SAR`, `AED`, `KWD`, `QAR`, `BHD`, `OMR`, `EGP`, `JOD`, `USD`, `EUR`) with SAR-anchored automated conversion
  - GCC & international timezones and workweek presets (`sun-thu` / `mon-fri`)
- **Regional Contract Templates (`src/lib/regionalContractTemplates.ts`)**:
  - Saudi Labor Law / Qiwa Standard (`KSA_QIWA`), Saudi Telework (`KSA_REMOTE`), UAE MOHRE 33/2021 (`UAE_MOHRE`), Egypt Individual Labor (`EGYPT_LABOR`), and International Contractor (`INTL_CONTRACTOR`) accessible inside `/offers`.

---

## 5. Performance, Offline Resilience & Observability (`p4-offline`, `maint-db`, `maint-monitoring`)
- **Zero-Flash SEO Boot Guard**: `index.html` + `src/main.tsx` sync light/dark theme synchronously before first paint and hide `[data-seo-prerender]` during JS hydration while keeping Wave-1 semantic HTML intact for non-JS crawlers.
- **Chunk Splitting (`vite.config.ts`)**: Pins `react`, `react-dom`, `vite/preload-helper`, and `commonjsHelpers` to `vendor-react`, keeping `vendor-charts`, `vendor-pdf`, `vendor-gsap`, `vendor-three`, and `vendor-xlsx` 100% lazy-loaded on demand.
- **Offline Sync Outbox (`src/lib/offlineSyncEngine.ts`)**: Queues field evaluations/check-ins in `tx_offline_action_queue_v1` and replays automatically on `online` reconnect.
- **System Health Monitor (`src/lib/systemHealthMonitor.ts`)**: Live Supabase DB round-trip latency probe, Navigation Timing Web Vitals, client storage footprint, and runtime error ring buffer rendered inside `/admin/quality`.
