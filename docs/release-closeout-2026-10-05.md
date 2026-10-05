# Release closeout status — 2026-10-05

Status: shipped frontend release verified; closing Auth access patch tested and applied to production. This records the completed fixes and the operational prerequisites; it is not a claim that every planned feature is implemented.

## Shipped baseline

- Repository: https://github.com/orabyashraf289-alt/tawzeef-x
- Production: https://tawzeef-x.vercel.app/
- Main commit: `9824f2b4f80b0c9067429b30e79a31aa5babac91` (PR #34).
- The release passed frontend/tooling TypeScript, 282 Vitest tests, production build, and migration replay. Both Vercel production projects reported successful deployment.
- The October 5 review found 131 registered migrations, no missing candidate companies, and no candidate/job or application/job company conflicts.

## Closing Auth access patch

Target: the repository above and Supabase project `rlfewneisuezsamhosct`.

- Restrict `get_user_by_email_v1(text)` to `service_role`. The deployed login OTP and password-reset workers already use that role. No frontend code calls this RPC.
- Pin the search path of the lookup and the audited optional legacy helpers.
- Remove browser execution grants from named trigger-only helpers, preserving their bodies and trigger attachments.
- Add a rollback-only SQL test to the migration replay workflow.
- No records are deleted, no ownership is assigned, and no email is sent.

Local PostgreSQL (PGlite) validation passed in two isolated configurations: clean database and legacy helpers present. Both accepted the migration twice, denied anonymous/authenticated lookups, preserved case-insensitive server lookup, returned no result for unknown emails, and rolled back fixtures. Existing attached triggers continued firing after their direct execution grants were removed. Unrelated authorization helpers retained their execution grants.

With the owner's publishing/application approval, migration `20261005130049_restrict_legacy_auth_helpers` was applied individually to production. Catalog verification confirms anonymous and authenticated callers cannot execute the email lookup while service_role retains execution. All 27 mutable-search-path findings were resolved. The database now records 132 migrations; the migration filename matches its recorded version. Full CI and migration replay are the merge gate for the source changes.

## Functionality and decisions still open

| Item | Verified state | Needed for completion |
| --- | --- | --- |
| Internal automation | Stage-change and new-application events support stage moves and reviewer assignment; no saved rules existed at review | Owner defines the company, event, conditions, stage/reviewer and activates the chosen rule |
| Email delivery configuration | Active SMTP settings and deployed send-email/manage-smtp functions exist | Sender delivery check with an explicitly approved test recipient; credentials were not exposed and no test email was sent |
| Outbound automation | Email, WhatsApp and webhook actions are not implemented by the internal runtime | Provider/recipient/template requirements plus implementation and integration testing |
| Offer and SLA automation | Events are not implemented by the internal runtime | Event policy and SLA timing requirements plus implementation and tests |
| Legacy candidate | One candidate has no responsible user and no linked job; no reliable ownership evidence was found | Owner identifies the responsible user; do not infer or delete the record |
| Password protection | Supabase advisor reports leaked-password protection disabled | Review supported Auth plan/settings and enable through an authorized settings change |

Some security-definer RPC advisor warnings concern deliberate authorization helpers and token-based public workflows. They must be assessed by function behavior, not cleared by blanket privilege changes. The recovery-rate-limit table intentionally has no client RLS policy.

References: [function privileges](https://supabase.com/docs/guides/database/functions#function-privileges), [search path advisory](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
