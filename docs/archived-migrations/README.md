# Archived migration: clean slate initialization

`20260724031500_clean_slate_initialization.sql.disabled` is a preserved historical file, not an active migration. It deletes rows from hiring tables and most `auth.users` accounts. The production project did not record migration version `20260724031500` as of 2026-09-28.

It was removed from `supabase/migrations/` so a future migration push cannot execute those deletions. The `.disabled` extension also prevents SQL tools from treating this archive as an active script by convention. Do not run the archived file against production or another shared database.

The remaining migration history still needs reconstruction and an isolated clean replay before automated pushes are enabled; see [issue #4](https://github.com/orabyashraf289-alt/tawzeef-x/issues/4).
