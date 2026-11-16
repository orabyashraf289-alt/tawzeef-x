import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackGuestVisit } from "@/lib/visitorTracker";

/**
 * Monitors unauthenticated visitors across all public routes
 * and records visitor traffic into the security audit system.
 */
export default function VisitorTrackerManager() {
  const { pathname } = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Only track if user is not logged in and auth finished checking
    if (!isLoading && !user) {
      void trackGuestVisit(pathname);
    }
  }, [pathname, user, isLoading]);

  return null;
}
