import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRAND, loadBrandSettings, saveBrandSettings, type PosterBrandSettings } from "@/lib/posterBrandSettings";

export function useBrandSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["company-brand-settings"] });
    };
    window.addEventListener("tx:brand-updated", handleUpdated);
    return () => window.removeEventListener("tx:brand-updated", handleUpdated);
  }, [queryClient]);

  const brandQuery = useQuery({
    queryKey: ["company-brand-settings", user?.id],
    queryFn: async () => {
      const localFallback = loadBrandSettings();
      if (!user) return localFallback;

      // 1) Get company membership
      const { data: memberRows, error: memberErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id);

      if (memberErr || !memberRows || memberRows.length === 0) return localFallback;

      const activeCompanyId = memberRows[0].company_id;

      // 2) Get company brand settings
      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("brand_settings")
        .eq("id", activeCompanyId)
        .maybeSingle();

      if (compErr || !compData?.brand_settings) return localFallback;

      const merged = { ...DEFAULT_BRAND, ...localFallback, ...(compData.brand_settings as any) } as PosterBrandSettings;
      saveBrandSettings(merged);
      return merged;
    },
    staleTime: 1000 * 30,
  });

  const activeBrand = brandQuery.data || loadBrandSettings();

  const updateMutation = useMutation({
    mutationFn: async (next: PosterBrandSettings) => {
      saveBrandSettings(next);
      if (!user) return;

      const { data: memberRows, error: memberErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id);

      if (memberErr || !memberRows || memberRows.length === 0) return;

      const activeCompanyId = memberRows[0].company_id;

      await supabase
        .from("companies")
        .update({ brand_settings: next } as any)
        .eq("id", activeCompanyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-brand-settings"] });
    },
  });

  return {
    brand: activeBrand,
    data: activeBrand,
    isLoading: brandQuery.isLoading,
    update: (next: PosterBrandSettings) => updateMutation.mutate(next),
  };
}
