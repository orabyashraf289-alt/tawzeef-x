/// <reference types="vite/client" />

declare module "https://esm.sh/@supabase/supabase-js*" {
  export function createClient(...args: unknown[]): unknown;
}
