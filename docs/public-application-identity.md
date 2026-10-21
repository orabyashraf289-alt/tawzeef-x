# Public application identity and receipt

Anonymous applicants cannot read company rows under company RLS. The application
page now resolves only the public name and logo through `get_public_job_employer`
using the published job ID. The RPC returns no result for closed/missing jobs,
suspended employers, or branches of suspended parents. Company RLS is unchanged.
An explicit school name on the vacancy takes precedence over account branding;
missing identity has a neutral Arabic label instead of a guessed employer.

CV selection now displays the shared 5 MB limit and makes clear that uploading
happens on submission. Legacy DOC files can be attached and completed manually;
PDF/DOCX support text extraction. Removed/replaced files invalidate pending
analysis. The receipt appears as soon as the application insert succeeds, while
account provisioning has its own status and retry. Repeated submit clicks during
an in-flight request do not create duplicate applications. This is a UI guard,
not server-side idempotency for a network failure after a committed insert.

## Rollout

1. Run the database replay CI check, including `supabase/tests/public_job_employer.sql`.
2. Apply `20261021160000_public_job_employer_identity.sql` through the existing
   Supabase migration deployment process before deploying the frontend.
3. Deploy the frontend and verify a published vacancy anonymously: header,
   sidebar, and receipt should agree on employer identity.
4. In a disposable test environment, verify a CV upload and manual application,
   a valid tracking link, and account invitation failure/retry. Do not submit
   synthetic applicants or send test invitations in production.

If the RPC is unavailable, the form remains usable and uses the vacancy's explicit
school name or the neutral fallback. No existing company/job data is rewritten.
Rolling back the frontend leaves a harmless read-only public branding RPC.

## Local validation

- 379 Vitest tests passed, including public branding, upload success/failure,
  receipt before provisioning, duplicate-click prevention, and stale analysis.
- Frontend and Node TypeScript checks passed; production build passed.
- SQL migration and role-based assertions passed in isolated PostgreSQL (PGlite).
  This is not a full Supabase historical migration replay; CI performs that check.
- Production build used the fallback sitemap because deployment environment
  variables are not present locally. No live deployment or live submission is
  established by these local checks.
