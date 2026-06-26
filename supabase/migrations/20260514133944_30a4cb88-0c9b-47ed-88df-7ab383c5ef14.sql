
-- ============================================================
-- 1. ENUM EXTENSIONS
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_hr';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_officer';
