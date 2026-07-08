import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_BRAND, type PosterBrandSettings } from "@/lib/posterBrandSettings";

export function useBrandSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const brandQuery = useQuery({
    queryKey: ["company-brand-settings", user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_BRAND;

      // 1) Get company membership
      const { data: memberData, error: memberErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberErr || !memberData?.company_id) return DEFAULT_BRAND;

      // 2) Get company brand settings
      const { data: compData, error: compErr } = await supabase
        .from("companies")
        .select("brand_settings")
        .eq("id", memberData.company_id)
        .maybeSingle();

      if (compErr || !compData?.brand_settings) return DEFAULT_BRAND;

      return { ...DEFAULT_BRAND, ...(compData.brand_settings as any) } as PosterBrandSettings;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (next: PosterBrandSettings) => {
      if (!user) return;

      const { data: memberData } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberData?.company_id) throw new Error("No company associated with this user.");

      const { error } = await supabase
        .from("companies")
        .update({ brand_settings: next } as any)
        .eq("id", memberData.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-brand-settings", user?.id] });
    },
  });

  return {
    brand: brandQuery.data || DEFAULT_BRAND,
    isLoading: brandQuery.isLoading,
    update: (next: PosterBrandSettings) => updateMutation.mutate(next),
  };
}
