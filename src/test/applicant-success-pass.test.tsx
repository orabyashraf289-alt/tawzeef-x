import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ApplySuccessPass from "@/components/apply/ApplySuccessPass";

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
  });
});
