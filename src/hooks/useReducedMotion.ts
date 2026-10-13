import { useSyncExternalStore } from "react";
import { ANIMATIONS_STORAGE_KEY, getAnimationsEnabled, MOTION_PREFERENCE_EVENT } from "@/lib/motionPreferences";

function getSnapshot() {
  return !getAnimationsEnabled() || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(update: () => void) {
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ANIMATIONS_STORAGE_KEY) update();
  };
  media?.addEventListener("change", update);
  window.addEventListener(MOTION_PREFERENCE_EVENT, update);
  window.addEventListener("storage", onStorage);
  return () => {
    media?.removeEventListener("change", update);
    window.removeEventListener(MOTION_PREFERENCE_EVENT, update);
    window.removeEventListener("storage", onStorage);
  };
}

/** OS accessibility preference always wins over the workspace animation switch. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
