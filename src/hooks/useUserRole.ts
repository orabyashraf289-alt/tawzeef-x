import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/hooks/useAuditLog";

export type AppRole = "admin" | "recruiter" | "reviewer" | "job_seeker";

export function useUserRole() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: user!.id });
      if (error) throw error;
      return (data as string | null) || "recruiter";
    },
    enabled: !!user,
  });

  const email = user?.email?.toLowerCase() || "";
  const isSuperAdmin = email === "tx@tawzeefx.com" || email === "ctraining801@gmail.com" || user?.user_metadata?.role === "super_admin";

  return {
    role: (query.data as AppRole) || "recruiter",
    isAdmin: query.data === "admin",
    isSuperAdmin,
    isRecruiter: query.data === "recruiter",
    isReviewer: query.data === "reviewer",
    isJobSeeker: query.data === "job_seeker",
    isLoading: query.isLoading,
  };
}

export function useAllUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("*");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: deleteError } = await supabase
        .from("user_roles" as any)
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles" as any)
        .insert({ user_id: userId, role } as any);
      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      logAuditEvent({ eventType: "role.changed", userId: variables.userId, details: { newRole: variables.role } });
      toast({ title: "تم تحديث الصلاحية بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleError } = await supabase
        .from("user_roles" as any)
        .delete()
        .eq("user_id", userId);
      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);
      if (profileError) throw profileError;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      logAuditEvent({ eventType: "member.deleted", details: { deletedUserId: userId } });
      toast({ title: "تم حذف العضو بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ في حذف العضو", description: e.message, variant: "destructive" }),
  });
}

export function useInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role, inviterName }: { email: string; role: AppRole; inviterName: string }) => {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: { email, role, inviterName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      toast({ title: "تم إرسال الدعوة بنجاح ✅", description: "يمكنك نسخ رابط التسجيل ومشاركته" });
    },
    onError: (e: any) => toast({ title: "خطأ في إرسال الدعوة", description: e.message, variant: "destructive" }),
  });
}

export function useActivityLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { action: string; entityType?: string; entityId?: string; details?: string; userName?: string }) => {
      const { error } = await supabase
        .from("activity_log" as any)
        .insert({
          user_id: user!.id,
          user_name: params.userName || user!.email,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          details: params.details,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
    },
  });
}
