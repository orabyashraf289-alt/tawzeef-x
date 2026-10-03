# Migration source guide

This guide describes repository files and replay checks. Deployment inventory must be verified separately before changing an existing database.

## Replay inputs

Only `supabase/migrations/*.sql` participates in chronological replay. Historical `.sql.disabled` sources are preserved under `docs/archived-migrations/` and `supabase/migrations/`; they are excluded from replay. Archiving does not mark a version applied or complete a data repair.

The platform setup archive includes company-name-based assignments. The schema-only bootstrap in `20260927124005_restore_candidate_tenant_boundaries.sql` supplies the dependency for subsequent migrations without assigning roles or company flags. The later agency validation migration remains part of replay.

## Isolated checks

The workflow `.github/workflows/supabase-migrations.yml` validates filenames, replays active SQL, and runs these rollback-only fixtures:

| Area | Fixture under `supabase/tests/` |
| --- | --- |
| Custom roles | `custom_roles_rls.sql` |
| Granular permissions | `granular_permissions_rls.sql` |
| Branch invitations | `branch_invitations.sql` |
| Automation drafts | `automation_rls.sql` |
| Indexing logs | `google_indexing_logs_rls.sql` |
| Platform roles | `platform_roles_rls.sql` |

Synthetic job fixtures disable webhook dispatch. Frontend tests separately check rejected automation writes, indexing authorization, and deletion failures. The browser uses the server deletion flow and stops on failure.

## Deployment gates

1. Do not use a global `supabase db push` as a reconciliation shortcut. Fresh replay does not establish the safety of applying an older file after later repairs on an existing database.
2. Review complete effects: grants, policies, functions, constraints, indexes, and data statements. Apply reviewed changes individually; record an old version only after complete equivalence is verified.
3. Verify the resulting catalog and migration history separately. Matching version lists do not prove data backfills completed or remove unrelated drift. Do not invoke deletion or backfill functions just to check migration history.
4. Candidate/application data repair in archived sources `20260722100000` and `20260722221500` remains unverified and requires a separate scoped review. The archives are not evidence that existing candidate rows were repaired.
