import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JoinedCompanies } from "./JoinedCompanies";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
const clients: QueryClient[] = [];
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter><JoinedCompanies /></MemoryRouter></QueryClientProvider>);
}
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.resetAllMocks(); });

describe("public joined companies", () => {
  it("shows the approval empty state without fabricated company cards", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    show();
    expect(await screen.findByText("ستظهر هنا الشركات بعد اعتماد انضمامها إلى المنصة.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /قدّم طلب/ })).toHaveAttribute("href", "/auth?mode=signup");
    expect(rpc).toHaveBeenCalledWith("get_public_joined_companies");
  });

  it("renders returned branding and replaces broken or unsafe logos", async () => {
    rpc.mockResolvedValue({ data: [
      { name: "شركة النور", logo_url: "https://example.test/logo.png" },
      { name: "شركة الأفق", logo_url: "javascript:alert(1)" },
      { name: "شركة البداية", logo_url: null },
    ], error: null });
    show();
    expect(await screen.findByText("شركة النور")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    const logo = screen.getByRole("img", { name: "شعار شركة النور" });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    fireEvent.error(logo);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("شركة النور")).toBeInTheDocument();
  });

  it("distinguishes a failed request from an empty result and retries", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    show();
    expect(await screen.findByText("تعذّر تحميل الشركات حاليًا.")).toBeInTheDocument();
    expect(screen.queryByText("ابدأ رحلة شركتك معنا")).not.toBeInTheDocument();
    rpc.mockResolvedValue({ data: [{ name: "شركة جديدة", logo_url: null }], error: null });
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("شركة جديدة")).toBeInTheDocument();
  });

  it("announces loading while the public request is pending", () => {
    rpc.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByRole("status")).toHaveTextContent("جارٍ تحميل الشركات");
  });
});
