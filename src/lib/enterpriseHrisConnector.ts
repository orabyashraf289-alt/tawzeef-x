/**
 * Enterprise HRIS Connector Engine (SAP SuccessFactors & Oracle HCM Cloud)
 * Standards-compliant exporter and automated handoff for hired candidates.
 */

export interface HrisEmployeeProfile {
  id: string;
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  nationalId?: string | null;
  jobTitle: string;
  department: string;
  location?: string | null;
  hireDate: string;
  employmentType?: string | null;
  salary?: number | null;
  currency?: string | null;
  managerName?: string | null;
  trackingCode?: string | null;
}

export interface HrisReadinessReport {
  totalHired: number;
  readyForHandoff: number;
  missingFieldsWarnings: { candidateId: string; candidateName: string; missing: string[] }[];
  readinessPercentage: number;
}

/**
 * Parses full Arabic or English name into first and last name
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: parts[0] || "موظف", lastName: "جديد" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/**
 * Generates SAP SuccessFactors Employee Central CSV Import Format
 */
export function generateSapSuccessFactorsCsv(employees: HrisEmployeeProfile[]): string {
  const headers = [
    "STATUS",
    "USERID",
    "USERNAME",
    "FIRSTNAME",
    "LASTNAME",
    "EMAIL",
    "JOB_TITLE",
    "DEPARTMENT",
    "LOCATION",
    "HIREDATE",
    "BASE_SALARY",
    "CURRENCY",
    "NATIONAL_ID",
  ];

  const rows = employees.map((emp) => {
    const userId = `EMP-${emp.candidateId.slice(0, 8).toUpperCase()}`;
    const username = emp.email.split("@")[0] || userId;
    const hireDateFormatted = new Date(emp.hireDate).toISOString().slice(0, 10);

    return [
      "ACTIVE",
      userId,
      username,
      `"${emp.firstName.replace(/"/g, '""')}"`,
      `"${emp.lastName.replace(/"/g, '""')}"`,
      emp.email,
      `"${emp.jobTitle.replace(/"/g, '""')}"`,
      `"${emp.department.replace(/"/g, '""')}"`,
      `"${(emp.location || "الرياض").replace(/"/g, '""')}"`,
      hireDateFormatted,
      emp.salary || "",
      emp.currency || "SAR",
      emp.nationalId || "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates Oracle HCM Cloud HDL (HCM Data Loader) Worker.dat format
 */
export function generateOracleHcmDataLoaderHdl(employees: HrisEmployeeProfile[]): string {
  const lines: string[] = [
    "COMMENT Automated Handoff from TawzeefX ATS to Oracle Fusion HCM Cloud",
    "METADATA|Worker|PersonNumber|EffectiveStartDate|FirstName|LastName|EmailAddress|City|Country|NationalId",
  ];

  employees.forEach((emp) => {
    const personNum = `PER_${emp.candidateId.slice(0, 8).toUpperCase()}`;
    const effectiveDate = new Date(emp.hireDate).toISOString().slice(0, 10).replace(/-/g, "/");
    const city = emp.location || "Riyadh";

    lines.push(
      `MERGE|Worker|${personNum}|${effectiveDate}|${emp.firstName}|${emp.lastName}|${emp.email}|${city}|SA|${emp.nationalId || ""}`
    );
  });

  lines.push("");
  lines.push("METADATA|WorkTerms|PersonNumber|EffectiveStartDate|ActionCode|LegalEmployerName");
  employees.forEach((emp) => {
    const personNum = `PER_${emp.candidateId.slice(0, 8).toUpperCase()}`;
    const effectiveDate = new Date(emp.hireDate).toISOString().slice(0, 10).replace(/-/g, "/");
    lines.push(`MERGE|WorkTerms|${personNum}|${effectiveDate}|HIRE|TawzeefX Employer`);
  });

  lines.push("");
  lines.push("METADATA|Assignment|PersonNumber|EffectiveStartDate|ActionCode|BusinessUnitShortCode|DepartmentName|JobCode|SalaryAmount");
  employees.forEach((emp) => {
    const personNum = `PER_${emp.candidateId.slice(0, 8).toUpperCase()}`;
    const effectiveDate = new Date(emp.hireDate).toISOString().slice(0, 10).replace(/-/g, "/");
    lines.push(
      `MERGE|Assignment|${personNum}|${effectiveDate}|HIRE|BU_SAUDI|${emp.department}|${emp.jobTitle}|${emp.salary || 0}`
    );
  });

  return lines.join("\n");
}

/**
 * Generates Enterprise REST Handoff JSON Payload for SAP Integration Suite / Oracle OIC
 */
export function generateEnterpriseHandoffJson(
  employee: HrisEmployeeProfile,
  options?: { targetHris?: "sap" | "oracle"; companyCode?: string }
): Record<string, unknown> {
  const target = options?.targetHris || "sap";
  const companyCode = options?.companyCode || "1000";

  return {
    sourceSystem: "TawzeefX_ATS",
    targetSystem: target === "sap" ? "SAP_SuccessFactors_EC" : "Oracle_HCM_Cloud",
    eventType: "CANDIDATE_HIRED_HANDOFF",
    timestamp: new Date().toISOString(),
    employeeData: {
      candidateReferenceId: employee.candidateId,
      trackingCode: employee.trackingCode,
      companyCode,
      personalInfo: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        nationalIdentifier: employee.nationalId || null,
      },
      jobInfo: {
        jobTitle: employee.jobTitle,
        department: employee.department,
        workLocation: employee.location || "الرياض",
        hireDate: employee.hireDate,
        employmentType: employee.employmentType || "FULL_TIME",
      },
      compensationInfo: {
        baseSalary: employee.salary || null,
        currency: employee.currency || "SAR",
        payFrequency: "MONTHLY",
      },
      directManager: employee.managerName || null,
    },
  };
}

/**
 * Validates candidate readiness for enterprise HRIS handoff
 */
export function validateHrisReadiness(candidates: any[]): HrisReadinessReport {
  const hiredCandidates = candidates.filter(
    (c) => c.status === "مقبول" || c.status === "مكتمل" || c.stage === "العرض الوظيفي" || c.stage === "توظيف"
  );

  const warnings: { candidateId: string; candidateName: string; missing: string[] }[] = [];

  hiredCandidates.forEach((c) => {
    const missing: string[] = [];
    if (!c.email) missing.push("البريد الإلكتروني");
    if (!c.phone) missing.push("رقم الجوال");
    if (!c.role && !c.jobs?.title) missing.push("المسمى الوظيفي");

    if (missing.length > 0) {
      warnings.push({
        candidateId: c.id,
        candidateName: c.name || "مرشح",
        missing,
      });
    }
  });

  const readyCount = hiredCandidates.length - warnings.length;
  const percentage =
    hiredCandidates.length > 0 ? Math.round((readyCount / hiredCandidates.length) * 100) : 100;

  return {
    totalHired: hiredCandidates.length,
    readyForHandoff: Math.max(0, readyCount),
    missingFieldsWarnings: warnings,
    readinessPercentage: percentage,
  };
}