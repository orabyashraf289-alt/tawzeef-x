import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Company, parseCompanyRow } from "@/hooks/useCompanies";

export interface CompanyContextType {
  activeCompany: Company | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  myCompanies: (Company & { member_role?: string })[];
  companyBranches: Company[];
  isBranch: boolean;
  companyRole: "owner" | "hr" | "viewer" | "admin" | null;
  isLoading: boolean;
  refetchCompanies: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const ACTIVE_COMPANY_STORAGE_KEY = "tx_active_company_id";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeCompanyIdState, setActiveCompanyIdState] = useState<string | null>(() => {
    const raw = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (!raw || raw === "undefined" || raw === "null" || raw.trim() === "") return null;
    return raw.trim();
  });

  // Query all companies where current user is a registered member
  const {
    data: myCompanies = [],
    isLoading,
    refetch: refetchCompanies,
  } = useQuery({
    queryKey: ["my-companies", user?.id],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members" as any)
        .select("member_role, company:company_id(*)")
        .eq("user_id", user!.id);

      if (error) {
        console.warn("Error fetching company memberships:", error);
        return [];
      }

      return (data || [])
        .map((r: any) => {
          if (!r.company) return null;
          return {
            ...parseCompanyRow(r.company),
            member_role: r.member_role,
          };
        })
        .filter(Boolean) as (Company & { member_role?: string })[];
    },
  });

  // Automatically select the active company if not set or invalid
  useEffect(() => {
    if (!isLoading && myCompanies.length > 0) {
      const exists = myCompanies.some((c) => c.id === activeCompanyIdState);
      if (!activeCompanyIdState || !exists) {
        // Prefer main parent company (without parent_company_id), or first available
        const defaultCompany =
          myCompanies.find((c) => !c.parent_company_id) || myCompanies[0];
        if (defaultCompany) {
          setActiveCompanyIdState(defaultCompany.id);
          localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, defaultCompany.id);
        }
      }
    }
  }, [myCompanies, isLoading, activeCompanyIdState]);

  const activeCompany = useMemo(() => {
    if (!activeCompanyIdState || myCompanies.length === 0) return null;
    return myCompanies.find((c) => c.id === activeCompanyIdState) || myCompanies[0] || null;
  }, [myCompanies, activeCompanyIdState]);

  const activeCompanyId = activeCompany?.id || null;

  // Query branches of active company if it is a parent company
  const isValidTargetCompanyId = !!activeCompanyId && activeCompanyId !== "undefined" && activeCompanyId !== "null";

  const { data: companyBranches = [] } = useQuery({
    queryKey: ["company-branches", activeCompanyId],
    staleTime: 5 * 60 * 1000,
    enabled: isValidTargetCompanyId,
    queryFn: async () => {
      const targetId = activeCompany?.parent_company_id || activeCompanyId;
      if (!targetId || targetId === "undefined" || targetId === "null") return [];
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("parent_company_id", targetId)
        .order("name", { ascending: true });

      if (error) {
        console.warn("Could not fetch company branches:", error);
        return [];
      }
      return (data || []).map(parseCompanyRow);
    },
  });

  const setActiveCompanyId = useCallback(
    (newCompanyId: string) => {
      if (!newCompanyId || newCompanyId === "undefined" || newCompanyId === "null") return;
      if (newCompanyId === activeCompanyIdState) return;
      setActiveCompanyIdState(newCompanyId);
      localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, newCompanyId);

      // Invalidate relevant queries so all views reload with isolated tenant data
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
      queryClient.invalidateQueries({ queryKey: ["company-branches"] });
      queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
    },
    [activeCompanyIdState, queryClient]
  );

  const companyRole = (activeCompany?.member_role as any) || null;
  const isBranch = !!activeCompany?.parent_company_id;

  const value = useMemo(
    () => ({
      activeCompany,
      activeCompanyId,
      setActiveCompanyId,
      myCompanies,
      companyBranches,
      isBranch,
      companyRole,
      isLoading,
      refetchCompanies,
    }),
    [
      activeCompany,
      activeCompanyId,
      setActiveCompanyId,
      myCompanies,
      companyBranches,
      isBranch,
      companyRole,
      isLoading,
      refetchCompanies,
    ]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanyContext must be used within a CompanyProvider");
  }
  return context;
}

export const useCompany = useCompanyContext;

