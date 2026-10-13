import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { setAnimationsEnabled, ANIMATIONS_STORAGE_KEY } from "@/lib/motionPreferences";
import MotionProvider from "@/components/motion/MotionProvider";
import PageTransition from "@/components/PageTransition";
import AnimatedCount from "@/components/motion/AnimatedCount";
import { gsap } from "@/lib/gsap";

function PreferenceProbe() {
  return <output>{useReducedMotion() ? "reduced" : "full"}</output>;
}

describe("motion preference integration", () => {
  let osReduced = false;
  let listeners: Set<() => void>;

  beforeEach(() => {
    localStorage.clear();
    osReduced = false;
    listeners = new Set();
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      media: query,
      get matches() { return query.includes("prefers-reduced-motion") && osReduced; },
      onchange: null, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      addEventListener: (_type, listener) => listeners.add(listener as () => void),
      removeEventListener: (_type, listener) => listeners.delete(listener as () => void),
    }));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it("updates the mounted interface immediately when the workspace switch changes", () => {
    render(<MotionProvider><PreferenceProbe /></MotionProvider>);
    expect(screen.getByText("full")).toBeInTheDocument();
    act(() => setAnimationsEnabled(false));
    expect(screen.getByText("reduced")).toBeInTheDocument();
    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(localStorage.getItem(ANIMATIONS_STORAGE_KEY)).toBe("false");
    act(() => setAnimationsEnabled(true));
    expect(document.documentElement.dataset.motion).toBe("full");
  });

  it("honors live OS changes even when workspace animations are enabled", () => {
    render(<PreferenceProbe />);
    act(() => { osReduced = true; listeners.forEach((notify) => notify()); });
    expect(screen.getByText("reduced")).toBeInTheDocument();
    act(() => setAnimationsEnabled(true));
    expect(screen.getByText("reduced")).toBeInTheDocument();
    act(() => { osReduced = false; listeners.forEach((notify) => notify()); });
    expect(screen.getByText("full")).toBeInTheDocument();
  });

  it("reacts to preferences saved in another tab", () => {
    render(<PreferenceProbe />);
    act(() => {
      localStorage.setItem(ANIMATIONS_STORAGE_KEY, "false");
      window.dispatchEvent(new StorageEvent("storage", { key: ANIMATIONS_STORAGE_KEY }));
    });
    expect(screen.getByText("reduced")).toBeInTheDocument();
  });

  it("cancels active page tweens without leaving content invisible", () => {
    const { container, unmount } = render(<PageTransition><p>Visible content</p></PageTransition>);
    const element = container.firstElementChild as HTMLElement;
    expect(gsap.getTweensOf(element).length).toBeGreaterThan(0);
    act(() => setAnimationsEnabled(false));
    expect(gsap.getTweensOf(element)).toHaveLength(0);
    expect(element.style.opacity).not.toBe("0");
    expect(screen.getByText("Visible content")).toBeVisible();
    unmount();
    expect(gsap.getTweensOf(element)).toHaveLength(0);
  });

  it("renders final counter values immediately when motion is disabled", () => {
    setAnimationsEnabled(false);
    const { container, rerender } = render(<AnimatedCount value={12} suffix="%" />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("12%");
    rerender(<AnimatedCount value={94} suffix="%" />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("94%");
    expect(container.querySelector(".sr-only")).toHaveTextContent("94%");
  });
});
