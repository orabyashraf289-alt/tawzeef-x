import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardQuickActions from "@/components/DashboardQuickActions";
import { gsap } from "@/lib/gsap";
import { setAnimationsEnabled } from "@/lib/motionPreferences";

vi.mock("@/contexts/I18nContext", () => ({ useI18n: () => ({ locale: "ar", dir: "rtl" }) }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="route">{location.pathname}{location.search}</output>;
}
function mount(onOpenAddJob?: () => void) {
  return render(<MemoryRouter><DashboardQuickActions onOpenAddJob={onOpenAddJob} /><LocationProbe /></MemoryRouter>);
}
function pointer(button: Element, pointerType: string) {
  const event = new Event("pointerenter");
  Object.assign(event, { pointerType });
  fireEvent(button, event);
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    media: query, matches: query.includes("pointer: fine"), onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(),
    removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("dashboard action motion", () => {
  it("reveals entering actions immediately for keyboard focus", () => {
    const { container } = mount();
    fireEvent.focusIn(screen.getByRole("button", { name: /نشر وظيفة جديدة/ }));
    for (const wrapper of container.querySelectorAll<HTMLElement>("[data-action-entry]")) {
      expect(wrapper.style.opacity).not.toBe("0");
    }
  });

  it("restores all motion styles when reduced motion changes live", () => {
    const { container } = mount();
    const button = screen.getByRole("button", { name: /نشر وظيفة جديدة/ });
    pointer(button, "mouse");
    act(() => setAnimationsEnabled(false));
    expect(gsap.getTweensOf(button)).toHaveLength(0);
    expect(button.style.transform).toBe("");
    for (const wrapper of container.querySelectorAll<HTMLElement>("[data-action-entry]")) {
      expect(wrapper.style.opacity).toBe("");
      expect(wrapper.style.transform).toBe("");
    }
  });

  it("ignores touch pointers and removes mouse listeners when unmounted", () => {
    const { unmount } = mount();
    const button = screen.getByRole("button", { name: /نشر وظيفة جديدة/ });
    pointer(button, "touch");
    expect(gsap.getTweensOf(button).every(tween => tween.paused())).toBe(true);
    pointer(button, "mouse");
    expect(gsap.getTweensOf(button).some(tween => !tween.paused())).toBe(true);
    unmount();
    pointer(button, "mouse");
    expect(gsap.getTweensOf(button)).toHaveLength(0);
    expect(button.style.transform).toBe("");
  });

  it("preserves the add-job callback without navigating", () => {
    const open = vi.fn(); mount(open);
    fireEvent.click(screen.getByRole("button", { name: /نشر وظيفة جديدة/ }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("route")).toHaveTextContent("/");
  });

  it("keeps job creation navigation working with motion disabled", () => {
    setAnimationsEnabled(false); mount();
    fireEvent.click(screen.getByRole("button", { name: /نشر وظيفة جديدة/ }));
    expect(screen.getByTestId("route")).toHaveTextContent("/jobs?action=create");
  });
});
