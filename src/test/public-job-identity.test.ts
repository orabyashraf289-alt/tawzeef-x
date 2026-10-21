import { describe, expect, it } from "vitest";
import { getPublicJobEmployerName } from "@/lib/publicJobIdentity";

describe("public vacancy employer identity", () => {
  it("uses the vacancy's explicit school instead of the managing account", () => {
    expect(getPublicJobEmployerName({ companies: { name: "مجموعة تعليمية" } }, { school_name: " مدرسة الثقافة الرقمية " })).toBe("مدرسة الثقافة الرقمية");
  });
  it("uses public company branding when the vacancy has no specific employer", () => {
    expect(getPublicJobEmployerName({ companies: { name: " مدرسة الثقافة الرقمية " } }, { school_name: "  " })).toBe("مدرسة الثقافة الرقمية");
  });
  it("retains a legacy explicit school and ignores malformed names", () => {
    expect(getPublicJobEmployerName({ school_name: "مدرسة الفرع", companies: { name: 42 } }, {})).toBe("مدرسة الفرع");
    expect(getPublicJobEmployerName({ companies: { name: {} } }, {})).toBe("جهة التوظيف");
  });
  it("does not infer employer identity from a location", () => {
    const job = { location: "حي الأندلس", companies: null };
    expect(getPublicJobEmployerName(job, {})).toBe("جهة التوظيف");
    expect(getPublicJobEmployerName(null, {})).toBe("جهة التوظيف");
  });
});
