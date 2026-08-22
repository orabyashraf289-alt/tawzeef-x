import { useState, useEffect, useCallback } from "react";
import { ALL_AL_ANDALUS_BRANCHES } from "@/data/alAndalusBranches";
import {
  DEFAULT_SCHOOL_TYPES,
  DEFAULT_CURRICULA,
  DEFAULT_GRADE_LEVELS,
  DEFAULT_TEACHING_LOADS,
  DEFAULT_WORKING_HOURS,
  DEFAULT_BENEFITS_OPTIONS,
} from "@/lib/jobSpecsHelper";

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  color?: string;
  head?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  city?: string;
  country?: string;
  type?: string;
  address?: string;
}

export interface ExperienceLevelItem {
  id: string;
  name: string;
  minYears?: number;
  maxYears?: number;
  color?: string;
  badge?: string;
}

export interface ApprovalChainItem {
  id: string;
  name: string;
  steps: string[];
  description?: string;
  badge?: string;
}

export const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  { id: "dept-1", name: "التقنية والبرمجة", code: "TECH", color: "#6366f1", head: "مدير تقني" },
  { id: "dept-2", name: "الموارد البشرية", code: "HR", color: "#ec4899", head: "مدير HR" },
  { id: "dept-3", name: "التسويق والمبيعات", code: "MKT", color: "#f59e0b", head: "مدير التسويق" },
  { id: "dept-4", name: "المالية والمحاسبة", code: "FIN", color: "#10b981", head: "المدير المالي" },
  { id: "dept-5", name: "التشغيل واللوجستيات", code: "OPS", color: "#0ea5e9", head: "مدير التشغيل" },
  { id: "dept-6", name: "التصميم وتجربة المستخدم", code: "DES", color: "#8b5cf6", head: "قائد التصميم" },
  { id: "dept-7", name: "خدمة وتجربة العملاء", code: "CS", color: "#14b8a6", head: "مدير الدعم" },
  { id: "dept-8", name: "القسم التعليمي والأكاديمي", code: "EDU", color: "#10b981", head: "المدير الأكاديمي" },
];

export const DEFAULT_LOCATIONS: LocationItem[] = [
  ...ALL_AL_ANDALUS_BRANCHES.map((b) => ({
    id: b.id,
    name: `${b.city} - ${b.name}`,
    city: b.city,
    country: "السعودية",
    type: b.schoolTypes.join(" / "),
    address: b.address,
  })),
  { id: "loc-1", name: "الرياض - المقر الرئيسي", city: "الرياض", country: "السعودية", type: "مكتبي" },
  { id: "loc-2", name: "جدة - الفرع الغربي", city: "جدة", country: "السعودية", type: "مكتبي" },
  { id: "loc-3", name: "المنطقة الشرقية - الخبر", city: "الخبر", country: "السعودية", type: "مكتبي" },
  { id: "loc-6", name: "عمل عن بُعد (Remote)", city: "عن بُعد", country: "عالمي", type: "عن_بعد" },
];

export const DEFAULT_EXPERIENCE_LEVELS: ExperienceLevelItem[] = [
  { id: "exp-1", name: "حديث تخرج (Fresh Graduate)", minYears: 0, maxYears: 1, badge: "مبتدئ جداً" },
  { id: "exp-2", name: "مبتدئ (Junior Level)", minYears: 1, maxYears: 3, badge: "1-3 سنوات" },
  { id: "exp-3", name: "متوسط (Mid Level)", minYears: 3, maxYears: 5, badge: "3-5 سنوات" },
  { id: "exp-4", name: "خبير (Senior Level)", minYears: 5, maxYears: 8, badge: "5-8 سنوات" },
  { id: "exp-5", name: "قائد فريق / مدير (Lead / Manager)", minYears: 8, maxYears: 12, badge: "+8 سنوات" },
  { id: "exp-6", name: "تنفيذي / مدير قطاع (Executive / Director)", minYears: 12, maxYears: 20, badge: "+12 سنة" },
];

