# Company review and applicant accounts

New company registrations keep the existing immutable signup intent. Completing
onboarding creates one pending `company_registration_requests` row and consumes
the intent; it does not create a company or grant membership. Existing companies
and invited team/agency accounts are unchanged. Only a platform `super_admin`
can call `review_company_registration`. Approval locks the request and creates
the company and owner membership atomically. Rejection requires a reason. Both
record the reviewer and timestamp; reviewed requests cannot be replayed.

The request owner can read its status and reason but cannot modify the request.
A rejected account remains on its status page and must contact platform support;
there is no automatic resubmission or approval of historical companies.

The public account label is now حساب متقدم. Keep the persisted `job_seeker` enum
and `/seeker-dashboard` alias for existing accounts. Authentication and route
selection use the server response, not editable user metadata. The current
application invitation flow still verifies the email and lets the applicant set
their own password. A signed-in account with no matching submitted application
gets an empty explanatory state, not tenant access.

`get_my_applicant_portal` derives a verified email from auth.users and scopes all
results to that person's submitted applications and their job/company pairs.
It returns application status, candidate stages, interviews and published offers.
It excludes HR notes, AI scores/reports, recordings and draft offers. Company
selection is only a presentation filter on these authorized results. Neither
this RPC nor registration creates a candidate or changes hiring status.

Deploy both 20261025 migrations before the frontend and record their versions in
Supabase migration history. During the short rollout, the old onboarding screen
may show a missing-membership message for a request now waiting for review.
Do not roll back the backend to automatic approval. Do not create production
applicants, approve actual requests or run AI analysis as smoke tests.

Validation: Vitest route/access regression suite and SQL tests
`company_signup_intent.sql` and `applicant_portal_scope.sql` on disposable data.
The SQL tests also run in the full migration replay CI job. Locally the new SQL
was exercised in PostgreSQL WASM (PGlite) against a focused schema fixture;
that focused run is not a full historical migration replay.
