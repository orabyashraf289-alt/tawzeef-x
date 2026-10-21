import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ApplySuccessPass from "@/components/apply/ApplySuccessPass";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
import { toast } from "@/hooks/use-toast";

const trackingCode = "TX-" + "A".repeat(32);
function renderReceipt() {
  return render(<MemoryRouter><ApplySuccessPass
    job={{ title: "معلم رياضيات" }} trackingCode={trackingCode}
    applicantName="سارة" applicantEmail="sara@example.com" applicantPhone=""
    schoolDisplayName="مدرسة النموذج" accountStatus="invited" onRetryAccount={() => {}}
  /></MemoryRouter>);
}
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => undefined }));
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.clearAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

describe("application receipt", () => {
  it("directs a newly invited applicant to email activation without exposing a phone password", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ApplySuccessPass
          job={{ title: "معلم رياضيات" }}
          trackingCode={"TX-" + "A".repeat(32)}
          applicantName="سارة"
          applicantEmail="sara@example.com"
          applicantPhone="0551234567"
          schoolDisplayName="مدرسة النموذج"
          accountStatus="invited"
          onRetryAccount={() => {}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("رابط تفعيل الحساب");
    expect(html).toContain("sara@example.com");
    expect(html).not.toContain("كلمة المرور المؤقتة");
    expect(html).not.toContain("0551234567");
    expect(html).toContain("/portal?code=TX-" + "A".repeat(32));
    expect(html).toContain("بانتظار المراجعة");
    expect(html).not.toContain("جاري الآن");
  });

  it("confirms copying only after the clipboard accepts the complete code", async () => {
    let finish!: () => void;
    const writeText = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    renderReceipt();
    fireEvent.click(screen.getByRole("button", { name: "نسخ الكود" }));
    expect(screen.getByRole("button", { name: "جارٍ النسخ…" })).toBeDisabled();
    expect(toast).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(trackingCode);
    await act(async () => finish());
    expect(screen.getByRole("button", { name: "تم النسخ" })).toBeEnabled();
    expect(toast).toHaveBeenCalledOnce();
    expect(screen.getByText(trackingCode)).toHaveAttribute("dir", "ltr");
  });

  it("keeps the code and tracking link usable after denial and allows retry", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValueOnce(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ writeText } as unknown as Clipboard);
    renderReceipt();
    fireEvent.click(screen.getByRole("button", { name: "نسخ الكود" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("انسخه يدوياً");
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByText(trackingCode)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /متابعة حالة الطلب/ })).toHaveAttribute("href", `/portal?code=${trackingCode}`);
    fireEvent.click(screen.getByRole("button", { name: "نسخ الكود" }));
    expect(await screen.findByRole("button", { name: "تم النسخ" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(toast).toHaveBeenCalledOnce();
  });

  it("offers manual copying when the clipboard API is unavailable", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined as unknown as Clipboard);
    renderReceipt();
    fireEvent.click(screen.getByRole("button", { name: "نسخ الكود" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر نسخ الرمز تلقائياً");
    expect(toast).not.toHaveBeenCalled();
  });
});
