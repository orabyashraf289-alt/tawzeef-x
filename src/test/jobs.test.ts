import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockJobs, mockUser } from "@/test/mocks/supabase";

// Mock supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

const createChain = () => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockJobs[0], error: null }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: mockJobs[0], error: null }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { ...mockJobs[0], status: "مغلقة" }, error: null }),
      }),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => createChain()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

describe("Job Management - Data Validation", () => {
  it("validates required job fields", () => {
    const validateJob = (job: { title: string; department: string; location: string; type: string }) => {
      const errors: string[] = [];
      if (!job.title.trim()) errors.push("title");
      if (!job.department) errors.push("department");
      if (!job.location) errors.push("location");
      if (!job.type) errors.push("type");
      return errors;
    };

    expect(validateJob({
      title: "مطور React",
      department: "الهندسة",
      location: "الرياض",
      type: "دوام كامل",
    })).toEqual([]);

    expect(validateJob({
      title: "",
      department: "الهندسة",
      location: "",
      type: "دوام كامل",
    })).toEqual(["title", "location"]);

    expect(validateJob({
      title: "",
      department: "",
      location: "",
      type: "",
    })).toEqual(["title", "department", "location", "type"]);
  });

  it("validates salary range logic", () => {
    const validateSalary = (min?: string, max?: string) => {
      if (!min && !max) return true;
      const minVal = parseInt(min || "0");
      const maxVal = parseInt(max || "0");
      if (min && isNaN(minVal)) return false;
      if (max && isNaN(maxVal)) return false;
      if (min && max && minVal > maxVal) return false;
      if (minVal < 0 || maxVal < 0) return false;
      return true;
    };

    expect(validateSalary()).toBe(true);
    expect(validateSalary("10000", "20000")).toBe(true);
    expect(validateSalary("20000", "10000")).toBe(false);
    expect(validateSalary("abc", "20000")).toBe(false);
    expect(validateSalary("-1000", "20000")).toBe(false);
  });

  it("parses requirements from text to array", () => {
    const parseRequirements = (text: string) =>
      text.split("\n").map(s => s.trim()).filter(Boolean);

    expect(parseRequirements("React\nTypeScript\nNode.js")).toEqual([
      "React", "TypeScript", "Node.js"
    ]);
    expect(parseRequirements("")).toEqual([]);
    expect(parseRequirements("Single requirement")).toEqual(["Single requirement"]);
    expect(parseRequirements("Line 1\n\n\nLine 2")).toEqual(["Line 1", "Line 2"]);
  });

  it("validates experience levels", () => {
    const validLevels = ["بدون خبرة", "1-2 سنوات", "3-5 سنوات", "5-7 سنوات", "7-10 سنوات", "+10 سنوات"];
    expect(validLevels).toContain("3-5 سنوات");
    expect(validLevels).not.toContain("invalid");
  });

  it("validates department values", () => {
    const validDepts = ["الهندسة", "التصميم", "الإدارة", "البيانات", "التسويق", "الموارد البشرية", "المالية"];
    expect(validDepts.length).toBe(7);
    expect(validDepts).toContain("الهندسة");
  });
});

describe("Job Data Transformation", () => {
  it("transforms form data to database insert format", () => {
    const formData = {
      title: "مطور React",
      department: "الهندسة",
      location: "الرياض",
      type: "دوام كامل",
      description: "وصف الوظيفة",
      requirements: "React\nTypeScript",
      salaryMin: "15000",
      salaryMax: "25000",
      experience: "3-5 سنوات",
    };

    const dbData = {
      user_id: mockUser.id,
      title: formData.title,
      department: formData.department,
      location: formData.location,
      type: formData.type,
      description: formData.description || null,
      requirements: formData.requirements ? formData.requirements.split("\n").filter(Boolean) : null,
      salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : null,
      salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : null,
      experience_level: formData.experience || null,
    };

    expect(dbData.user_id).toBe(mockUser.id);
    expect(dbData.requirements).toEqual(["React", "TypeScript"]);
    expect(dbData.salary_min).toBe(15000);
    expect(dbData.salary_max).toBe(25000);
  });

  it("handles empty optional fields gracefully", () => {
    const formData = {
      title: "وظيفة",
      department: "الهندسة",
      location: "الرياض",
      type: "دوام كامل",
      description: "",
      requirements: "",
      salaryMin: "",
      salaryMax: "",
      experience: "",
    };

    const dbData = {
      description: formData.description || null,
      requirements: formData.requirements ? formData.requirements.split("\n").filter(Boolean) : null,
      salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : null,
      salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : null,
      experience_level: formData.experience || null,
    };

    expect(dbData.description).toBeNull();
    expect(dbData.requirements).toBeNull();
    expect(dbData.salary_min).toBeNull();
    expect(dbData.salary_max).toBeNull();
    expect(dbData.experience_level).toBeNull();
  });
});

describe("Job Status Management", () => {
  it("defines valid job statuses", () => {
    const validStatuses = ["نشطة", "مغلقة", "مسودة"];
    expect(validStatuses).toContain("نشطة");
    expect(validStatuses).toContain("مغلقة");
  });

  it("filters active jobs correctly", () => {
    const jobs = [...mockJobs, { ...mockJobs[0], id: "job-3", status: "مغلقة" }];
    const activeJobs = jobs.filter(j => j.status === "نشطة");
    expect(activeJobs.length).toBe(2);
  });
});
