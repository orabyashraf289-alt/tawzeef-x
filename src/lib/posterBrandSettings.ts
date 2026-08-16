/**
 * Persistent brand settings for QR posters.
 * Stored in localStorage so the same look applies to every job the user creates.
 */

export interface PosterBrandSettings {
  /** Primary brand color as HEX (used for poster background gradient + accent line) */
  primaryColor: string;
  /** Secondary/accent brand color as HEX */
  accentColor: string;
  /** Display name shown on poster header */
  companyName: string;
  /** Optional logo URL (data: or https:) shown on the poster & headers */
  logoUrl: string | null;
  /** Custom background image URL for login screen */
  loginBgUrl: string | null;
  /** Custom background image URL for workspace / system layout */
  workspaceBgUrl: string | null;
  /** Opacity for custom workspace background image (0.05 to 0.5) */
  workspaceBgOpacity: number;
  /** Overlay opacity for custom login background image (0.1 to 0.9) */
  loginBgOverlayOpacity: number;
  /** Font family name (must already be available, e.g. Cairo, Inter, Tajawal) */
  fontFamily: string;
  /** Foreground (modules) color for the QR itself */
  qrForeground: string;
}

const STORAGE_KEY = "tx:poster-brand-settings:v1";

export const DEFAULT_BRAND: PosterBrandSettings = {
  primaryColor: "#0d9488",
  accentColor: "#14b8a6",
  companyName: "Tawzeef-X",
  logoUrl: null,
  loginBgUrl: null,
  workspaceBgUrl: null,
  workspaceBgOpacity: 0.15,
  loginBgOverlayOpacity: 0.5,
  fontFamily: "Cairo, sans-serif",
  qrForeground: "#0f172a",
};

export function loadBrandSettings(): PosterBrandSettings {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRAND, ...parsed };
  } catch {
    return DEFAULT_BRAND;
  }
}

export function saveBrandSettings(settings: PosterBrandSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  // Notify other tabs/components
  window.dispatchEvent(new CustomEvent("tx:brand-updated", { detail: settings }));
}

export function resetBrandSettings(): void {
  saveBrandSettings(DEFAULT_BRAND);
}
