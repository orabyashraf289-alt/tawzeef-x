import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AssistantServicesDialog from "@/components/ai-assistant/AssistantServicesDialog";

describe("assistant services catalog", () => {
  it("keeps staff-only tools hidden from reviewers", () => {
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={() => {}} canManage={false} canScheduleInterviews={false} />);
    expect(screen.getByText("ملخص التوظيف")).toBeInTheDocument();
    expect(screen.queryByText("مراجعة إعلان وظيفة")).not.toBeInTheDocument();
    expect(screen.queryByText("جدولة مقابلة")).not.toBeInTheDocument();
  });

  it("finds a draft module and selects it", () => {
    const onSelect = vi.fn();
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={onSelect} canManage canScheduleInterviews />);
    fireEvent.change(screen.getByRole("textbox", { name: "ابحث في خدمات الذكاء الاصطناعي" }), { target: { value: "بطاقة المقابلة" } });
    fireEvent.click(screen.getByRole("button", { name: /بطاقة المقابلة/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ mode: "interview_scorecard" }));
  });

  it("hides scheduling until the staff member has that action grant", () => {
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={() => {}} canManage canScheduleInterviews={false} />);
    expect(screen.getByText("بطاقة المقابلة")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /جدولة مقابلة راجع المرشح/ })).not.toBeInTheDocument();
  });

  it("offers read-only analytics to reviewers and sends the selected report prompt", () => {
    const onSelect = vi.fn();
    render(<AssistantServicesDialog open onOpenChange={() => {}} onSelect={onSelect} canManage={false} canScheduleInterviews={false} />);
    for (const title of ["تقرير مسار التوظيف", "تحليل العروض الوظيفية", "مصادر المرشحين", "الاتجاه الشهري"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: /مصادر المرشحين/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "candidate_sources", prompt: expect.stringContaining("sources") }));
  });
});
