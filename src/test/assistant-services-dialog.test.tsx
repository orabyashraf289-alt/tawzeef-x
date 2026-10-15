import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AssistantServicesDialog from "@/components/ai-assistant/AssistantServicesDialog";

describe("assistant services catalog", () => {
  it("keeps staff-only tools hidden from reviewers", () => {
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={() => {}} canManage={false} />);
    expect(screen.getByText("ملخص التوظيف")).toBeInTheDocument();
    expect(screen.queryByText("مراجعة إعلان وظيفة")).not.toBeInTheDocument();
    expect(screen.queryByText("جدولة مقابلة")).not.toBeInTheDocument();
  });

  it("finds a draft module and selects it", () => {
    const onSelect = vi.fn();
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={onSelect} canManage />);
    fireEvent.change(screen.getByRole("textbox", { name: "ابحث في خدمات الذكاء الاصطناعي" }), { target: { value: "بطاقة المقابلة" } });
    fireEvent.click(screen.getByRole("button", { name: /بطاقة المقابلة/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ mode: "interview_scorecard" }));
  });
});
