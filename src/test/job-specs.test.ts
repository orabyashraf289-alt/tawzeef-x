import { describe, it, expect } from "vitest";
import {
  encodeJobDescription,
  parseJobCustomSpecs,
  DEFAULT_SCHOOL_TYPES,
  DEFAULT_CURRICULA,
  DEFAULT_GRADE_LEVELS,
  DEFAULT_TEACHING_LOADS,
  DEFAULT_BENEFITS_OPTIONS,
  type JobCustomSpecs,
} from "@/lib/jobSpecsHelper";

describe("Job & Educational Specifications Suite", () => {
  it("should encode and decode job specifications cleanly without data loss", () => {
    const rawDescription = "نبحث عن معلم لغة إنجليزية متميز للمرحلة الثانوية بمدارس الأندلس.";
    const specs: JobCustomSpecs = {
      school_name: "مدارس الأندلس الأهلية",
      school_type: "أهلية",
      curriculum: "المنهج الوزاري المطور",
      grade_level: "المرحلة الثانوية (الصفوف 10 - 12)",
      weekly_classes: "18 - 20 حصة أسبوعياً (نصاب قياسي)",
      work_start_date: "18 أغسطس 2026",
      working_hours: "7:00 صباحاً - 2:00 ظهراً",
      benefits_package: "تأمين طبي فئة A + بدل سكن 25% + بدل نقل",
      class_size: "20 - 25 طالباً",
      application_deadline: "15 أغسطس 2026",
      is_educational: true,
    };

    const encoded = encodeJobDescription(rawDescription, specs);
    expect(encoded).toContain(rawDescription);
    expect(encoded).toContain("<!--TX_JOB_SPECS:");

    const parsed = parseJobCustomSpecs({ description: encoded });
    expect(parsed.cleanDescription).toBe(rawDescription);
    expect(parsed.hasSpecs).toBe(true);
    expect(parsed.specs.school_name).toBe("مدارس الأندلس الأهلية");
    expect(parsed.specs.school_type).toBe("أهلية");
    expect(parsed.specs.curriculum).toBe("المنهج الوزاري المطور");
    expect(parsed.specs.grade_level).toBe("المرحلة الثانوية (الصفوف 10 - 12)");
    expect(parsed.specs.weekly_classes).toBe("18 - 20 حصة أسبوعياً (نصاب قياسي)");
    expect(parsed.specs.benefits_package).toBe("تأمين طبي فئة A + بدل سكن 25% + بدل نقل");
    expect(parsed.specs.class_size).toBe("20 - 25 طالباً");
    expect(parsed.specs.application_deadline).toBe("15 أغسطس 2026");
  });

  it("should handle jobs without custom specifications gracefully", () => {
    const regularJob = {
      id: "job-regular",
      title: "مطور واجهات React",
      description: "نبحث عن مطور واجهات للعمل في مشاريعنا التقنية.",
    };

    const parsed = parseJobCustomSpecs(regularJob);
    expect(parsed.cleanDescription).toBe("نبحث عن مطور واجهات للعمل في مشاريعنا التقنية.");
    expect(parsed.hasSpecs).toBe(false);
    expect(Object.keys(parsed.specs).length).toBe(0);
  });

  it("should provide rich default taxonomy lists for schools and benefits", () => {
    expect(DEFAULT_SCHOOL_TYPES.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_CURRICULA.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_GRADE_LEVELS.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_TEACHING_LOADS.length).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_BENEFITS_OPTIONS.length).toBeGreaterThanOrEqual(5);

    expect(DEFAULT_SCHOOL_TYPES).toContain("عالمية (International)");
    expect(DEFAULT_CURRICULA).toContain("أمريكي (American Curriculum - NGSS)");
    expect(DEFAULT_BENEFITS_OPTIONS).toContain("تأمين طبي فئة A (شامل)");
  });
});
