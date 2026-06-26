import { useEffect, useState, useCallback } from "react";
import {
  loadBrandSettings,
  saveBrandSettings,
  type PosterBrandSettings,
} from "@/lib/posterBrandSettings";

export function useBrandSettings() {
  const [brand, setBrand] = useState<PosterBrandSettings>(() => loadBrandSettings());

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<PosterBrandSettings>).detail;
      if (detail) setBrand(detail);
      else setBrand(loadBrandSettings());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("tx:poster-brand")) setBrand(loadBrandSettings());
    };
    window.addEventListener("tx:brand-updated", onUpdate as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("tx:brand-updated", onUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((next: PosterBrandSettings) => {
    saveBrandSettings(next);
    setBrand(next);
  }, []);

  return { brand, update };
}
