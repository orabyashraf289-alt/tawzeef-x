import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AutomationBuilder from "@/components/AutomationBuilder";

const mocks = vi.hoisted(() => ({
  companyId: "company-a", owner: true, type: "move_stage", activate: vi.fn(),
}));
vi.mock("@/contexts/CompanyContext", () => ({ useCompany: () => ({ activeCompanyId: mocks.companyId }) }));
vi.mock("@/hooks/useCompanies", () => ({ useCompanyMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/useAutomation", async importOriginal => {
  const original = await importOriginal<typeof import("@/hooks/useAutomation")>();
  return {
    ...original,
    useAutomationStages: () => ({ data: [{ id: "stage-a", name: "المقابلة" }] }),
    useAutomationRules: () => ({
      rules: [{ id: "rule-a", company_id: "company-a", title: "مراجعة الطلب", trigger_event: "application.created",
        conditions: [], actions: [{ type: mocks.type, payload: mocks.type === "move_stage" ? { stage_id: "stage-a" } : { details: "رسالة قديمة" } }], is_active: false }],
      logs: [], needsCompany: false, canManage: mocks.owner, setRuleActive: mocks.activate,
      createRule: vi.fn(), updateRule: vi.fn(), deleteRule: vi.fn(), changingState: false,
    }),
  };
});
const view = () => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AutomationBuilder /></MemoryRouter>;
beforeEach(() => { mocks.companyId = "company-a"; mocks.owner = true; mocks.type = "move_stage"; mocks.activate.mockReset().mockResolvedValue({ is_active: true }); });
afterEach(cleanup);

describe("Automation activation review", () => {
  it("shows an actionable review and activates only after the owner confirms", async () => {
    render(view());
    expect(mocks.activate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "مراجعة وتفعيل" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("نقل إلى: المقابلة");
    expect(mocks.activate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد التفعيل" }));
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith({ id: "rule-a", active: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("keeps old free-text communication drafts disabled", () => {
    mocks.type = "send_email";
    render(view());
    expect(screen.getByRole("button", { name: "مراجعة وتفعيل" })).toBeDisabled();
    expect(screen.getByText("هذا الإجراء يحتاج تكامل إرسال قبل تفعيله")).toBeInTheDocument();
    expect(mocks.activate).not.toHaveBeenCalled();
  });
  it("closes a pending activation when switching companies", async () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("button", { name: "مراجعة وتفعيل" }));
    mocks.companyId = "company-b";
    rerender(view());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.activate).not.toHaveBeenCalled();
  });
  it("shows members the rules without activation controls they can use", () => {
    mocks.owner = false;
    render(view());
    expect(screen.getByRole("button", { name: "مراجعة وتفعيل" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إنشاء قاعدة" })).toBeDisabled();
  });
});
