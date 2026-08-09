import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (session?.user) {
      try {
        const startTime = sessionStorage.getItem("tx_session_start_time");
        if (startTime) {
          const startMs = new Date(startTime).getTime();
          const endMs = Date.now();
          const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          const { logAuditEvent } = await import("@/hooks/useAuditLog");
          
          await logAuditEvent({
            eventType: "logout.user",
            userId: session.user.id,
            userEmail: session.user.email,
            details: {
              login_time: startTime,
              logout_time: new Date().toISOString(),
              duration_minutes: durationMinutes,
              duration_seconds: durationSeconds,
              formatted_duration: durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)} ساعة و ${durationMinutes % 60} دقيقة`
                : `${durationMinutes} دقيقة`,
              reason: "manual_logout",
            },
          });
        }
        sessionStorage.removeItem("tx_session_start_time");
      } catch (err) {
        console.error("Error logging logout audit event:", err);
      }
    }

    // Clear trusted device so next login requires OTP
    try {
      localStorage.removeItem("tawzeef-x_trusted_device");
    } catch {}
    
    // Clear React Query cache
    try {
      queryClient.clear();
    } catch (err) {
      console.error("Error clearing query client cache:", err);
    }

    await supabase.auth.signOut();
    
    // Redirect to login page and trigger clean state reload
    window.location.href = "/auth";
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
