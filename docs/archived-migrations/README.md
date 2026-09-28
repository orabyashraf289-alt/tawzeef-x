# Archived migration: clean slate initialization

`20260724031500_clean_slate_initialization.sql.disabled` is a preserved historical file, not an active migration. It deletes rows from hiring tables and most `auth.users` accounts. The production project did not record migration version `20260724031500` as of 2026-09-28.

It was removed from `supabase/migrations/` so a future migration push cannot execute those deletions. The `.disabled` extension also prevents SQL tools from treating this archive as an active script by convention. Do not run the archived file against production or another shared database.

`create_avatars_bucket_fix.sql.disabled` and `fix_users_table_permission.sql.disabled` were previously untimestamped files in `supabase/migrations/` that the CLI skipped. The avatars bucket and its ownership policies were already created in the timestamped March migration. The second file would reintroduce an email-only application read policy, which conflicts with the later tenant boundaries. Neither file should be activated by adding a timestamp.

[PR #17](https://github.com/orabyashraf289-alt/tawzeef-x/pull/17) reconstructs the missing webhook tables, fixes historical indexes, and runs a clean replay in GitHub Actions. The production project still has 28 pending dated migrations and a different applied-version sequence. Resolve those differences before automating a production migration push; see [issue #4](https://github.com/orabyashraf289-alt/tawzeef-x/issues/4).
