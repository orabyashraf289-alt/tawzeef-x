import "@testing-library/jest-dom";
import { vi } from "vitest";

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
