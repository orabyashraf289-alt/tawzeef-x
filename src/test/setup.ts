import "@testing-library/jest-dom";
import { vi } from "vitest";

// Stub env vars for Supabase to prevent client initialization crash
vi.stubEnv("VITE_SUPABASE_URL", "https://rlfewneisuezsamhosct.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZmV3bmVpc3VlenNhbWhvc2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDkwMjcsImV4cCI6MjA5NzE4NTAyN30.ksVJqWEBcbfRMfPpmf_J3DxnJpVnK4Tb6ouEI6d3sLo");

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Mock Notification
Object.defineProperty(window, "Notification", {
  writable: true,
  value: class {
    static permission = "default";
    static requestPermission = vi.fn().mockResolvedValue("granted");
    constructor() {}
    close = vi.fn();
  },
});

// Mock AudioContext
Object.defineProperty(window, "AudioContext", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    currentTime: 0,
    createOscillator: () => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: "",
      frequency: { value: 0 },
    }),
    createGain: () => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }),
    destination: {},
  })),
});