export const DEFAULT_APPROVAL_CHAINS: ApprovalChainItem[] = [
  {
    id: "chain-1",
    name: "سلسلة موافقة قياسية (مدير الموارد البشرية)",
    steps: ["مدير الموارد البشرية (HR Manager)"],
    description: "موافقة خطوة واحدة قياسية من مسؤول الموارد البشرية",
    badge: "خطوة واحدة",
  },
  {
    id: "chain-2",
    name: "سلسلة موافقة ثنائية (مدير القسم + الموارد البشرية)",
    steps: ["مدير القسم المعني (Department Head)", "مدير الموارد البشرية (HR Manager)"],
    description: "موافقة ثنائية تتطلب اعتماد مدير القسم والـ HR",
    badge: "موافقة ثنائية",
  },
  {
    id: "chain-3",
    name: "سلسلة موافقة ثلاثية (مدير القسم + HR + المدير التنفيذي)",
    steps: ["مدير القسم", "مدير الموارد البشرية", "المدير التنفيذي (CEO)"],
    description: "موافقة ثلاثية للوظائف القيادية والتنفيذية",
    badge: "موافقة ثلاثية",
  },
  {
    id: "chain-4",
    name: "سلسلة موافقة سريعة تلقائية (نشر فورياً)",
    steps: ["نشر فوري تلقائي"],
    description: "تعتمد الوظيفة وتُنشر فوراً دون انتظار موافقات",
    badge: "تلقائي فوراً",
  },
  {
    id: "chain-5",
    name: "سلسلة موافقة مالية وتنفيذية (للوظائف العليا)",
    steps: ["المدير المالي (CFO)", "المدير التنفيذي (CEO)"],
    description: "تعتمد الاعتمادات المالية والميزانية المخصصة للوظيفة",
    badge: "مالي + تنفيذي",
  },
];

