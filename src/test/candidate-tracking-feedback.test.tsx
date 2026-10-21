import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CandidatePortal from "@/pages/CandidatePortal";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/marketing/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/candidate-portal/CandidateChatbot", () => ({ default: () => null }));
const fetchMock = vi.fn();
const code = "TX-" + "A".repeat(32);
const candidate = { id: "test-only", name: "مرشح اختباري", role: "معلم", stage: "تقديم الطلب", status: "قيد المراجعة", trackingCode: code };
const reply = (status: number, data = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
function open(url = "/portal") { return render(<MemoryRouter initialEntries={[url]}><CandidatePortal /></MemoryRouter>); }
function search() {
  fireEvent.change(screen.getByRole("textbox", { name: "رمز التتبع" }), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "بحث عن الطلب" }));
}
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("candidate tracking feedback", () => {
  it("rejects incomplete codes without a network request", async () => {
    open();
    fireEvent.change(screen.getByRole("textbox", { name: "رمز التتبع" }), { target: { value: "TX-9842" } });
    fireEvent.click(screen.getByRole("button", { name: "بحث عن الطلب" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("رمز التتبع الكامل");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["code", "tracking"])("opens and normalizes a receipt link using %s", async key => {
    fetchMock.mockResolvedValue(reply(200, { candidates: [candidate] }));
    open(`/portal?${key}=${code.toLowerCase()}`);
    expect(await screen.findByText(candidate.name)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ trackingCode: code });
  });
  it("distinguishes a network failure from a missing application and allows retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(reply(404));
    open(); search();
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر الاتصال");
    expect(screen.queryByText(/لم يتم العثور/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بحث عن الطلب" }));
    expect(await screen.findByRole("status")).toHaveTextContent("لم يتم العثور");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it.each([500, 429])("does not present HTTP %s as a missing application", async status => {
    fetchMock.mockResolvedValue(reply(status)); open(); search();
    expect(await screen.findByRole("alert")).toHaveTextContent(status === 429 ? "طلبات كثيرة" : "تعذر تحميل");
    expect(screen.queryByText(/لم يتم العثور/)).not.toBeInTheDocument();
  });
  it("keeps recovery acknowledgement conditional and does not render email lookup data", async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, candidates: [candidate] }));
    open(); fireEvent.click(screen.getByRole("button", { name: "البريد الإلكتروني" }));
    fireEvent.change(screen.getByRole("textbox", { name: "البريد الإلكتروني" }), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "استرجاع رمز التتبع" }));
    expect(await screen.findByRole("status")).toHaveTextContent("إذا كان البريد مسجلاً");
    expect(screen.queryByText(candidate.name)).not.toBeInTheDocument();
    expect(screen.queryByText(/تم إرسال رموز/)).not.toBeInTheDocument();
  });
  it("ignores a late result after switching lookup mode", async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise(r => { resolve = r; }));
    open(); search();
    const signal = fetchMock.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole("button", { name: "البريد الإلكتروني" }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(reply(200, { candidates: [candidate] })));
    expect(screen.queryByText(candidate.name)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("clears displayed results when the lookup input changes", async () => {
    fetchMock.mockResolvedValue(reply(200, { candidates: [candidate] }));
    open(); search(); await screen.findByText(candidate.name);
    fireEvent.change(screen.getByRole("textbox", { name: "رمز التتبع" }), { target: { value: "TX-B" } });
    expect(screen.queryByText(candidate.name)).not.toBeInTheDocument();
  });
  it("prevents repeated Enter requests and aborts on unmount", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const view = open(); search();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "رمز التتبع" }), { key: "Enter" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const signal = fetchMock.mock.calls[0][1].signal;
    view.unmount(); expect(signal.aborted).toBe(true);
  });
});
