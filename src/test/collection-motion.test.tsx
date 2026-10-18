import { act, cleanup, render, screen } from "@testing-library/react";
import { motion } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCollectionMotion } from "@/hooks/useCollectionMotion";
import { setAnimationsEnabled } from "@/lib/motionPreferences";

function Results({ count = 1 }: { count?: number }) {
  const collection = useCollectionMotion();
  return <>{Array.from({ length: count }, (_, index) => (
    <motion.button key={index} {...collection.entry(index)} whileHover={collection.hover}>
      Result {index}
    </motion.button>
  ))}</>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("recruitment collection accessibility", () => {
  it("renders every result immediately when animations are disabled", () => {
    setAnimationsEnabled(false);
    render(<Results count={60} />);
    const results = screen.getAllByRole("button");
    expect(results).toHaveLength(60);
    results.forEach(result => {
      expect(result).toHaveStyle({ opacity: "1" });
      expect(result.style.transform).toBe("none");
    });
  });

  it("reveals an entering list when the user disables animation", async () => {
    render(<Results count={8} />);
    act(() => setAnimationsEnabled(false));
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    screen.getAllByRole("button").forEach(result => expect(result).toHaveStyle({ opacity: "1" }));
  });

  it("honors the OS preference even when the app enables animation", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      media: query, matches: query.includes("prefers-reduced-motion"), onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(),
      removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    setAnimationsEnabled(true);
    render(<Results />);
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "1", transform: "none" });
  });
});
