import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PublicContactSettings = Omit<Database["public"]["Tables"]["platform_contact_settings"]["Row"], "id">;
export const publicContactKey = ["public-contact-settings"];
const columns = "contact_email,support_email,contact_phone,location_ar,location_en,hours_ar,hours_en";

export function usePublicContactSettings() {
  return useQuery({
    queryKey: publicContactKey,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async (): Promise<PublicContactSettings> => {
      const { data, error } = await supabase.from("platform_contact_settings").select(columns).eq("id", true).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePublicContactSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PublicContactSettings): Promise<PublicContactSettings> => {
      const values = {
        contact_email: settings.contact_email.trim().toLowerCase(),
        support_email: settings.support_email.trim().toLowerCase(),
        contact_phone: settings.contact_phone.trim(),
        location_ar: settings.location_ar.trim(), location_en: settings.location_en.trim(),
        hours_ar: settings.hours_ar.trim(), hours_en: settings.hours_en.trim(),
      };
      // single() rejects a zero-row update (including an RLS denial).
      const { data, error } = await supabase.from("platform_contact_settings")
        .update(values).eq("id", true).select(columns).single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => { client.setQueryData(publicContactKey, data); },
  });
}