export function useCompanyTaxonomy() {
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    try {
      const saved = localStorage.getItem("company_departments");
      return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
    } catch {
      return DEFAULT_DEPARTMENTS;
    }
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    try {
      const saved = localStorage.getItem("company_locations");
      if (!saved) return DEFAULT_LOCATIONS;
      const parsed: LocationItem[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(l => l.id));
      const missingDefault = DEFAULT_LOCATIONS.filter(l => !existingIds.has(l.id));
      if (missingDefault.length > 0) {
        const merged = [...parsed, ...missingDefault];
        try { localStorage.setItem("company_locations", JSON.stringify(merged)); } catch {}
        return merged;
      }
      return parsed;
    } catch {
      return DEFAULT_LOCATIONS;
    }
  });

  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevelItem[]>(() => {
    try {
      const saved = localStorage.getItem("company_experience_levels");
      return saved ? JSON.parse(saved) : DEFAULT_EXPERIENCE_LEVELS;
    } catch {
      return DEFAULT_EXPERIENCE_LEVELS;
    }
  });

  const [approvalChains, setApprovalChains] = useState<ApprovalChainItem[]>(() => {
    try {
      const saved = localStorage.getItem("company_approval_chains");
      return saved ? JSON.parse(saved) : DEFAULT_APPROVAL_CHAINS;
    } catch {
      return DEFAULT_APPROVAL_CHAINS;
    }
  });

  // Educational Specifications States
  const [schoolTypes, setSchoolTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_school_types");
      return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_TYPES;
    } catch {
      return DEFAULT_SCHOOL_TYPES;
    }
  });

  const [curricula, setCurricula] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_curricula");
      return saved ? JSON.parse(saved) : DEFAULT_CURRICULA;
    } catch {
      return DEFAULT_CURRICULA;
    }
  });

  const [gradeLevels, setGradeLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_grade_levels");
      return saved ? JSON.parse(saved) : DEFAULT_GRADE_LEVELS;
    } catch {
      return DEFAULT_GRADE_LEVELS;
    }
  });

  const [teachingLoads, setTeachingLoads] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_teaching_loads");
      return saved ? JSON.parse(saved) : DEFAULT_TEACHING_LOADS;
    } catch {
      return DEFAULT_TEACHING_LOADS;
    }
  });

  const [workingHoursList, setWorkingHoursList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_working_hours");
      return saved ? JSON.parse(saved) : DEFAULT_WORKING_HOURS;
    } catch {
      return DEFAULT_WORKING_HOURS;
    }
  });

  const [benefitsList, setBenefitsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("company_benefits_list");
      return saved ? JSON.parse(saved) : DEFAULT_BENEFITS_OPTIONS;
    } catch {
      return DEFAULT_BENEFITS_OPTIONS;
    }
  });

  // Listen for storage updates across tabs or within window
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedDept = localStorage.getItem("company_departments");
        if (savedDept) setDepartments(JSON.parse(savedDept));

        const savedLoc = localStorage.getItem("company_locations");
        if (savedLoc) setLocations(JSON.parse(savedLoc));

        const savedExp = localStorage.getItem("company_experience_levels");
        if (savedExp) setExperienceLevels(JSON.parse(savedExp));

        const savedChain = localStorage.getItem("company_approval_chains");
        if (savedChain) setApprovalChains(JSON.parse(savedChain));

        const savedSchoolTypes = localStorage.getItem("company_school_types");
        if (savedSchoolTypes) setSchoolTypes(JSON.parse(savedSchoolTypes));

        const savedCurricula = localStorage.getItem("company_curricula");
        if (savedCurricula) setCurricula(JSON.parse(savedCurricula));

        const savedGrades = localStorage.getItem("company_grade_levels");
        if (savedGrades) setGradeLevels(JSON.parse(savedGrades));

        const savedLoads = localStorage.getItem("company_teaching_loads");
        if (savedLoads) setTeachingLoads(JSON.parse(savedLoads));

        const savedHours = localStorage.getItem("company_working_hours");
        if (savedHours) setWorkingHoursList(JSON.parse(savedHours));

        const savedBenefits = localStorage.getItem("company_benefits_list");
        if (savedBenefits) setBenefitsList(JSON.parse(savedBenefits));
      } catch {}
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addQuickDepartment = useCallback((name: string) => {
    if (!name.trim()) return;
    const newDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: name.trim(),
      code: name.trim().slice(0, 3).toUpperCase(),
      color: "#6366f1",
      head: "مسؤول القسم",
    };
    setDepartments(prev => {
      const updated = [...prev, newDept];
      try { localStorage.setItem("company_departments", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newDept.name;
  }, []);

  const addQuickLocation = useCallback((name: string) => {
    if (!name.trim()) return;
    const newLoc: LocationItem = {
      id: `loc-${Date.now()}`,
      name: name.trim(),
      city: name.includes("-") ? name.split("-")[0].trim() : name.trim(),
      country: "السعودية",
      type: "مكتبي",
    };
    setLocations(prev => {
      const updated = [...prev, newLoc];
      try { localStorage.setItem("company_locations", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newLoc.name;
  }, []);

  const addQuickExperienceLevel = useCallback((name: string) => {
    if (!name.trim()) return;
    const newExp: ExperienceLevelItem = {
      id: `exp-${Date.now()}`,
      name: name.trim(),
      badge: "مخصص",
    };
    setExperienceLevels(prev => {
      const updated = [...prev, newExp];
      try { localStorage.setItem("company_experience_levels", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newExp.name;
  }, []);

  const addQuickApprovalChain = useCallback((name: string, steps?: string[]) => {
    if (!name.trim()) return;
    const parsedSteps = steps && steps.length > 0 ? steps : [name.trim()];
    const newChain: ApprovalChainItem = {
      id: `chain-${Date.now()}`,
      name: name.trim(),
      steps: parsedSteps,
      description: "سلسلة موافقة مخصصة جديدة",
      badge: `${parsedSteps.length} مرحلة`,
    };
    setApprovalChains(prev => {
      const updated = [...prev, newChain];
      try { localStorage.setItem("company_approval_chains", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return newChain.name;
  }, []);

  const addQuickSchoolType = useCallback((name: string) => {
    if (!name.trim()) return;
    setSchoolTypes(prev => {
      if (prev.includes(name.trim())) return prev;
      const updated = [...prev, name.trim()];
      try { localStorage.setItem("company_school_types", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return name.trim();
  }, []);

  const addQuickCurriculum = useCallback((name: string) => {
    if (!name.trim()) return;
    setCurricula(prev => {
      if (prev.includes(name.trim())) return prev;
      const updated = [...prev, name.trim()];
      try { localStorage.setItem("company_curricula", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return name.trim();
  }, []);

  const addQuickGradeLevel = useCallback((name: string) => {
    if (!name.trim()) return;
    setGradeLevels(prev => {
      if (prev.includes(name.trim())) return prev;
      const updated = [...prev, name.trim()];
      try { localStorage.setItem("company_grade_levels", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return name.trim();
  }, []);

  const addQuickTeachingLoad = useCallback((name: string) => {
    if (!name.trim()) return;
    setTeachingLoads(prev => {
      if (prev.includes(name.trim())) return prev;
      const updated = [...prev, name.trim()];
      try { localStorage.setItem("company_teaching_loads", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return name.trim();
  }, []);

  const addQuickBenefit = useCallback((name: string) => {
    if (!name.trim()) return;
    setBenefitsList(prev => {
      if (prev.includes(name.trim())) return prev;
      const updated = [...prev, name.trim()];
      try { localStorage.setItem("company_benefits_list", JSON.stringify(updated)); } catch {}
      return updated;
    });
    return name.trim();
  }, []);

  return {
    departments,
    departmentNames: (departments || []).map(d => d.name),
    locations,
    locationNames: (locations || []).map(l => l.name),
    experienceLevels,
    experienceLevelNames: (experienceLevels || []).map(e => e.name),
    approvalChains: approvalChains || DEFAULT_APPROVAL_CHAINS,
    approvalChainNames: (approvalChains || DEFAULT_APPROVAL_CHAINS).map(c => c.name),
    
    // Educational & Operational specs
    schoolTypes,
    curricula,
    gradeLevels,
    teachingLoads,
    workingHoursList,
    benefitsList,

    // Mutators
    addQuickDepartment,
    addQuickLocation,
    addQuickExperienceLevel,
    addQuickApprovalChain,
    addQuickSchoolType,
    addQuickCurriculum,
    addQuickGradeLevel,
    addQuickTeachingLoad,
    addQuickBenefit,
  };
}
