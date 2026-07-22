import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { generateAndStoreJobQR } from "@/lib/qrCodeService";
import { loadBrandSettings } from "@/lib/posterBrandSettings";

export function useJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: async () => {
      // 1. Fetch user's companies to enforce multi-tenant isolation
      let userCompanyIds: string[] = [];
      if (user?.id) {
        try {
          const { data: members } = await supabase
            .from("company_members")
            .select("company_id")
            .eq("user_id", user.id);
          if (members && members.length > 0) {
            userCompanyIds = members.map(m => m.company_id).filter(Boolean);
          }
        } catch (e) {
          console.warn("Could not fetch user company memberships:", e);
        }
      }

      // 2. Query jobs table
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 3. Strict Multi-Tenant Isolation Filter:
      // A job belongs to the current user/company ONLY IF:
      // - The job was created by the user (user_id === user.id)
      // - OR the job's company_id matches one of the user's company IDs
      if (userCompanyIds.length > 0) {
        return (data || []).filter(j =>
          j.user_id === user?.id || (j.company_id && userCompanyIds.includes(j.company_id))
        );
      }

      return (data || []).filter(j => j.user_id === user?.id || j.company_id === null);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useAddJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (job: {
      title: string;
      department: string;
      location: string;
      type: string;
      description?: string;
      requirements?: string;
      salaryMin?: string;
      salaryMax?: string;
      experience?: string;
    }) => {
      // Fetch user's primary company_id to attach to job
      let companyId: string | null = null;
      try {
        const { data: memberData } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user!.id)
          .maybeSingle();
        if (memberData?.company_id) {
          companyId = memberData.company_id;
        }
      } catch (e) {
        console.warn("Could not fetch company_id for job creation:", e);
      }

      const { data, error } = await supabase.from("jobs").insert({
        user_id: user!.id,
        company_id: companyId,
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description || null,
        requirements: job.requirements ? job.requirements.split("\n").filter(Boolean) : null,
        salary_min: job.salaryMin ? parseInt(job.salaryMin) : null,
        salary_max: job.salaryMax ? parseInt(job.salaryMax) : null,
        experience_level: job.experience || null,
      }).select().single();

      if (error) throw error;

      // Auto-generate branded QR with the REAL apply URL — non-blocking
      if (data?.id) {
        let brand = loadBrandSettings();
        try {
          if (companyId) {
            const { data: compData } = await supabase
              .from("companies")
              .select("brand_settings")
              .eq("id", companyId)
              .maybeSingle();
            if (compData?.brand_settings) {
              brand = { ...brand, ...(compData.brand_settings as any) };
            }
          }
        } catch (err) {
          console.warn("Could not fetch database brand settings, using default:", err);
        }

        generateAndStoreJobQR({
          jobId: data.id,
          jobTitle: data.title,
          userId: user!.id,
          brand,
        }).catch((err) => console.warn("QR auto-generation failed:", err));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "تم إضافة الوظيفة بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...job }: {
      id: string;
      title: string;
      department: string;
      location: string;
      type: string;
      description?: string;
      requirements?: string;
      salaryMin?: string;
      salaryMax?: string;
      experience?: string;
    }) => {
      const { data, error } = await supabase.from("jobs").update({
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description || null,
        requirements: job.requirements ? job.requirements.split("\n").filter(Boolean) : null,
        salary_min: job.salaryMin ? parseInt(job.salaryMin) : null,
        salary_max: job.salaryMax ? parseInt(job.salaryMax) : null,
        experience_level: job.experience || null,
      }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "تم تحديث الوظيفة بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useCandidates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["candidates", user?.id],
    queryFn: async () => {
      // 1. Repair candidate ownership for user's jobs where user_id = null
      if (user?.id) {
        try {
          const { data: ownJobs } = await supabase.from("jobs").select("id").eq("user_id", user.id);
          const ownJobIds = (ownJobs || []).map(j => j.id);
          if (ownJobIds.length > 0) {
            await supabase
              .from("candidates")
              .update({ user_id: user.id } as any)
              .in("job_id", ownJobIds)
              .is("user_id", null);
          }
        } catch (repairErr) {
          console.warn("Candidate ownership repair warning:", repairErr);
        }
      }

      // 2. Fetch candidates table
      const { data: candidatesData, error: candError } = await supabase
        .from("candidates")
        .select("*, candidate_scorecards(rating)")
        .order("created_at", { ascending: false });

      if (candError) throw candError;

      // 3. Fetch applications table to ensure no applied candidate is missed
      const { data: appsData } = await supabase
        .from("applications")
        .select("*, jobs(title)")
        .order("created_at", { ascending: false });

      if (!appsData || appsData.length === 0) {
        return candidatesData || [];
      }

      const existingCandKeys = new Set((candidatesData || []).map(c => `${(c.email || "").toLowerCase()}_${c.job_id}`));
      const existingCandIds = new Set((candidatesData || []).map(c => c.id));

      const missingApps = appsData.filter(a => {
        const key = `${(a.email || "").toLowerCase()}_${a.job_id}`;
        return !existingCandKeys.has(key) && !existingCandIds.has(a.id);
      });

      if (missingApps.length === 0) {
        return candidatesData || [];
      }

      // Convert missing applications into Candidate format for instant HR visibility
      const convertedApps = missingApps.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        job_id: a.job_id,
        user_id: user?.id || null,
        role: (a as any).jobs?.title || a.specialty || "متقدم جديد",
        stage: "تقديم الطلب",
        status: a.status || "جديد",
        experience: a.experience,
        resume_url: a.resume_url,
        skills: a.skills,
        summary: a.cover_letter,
        source: "رابط التقديم المباشر",
        tracking_code: (a as any).tracking_code || null,
        created_at: a.created_at,
        candidate_scorecards: [],
      }));

      // Background persistence via upsert (prevents unique constraint crashes)
      if (user?.id && missingApps.length > 0) {
        (async () => {
          try {
            const rowsToUpsert = missingApps.map(a => ({
              id: a.id,
              name: a.name,
              email: a.email,
              phone: a.phone,
              job_id: a.job_id,
              user_id: user.id,
              company_id: (a as any).company_id || null,
              role: (a as any).jobs?.title || a.specialty || "متقدم جديد",
              stage: "تقديم الطلب",
              status: a.status || "جديد",
              experience: a.experience,
              resume_url: a.resume_url,
              skills: a.skills,
              summary: a.cover_letter,
              source: "رابط التقديم المباشر",
              tracking_code: (a as any).tracking_code || null,
            }));
            await supabase.from("candidates").upsert(rowsToUpsert as any, { onConflict: "id" });
          } catch (e) {
            console.warn("Background auto-upsert candidates warning:", e);
          }
        })();
      }

      return [...(candidatesData || []), ...convertedApps];
    },
    enabled: !!user,
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePaginatedCandidates(page = 0, pageSize = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["candidates-paginated", user?.id, page, pageSize],
    queryFn: async () => {
      // 1. Repair ownership for any candidate rows attached to user's jobs that have user_id = null
      if (user?.id) {
        try {
          const { data: ownJobs } = await supabase.from("jobs").select("id");
          const ownJobIds = (ownJobs || []).map(j => j.id);
          if (ownJobIds.length > 0) {
            await supabase
              .from("candidates")
              .update({ user_id: user.id } as any)
              .in("job_id", ownJobIds)
              .is("user_id", null);
          }
        } catch (repairErr) {
          console.warn("Candidate ownership repair warning:", repairErr);
        }
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: candidatesData, error, count } = await supabase
        .from("candidates")
        .select("*, candidate_scorecards(rating)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch applications to ensure no applied candidates are missed
      const { data: appsData } = await supabase
        .from("applications")
        .select("*, jobs(title)")
        .order("created_at", { ascending: false });

      if (!appsData || appsData.length === 0) {
        return { data: candidatesData || [], count: count || 0, page, pageSize };
      }

      const existingCandKeys = new Set((candidatesData || []).map(c => `${(c.email || "").toLowerCase()}_${c.job_id}`));
      const existingCandIds = new Set((candidatesData || []).map(c => c.id));

      const missingApps = appsData.filter(a => {
        const key = `${(a.email || "").toLowerCase()}_${a.job_id}`;
        return !existingCandKeys.has(key) && !existingCandIds.has(a.id);
      });

      const convertedApps = missingApps.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        job_id: a.job_id,
        user_id: user?.id || null,
        role: (a as any).jobs?.title || a.specialty || "متقدم جديد",
        stage: "تقديم الطلب",
        status: a.status || "جديد",
        experience: a.experience,
        resume_url: a.resume_url,
        skills: a.skills,
        summary: a.cover_letter,
        source: "رابط التقديم المباشر",
        tracking_code: (a as any).tracking_code || null,
        created_at: a.created_at,
        candidate_scorecards: [],
      }));

      const allMerged = [...(candidatesData || []), ...convertedApps];
      return { data: allMerged, count: (count || 0) + convertedApps.length, page, pageSize };
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useInterviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["interviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAddInterview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (interview: {
      candidate_name: string;
      position: string;
      date: string;
      time: string;
      type: string;
      interviewer: string;
      candidate_id?: string;
      meeting_url?: string;
    }) => {
      const { data, error } = await supabase.from("interviews").insert({
        user_id: user!.id,
        candidate_name: interview.candidate_name,
        position: interview.position,
        date: interview.date,
        time: interview.time,
        type: interview.type,
        interviewer: interview.interviewer,
        candidate_id: interview.candidate_id || null,
        meeting_url: interview.meeting_url || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast({ title: "تم جدولة المقابلة بنجاح ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      date?: string;
      time?: string;
      interviewer?: string;
      meeting_url?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("interviews")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useCancelInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("interviews")
        .update({ status: "ملغاة", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast({ title: "تم إلغاء المقابلة ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        const now = audioCtx.currentTime;
        playTone(830, now, 0.15);
        playTone(1100, now + 0.15, 0.2);
      } catch (e) {
        // Audio not supported
      }
    };

    const sendBrowserNotification = (payload: any) => {
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const record = payload.new as any;
          const notif = new Notification(record?.title || "إشعار جديد", {
            body: record?.description || "",
            icon: "/favicon.ico",
            tag: record?.id || "notification",
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          // Silent fail
        }
      }
    };

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
          queryClient.invalidateQueries({ queryKey: ["candidates", user.id] });
          playNotificationSound();
          sendBrowserNotification(payload);

          // In-app toast notification
          const record = payload.new as any;
          if (record) {
            const typeEmoji: Record<string, string> = {
              application: "📩",
              stage_change: "🔄",
              interview: "📅",
              offer: "📄",
              system: "⚙️",
            };
            const emoji = typeEmoji[record.type] || "🔔";
            toast({
              title: `${emoji} ${record.title || "إشعار جديد"}`,
              description: record.description || "",
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const [jobsRes, candidatesRes, interviewsRes] = await Promise.all([
        supabase.from("jobs").select("id, status", { count: "exact" }),
        supabase.from("candidates").select("id, status, created_at", { count: "exact" }),
        supabase.from("interviews").select("id, status", { count: "exact" }),
      ]);
      
      const activeJobs = jobsRes.data?.filter(j => j.status === "نشطة").length || 0;
      const totalCandidates = candidatesRes.count || 0;
      const hired = candidatesRes.data?.filter(c => c.status === "مقبول").length || 0;
      
      return { activeJobs, totalCandidates, hired };
    },
    enabled: !!user,
  });
}
