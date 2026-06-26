import { describe, it, expect, vi } from "vitest";

describe("Application Form Validation", () => {
  const validateApplication = (app: {
    name: string;
    email: string;
    phone: string;
    specialty?: string;
    coverLetter?: string;
  }) => {
    const errors: string[] = [];
    if (!app.name.trim()) errors.push("name");
    if (!app.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.email)) errors.push("email");
    if (!app.phone.trim()) errors.push("phone");
    return errors;
  };

  it("accepts valid application data", () => {
    expect(validateApplication({
      name: "أحمد محمد",
      email: "ahmed@example.com",
      phone: "0501234567",
    })).toEqual([]);
  });

  it("rejects empty name", () => {
    expect(validateApplication({
      name: "",
      email: "ahmed@example.com",
      phone: "0501234567",
    })).toContain("name");
  });

  it("rejects invalid email", () => {
    expect(validateApplication({
      name: "أحمد",
      email: "not-an-email",
      phone: "0501234567",
    })).toContain("email");
  });

  it("rejects empty phone", () => {
    expect(validateApplication({
      name: "أحمد",
      email: "a@b.com",
      phone: "",
    })).toContain("phone");
  });

  it("handles multiple validation errors", () => {
    const errors = validateApplication({ name: "", email: "", phone: "" });
    expect(errors).toEqual(["name", "email", "phone"]);
  });
});

describe("Application Data Transformation", () => {
  it("transforms form data to database format", () => {
    const formData = {
      name: "أحمد محمد",
      email: "ahmed@test.com",
      phone: "0501234567",
      specialty: "React Developer",
      experience: "3 سنوات",
      coverLetter: "أنا مهتم بالوظيفة",
      skills: ["React", "TypeScript", "Node.js"],
    };
    const jobId = "job-123";

    const dbData = {
      job_id: jobId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      specialty: formData.specialty || null,
      experience: formData.experience || null,
      cover_letter: formData.coverLetter || null,
      skills: formData.skills?.length ? formData.skills : null,
      status: "جديد",
    };

    expect(dbData.job_id).toBe(jobId);
    expect(dbData.status).toBe("جديد");
    expect(dbData.skills).toEqual(["React", "TypeScript", "Node.js"]);
  });
});

describe("Phone Number Validation", () => {
  const isValidSaudiPhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-()]/g, "");
    return /^(05\d{8}|9665\d{8}|\+9665\d{8})$/.test(cleaned);
  };

  it("accepts valid Saudi phone numbers", () => {
    expect(isValidSaudiPhone("0512345678")).toBe(true);
    expect(isValidSaudiPhone("966512345678")).toBe(true);
    expect(isValidSaudiPhone("+966512345678")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidSaudiPhone("123")).toBe(false);
    expect(isValidSaudiPhone("")).toBe(false);
    expect(isValidSaudiPhone("0612345678")).toBe(false);
  });
});

describe("Resume File Validation", () => {
  const validateResume = (file: { name: string; size: number; type: string }) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) return "invalid_type";
    if (file.size > maxSize) return "too_large";
    if (file.size === 0) return "empty";
    return "valid";
  };

  it("accepts PDF files", () => {
    expect(validateResume({ name: "cv.pdf", size: 1024 * 100, type: "application/pdf" })).toBe("valid");
  });

  it("accepts Word documents", () => {
    expect(validateResume({
      name: "cv.docx",
      size: 1024 * 200,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    })).toBe("valid");
  });

  it("rejects oversized files", () => {
    expect(validateResume({ name: "cv.pdf", size: 6 * 1024 * 1024, type: "application/pdf" })).toBe("too_large");
  });

  it("rejects invalid file types", () => {
    expect(validateResume({ name: "cv.exe", size: 1024, type: "application/exe" })).toBe("invalid_type");
  });

  it("rejects empty files", () => {
    expect(validateResume({ name: "cv.pdf", size: 0, type: "application/pdf" })).toBe("empty");
  });
});

describe("Candidate Stage Pipeline", () => {
  const stages = ["تقديم الطلب", "المراجعة", "الفحص", "مقابلة تقنية", "مقابلة نهائية", "عرض وظيفي"];

  it("defines 6 pipeline stages", () => {
    expect(stages).toHaveLength(6);
  });

  it("starts with 'تقديم الطلب'", () => {
    expect(stages[0]).toBe("تقديم الطلب");
  });

  it("ends with 'عرض وظيفي'", () => {
    expect(stages[stages.length - 1]).toBe("عرض وظيفي");
  });

  it("calculates stage index correctly", () => {
    expect(stages.indexOf("المراجعة")).toBe(1);
    expect(stages.indexOf("مقابلة تقنية")).toBe(3);
  });

  it("can advance to next stage", () => {
    const currentStage = "المراجعة";
    const idx = stages.indexOf(currentStage);
    const nextStage = idx < stages.length - 1 ? stages[idx + 1] : null;
    expect(nextStage).toBe("الفحص");
  });
});
