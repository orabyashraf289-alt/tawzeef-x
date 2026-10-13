export const ANIMATIONS_STORAGE_KEY = "workspace-animations";
export const MOTION_PREFERENCE_EVENT = "workspace-motion-change";

let memoryPreference = true;

export function getAnimationsEnabled(): boolean {
  try {
    return localStorage.getItem(ANIMATIONS_STORAGE_KEY) !== "false";
  } catch {
    return memoryPreference;
  }
}

export function setAnimationsEnabled(enabled: boolean) {
  memoryPreference = enabled;
  try {
    localStorage.setItem(ANIMATIONS_STORAGE_KEY, String(enabled));
  } catch { /* The switch still works when browser storage is unavailable. */ }
  window.dispatchEvent(new Event(MOTION_PREFERENCE_EVENT));
}
