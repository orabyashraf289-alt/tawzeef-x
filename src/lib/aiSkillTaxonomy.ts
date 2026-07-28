/**
 * High-Precision AI Skill Taxonomy & Normalization Engine
 * Standardizes skill names across Arabic & English and categorizes skills.
 */

export interface SkillCategory {
  category: "Technical" | "Management" | "Design" | "Marketing" | "Finance" | "Soft Skills";
  normalizedName: string;
  originalName: string;
}

const SKILL_MAP: Record<string, { category: SkillCategory["category"]; canonical: string }> = {
  // Front-End & Web
  "react": { category: "Technical", canonical: "React.js" },
  "react.js": { category: "Technical", canonical: "React.js" },
  "reactjs": { category: "Technical", canonical: "React.js" },
  "تطوير الواجهات": { category: "Technical", canonical: "Front-End Development" },
  "front-end": { category: "Technical", canonical: "Front-End Development" },
  "vue": { category: "Technical", canonical: "Vue.js" },
  "vue.js": { category: "Technical", canonical: "Vue.js" },
  "typescript": { category: "Technical", canonical: "TypeScript" },
  "javascript": { category: "Technical", canonical: "JavaScript" },
  "html/css": { category: "Technical", canonical: "HTML5 / CSS3" },
  "tailwind": { category: "Technical", canonical: "Tailwind CSS" },

  // Back-End & Database
  "node": { category: "Technical", canonical: "Node.js" },
  "node.js": { category: "Technical", canonical: "Node.js" },
  "python": { category: "Technical", canonical: "Python" },
  "تطوير الباك اند": { category: "Technical", canonical: "Back-End Development" },
  "back-end": { category: "Technical", canonical: "Back-End Development" },
  "postgresql": { category: "Technical", canonical: "PostgreSQL" },
  "قواعد البيانات": { category: "Technical", canonical: "Databases & SQL" },
  "sql": { category: "Technical", canonical: "Databases & SQL" },
  "supabase": { category: "Technical", canonical: "Supabase Backend" },
  "docker": { category: "Technical", canonical: "Docker & DevOps" },

  // Management & HR
  "إدارة المشاريع": { category: "Management", canonical: "Project Management" },
  "project management": { category: "Management", canonical: "Project Management" },
  "إدارة التوظيف": { category: "Management", canonical: "Talent Acquisition" },
  "recruitment": { category: "Management", canonical: "Talent Acquisition" },
  "الموارد البشرية": { category: "Management", canonical: "Human Resources (HR)" },
  "human resources": { category: "Management", canonical: "Human Resources (HR)" },
  "القيادة والتوجيه": { category: "Management", canonical: "Leadership & Mentorship" },
  "leadership": { category: "Management", canonical: "Leadership & Mentorship" },

  // Marketing & Sales
  "التسويق الرقمي": { category: "Marketing", canonical: "Digital Marketing" },
  "digital marketing": { category: "Marketing", canonical: "Digital Marketing" },
  "seo": { category: "Marketing", canonical: "SEO & Content Strategy" },
  "إدارة تحسين المحركات": { category: "Marketing", canonical: "SEO & Content Strategy" },
  "إدارة المبيعات": { category: "Marketing", canonical: "Sales & CRM" },
  "sales": { category: "Marketing", canonical: "Sales & CRM" },

  // Soft Skills
  "التواصل الفعال": { category: "Soft Skills", canonical: "Effective Communication" },
  "communication": { category: "Soft Skills", canonical: "Effective Communication" },
  "حل المشكلات": { category: "Soft Skills", canonical: "Problem Solving" },
  "problem solving": { category: "Soft Skills", canonical: "Problem Solving" },
  "العمل الجماعي": { category: "Soft Skills", canonical: "Teamwork & Collaboration" },
  "teamwork": { category: "Soft Skills", canonical: "Teamwork & Collaboration" },
};

/**
 * Normalizes a raw skill string into a canonical representation
 */
export function normalizeSkill(rawSkill: string): SkillCategory {
  const clean = rawSkill.trim().toLowerCase();
  const match = SKILL_MAP[clean];
  if (match) {
    return {
      category: match.category,
      normalizedName: match.canonical,
      originalName: rawSkill,
    };
  }

  // Infer default category
  let category: SkillCategory["category"] = "Technical";
  if (clean.includes("إدارة") || clean.includes("management") || clean.includes("lead")) {
    category = "Management";
  } else if (clean.includes("تسويق") || clean.includes("market") || clean.includes("مبيعات")) {
    category = "Marketing";
  } else if (clean.includes("تصميم") || clean.includes("design") || clean.includes("ui/ux")) {
    category = "Design";
  } else if (clean.includes("تواصل") || clean.includes("فريق") || clean.includes("soft")) {
    category = "Soft Skills";
  }

  return {
    category,
    normalizedName: rawSkill.trim(),
    originalName: rawSkill,
  };
}

/**
 * High precision skills matching algorithm
 */
export function calculateSkillsMatch(
  candidateSkills: string[],
  jobRequirements: string[]
): {
  score: number;
  matched: SkillCategory[];
  missing: string[];
} {
  if (!jobRequirements || jobRequirements.length === 0) {
    return { score: 85, matched: [], missing: [] };
  }

  const normalizedCandidate = candidateSkills.map(normalizeSkill);
  const matched: SkillCategory[] = [];
  const missing: string[] = [];

  for (const req of jobRequirements) {
    const reqClean = req.toLowerCase().trim();
    const found = normalizedCandidate.find(
      (c) =>
        c.normalizedName.toLowerCase().includes(reqClean) ||
        c.originalName.toLowerCase().includes(reqClean) ||
        reqClean.includes(c.normalizedName.toLowerCase())
    );

    if (found) {
      matched.push(found);
    } else {
      missing.push(req);
    }
  }

  const score = Math.round((matched.length / jobRequirements.length) * 100);

  return {
    score: Math.min(100, Math.max(20, score)),
    matched,
    missing,
  };
}
