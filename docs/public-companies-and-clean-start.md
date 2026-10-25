# Public joined companies

The landing page lists active main customer companies through `get_public_joined_companies()`. Only public display names and logos are returned. Platform companies, branches and inactive companies are excluded. New registration requests do not create companies until approved by a platform administrator.

The page refreshes while open, distinguishes loading/failure/empty states, supports retry, and substitutes a neutral icon for missing or broken logos. Logos must use HTTPS. No sample customers are inserted or displayed.

## Access and deployment

The RPC deliberately uses SECURITY DEFINER, a fixed search path and explicit execute grants. It provides a narrow public branding projection without changing company-table RLS or exposing contacts, member IDs, CVs or hiring data. Supabase definer-execution advisor warnings for this RPC are intentional; review its projection and filtering when modifying it.

Apply migration `20261025122536_public_joined_companies.sql` before releasing the landing page. The migration is already applied to the production project. It is additive and performs no operational data deletion. Cleanup of test data is a separate administrator operation and must never run automatically during deployment. Preserve platform administrators, branding and baseline configuration during any reset.

## Validation

- Component tests cover empty, pending, failure/retry, branding and broken/unsafe logo cases.
- SQL replay test covers public projection, active parent customers, name fallback, branch/platform/suspended exclusion, anonymous and authenticated access, and underlying company-row isolation.
- Migration replay CI executes `supabase/tests/public_joined_companies.sql`.
