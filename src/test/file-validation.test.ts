import { describe, it, expect, vi } from "vitest";
import { FILE_LIMITS } from "@/lib/fileValidation";

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("FILE_LIMITS constants", () => {
  it("sets resume max size to 5MB", () => {
    expect(FILE_LIMITS.resume.maxSize).toBe(5 * 1024 * 1024);
  });

  it("sets image max size to 10MB", () => {
    expect(FILE_LIMITS.image.maxSize).toBe(10 * 1024 * 1024);
  });

  it("allows PDF, DOC, DOCX for resumes", () => {
    expect(FILE_LIMITS.resume.allowedTypes).toContain(".pdf");
    expect(FILE_LIMITS.resume.allowedTypes).toContain(".doc");
    expect(FILE_LIMITS.resume.allowedTypes).toContain(".docx");
  });

  it("allows JPG, PNG, WEBP for images", () => {
    expect(FILE_LIMITS.image.allowedTypes).toContain(".jpg");
    expect(FILE_LIMITS.image.allowedTypes).toContain(".png");
    expect(FILE_LIMITS.image.allowedTypes).toContain(".webp");
  });

  it("has correct MIME types for resumes", () => {
    expect(FILE_LIMITS.resume.allowedMimes).toContain("application/pdf");
    expect(FILE_LIMITS.resume.allowedMimes).toContain("application/msword");
  });

  it("has correct MIME types for images", () => {
    expect(FILE_LIMITS.image.allowedMimes).toContain("image/jpeg");
    expect(FILE_LIMITS.image.allowedMimes).toContain("image/png");
  });
});

describe("File validation logic", () => {
  const validateFileLogic = (file: { name: string; size: number }, type: "resume" | "image") => {
    const limits = FILE_LIMITS[type];
    if (file.size > limits.maxSize) return "too_large";
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!(limits.allowedTypes as readonly string[]).includes(ext)) return "invalid_type";
    return "valid";
  };

  it("accepts valid PDF resume under 5MB", () => {
    expect(validateFileLogic({ name: "cv.pdf", size: 1024 * 1024 }, "resume")).toBe("valid");
  });

  it("rejects resume over 5MB", () => {
    expect(validateFileLogic({ name: "cv.pdf", size: 6 * 1024 * 1024 }, "resume")).toBe("too_large");
  });

  it("accepts resume exactly at 5MB", () => {
    expect(validateFileLogic({ name: "cv.pdf", size: 5 * 1024 * 1024 }, "resume")).toBe("valid");
  });

  it("rejects EXE file for resume", () => {
    expect(validateFileLogic({ name: "cv.exe", size: 1024 }, "resume")).toBe("invalid_type");
  });

  it("accepts valid PNG image under 10MB", () => {
    expect(validateFileLogic({ name: "photo.png", size: 2 * 1024 * 1024 }, "image")).toBe("valid");
  });

  it("rejects image over 10MB", () => {
    expect(validateFileLogic({ name: "photo.png", size: 11 * 1024 * 1024 }, "image")).toBe("too_large");
  });

  it("rejects SVG for image upload", () => {
    expect(validateFileLogic({ name: "logo.svg", size: 1024 }, "image")).toBe("invalid_type");
  });

  it("handles case-insensitive extensions", () => {
    expect(validateFileLogic({ name: "cv.PDF", size: 1024 }, "resume")).toBe("valid");
    expect(validateFileLogic({ name: "photo.PNG", size: 1024 }, "image")).toBe("valid");
  });
});
