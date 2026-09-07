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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        try {
          // If already viewed in this browser session, don't re-trigger until fresh login
          if (!sessionStorage.getItem("tx_welcome_video_viewed")) {
            sessionStorage.setItem("tx_show_welcome_video", "true");
          }
        } catch {}
      }
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
        const { flushSessionAudit } = await import("@/lib/sessionTracker");
        await flushSessionAudit(session.user.id, session.user.email, "manual");
      } catch (err) {
        console.error("Error logging logout audit event:", err);
      }
    }

    // Clear trusted device so next login requires OTP
    try {
      localStorage.removeItem("tawzeef-x_trusted_device");
      sessionStorage.removeItem("tx_welcome_video_viewed");
      sessionStorage.removeItem("tx_show_welcome_video");
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
