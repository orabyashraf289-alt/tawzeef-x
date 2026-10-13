import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TalentOrbit from "@/components/three/TalentOrbit";
import { setAnimationsEnabled } from "@/lib/motionPreferences";

const { createScene, dispose, setVisible } = vi.hoisted(() => ({
  createScene: vi.fn(), dispose: vi.fn(), setVisible: vi.fn(),
}));
vi.mock("@/components/three/talentOrbitScene", () => ({ createTalentOrbit: createScene }));

const originalObserver = window.IntersectionObserver;

describe("decorative Three.js enhancement", () => {
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  let idle: () => void;
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    createScene.mockReturnValue({ dispose, setVisible });
    vi.stubGlobal("WebGL2RenderingContext", function () {});
    vi.stubGlobal("requestIdleCallback", (callback: () => void) => { idle = callback; return 1; });
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    window.IntersectionObserver = vi.fn(function (callback) {
      intersect = callback as unknown as typeof intersect;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() } as unknown as IntersectionObserver;
    });
  });
  afterEach(() => { cleanup(); window.IntersectionObserver = originalObserver; vi.unstubAllGlobals(); localStorage.clear(); });

  async function enterViewport() {
    act(() => intersect([{ isIntersecting: true }]));
    await act(async () => { idle(); });
  }

  it("defers the renderer until the scene is visible and the browser is idle", async () => {
    const { container, unmount } = render(<TalentOrbit />);
    expect(createScene).not.toHaveBeenCalled();
    expect(container.querySelector("svg")).toBeInTheDocument();
    await enterViewport();
    await waitFor(() => expect(container.firstElementChild).toHaveAttribute("data-scene-status", "ready"));
    expect(createScene).toHaveBeenCalledTimes(1);
    act(() => intersect([{ isIntersecting: false }]));
    expect(setVisible).toHaveBeenLastCalledWith(false);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes the running scene when the animation setting is disabled", async () => {
    const { container } = render(<TalentOrbit />);
    await enterViewport();
    act(() => setAnimationsEnabled(false));
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild).toHaveAttribute("data-scene-status", "fallback");
  });

  it("keeps a static illustration and never initializes Three with motion disabled", () => {
    setAnimationsEnabled(false);
    const { container } = render(<TalentOrbit />);
    expect(createScene).not.toHaveBeenCalled();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-scene-status", "fallback");
  });

  it("keeps the page usable when WebGL initialization fails", async () => {
    createScene.mockImplementation(() => { throw new Error("WebGL unavailable"); });
    const { container } = render(<TalentOrbit />);
    await enterViewport();
    expect(container.firstElementChild).toHaveAttribute("data-scene-status", "fallback");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
