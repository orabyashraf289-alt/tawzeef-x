import { useState, useCallback } from "react";

const STORAGE_KEY = "tawzeef-x_compact_view";

export function useCompactView() {
  const [isCompact, setIsCompact] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return { isCompact, toggleCompact };
}
