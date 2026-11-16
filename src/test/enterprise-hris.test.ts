import { describe, it, expect } from "vitest";
import {
  splitFullName,
  generateSapSuccessFactorsCsv,
  generateOracleHcmDataLoaderHdl,
  generateEnterpriseHandoffJson,
  validateHrisReadiness,
  type HrisEmployeeProfile,
} from "../lib/enterpriseHrisConnector";

describe("Enterprise HRIS Connector Engine (SAP & Oracle)", () => {
  const sampleEmployees: HrisEmployeeProfile[] = [
    {
      id: "emp-1",
      candidateId: "cand-abcdef123",
      firstName: "سعود",
      lastName: "المنصور",
      email: "saud@company.sa",
      phone: "0501234567",
      nationalId: "1098765432",
      jobTitle: "مدير مشاريع تقنية",
      department: "إدارة تقنية المعلومات",
      location: "الرياض",
      hireDate: "2026-07-01T08:00:00Z",
      employmentType: "FULL_TIME",
      salary: 24000,
      currency: "SAR",
      managerName: "عبد العزيز آل الشيخ",
      trackingCode: "TX-EMP-001",
    },
  ];

  it("splits full Arabic names correctly into first and last name", () => {
    expect(splitFullName("سعود المنصور")).toEqual({ firstName: "سعود", lastName: "المنصور" });
    expect(splitFullName("محمد عبد الله السالم")).toEqual({ firstName: "محمد", lastName: "عبد الله السالم" });
    expect(splitFullName("سلطان")).toEqual({ firstName: "سلطان", lastName: "جديد" });
  });

  it("generates valid SAP SuccessFactors Employee Central CSV", () => {
    const csv = generateSapSuccessFactorsCsv(sampleEmployees);

    expect(csv).toContain("STATUS,USERID,USERNAME,FIRSTNAME,LASTNAME,EMAIL,JOB_TITLE,DEPARTMENT,LOCATION,HIREDATE,BASE_SALARY,CURRENCY,NATIONAL_ID");
    expect(csv).toContain("ACTIVE");
    expect(csv).toContain("EMP-CAND-ABC");
    expect(csv).toContain('"سعود"');
    expect(csv).toContain('"المنصور"');
    expect(csv).toContain("saud@company.sa");
    expect(csv).toContain('"مدير مشاريع تقنية"');
    expect(csv).toContain("24000");
    expect(csv).toContain("SAR");
    expect(csv).toContain("1098765432");
  });

  it("generates valid Oracle Fusion HCM Cloud Worker.dat (HDL)", () => {
    const hdl = generateOracleHcmDataLoaderHdl(sampleEmployees);

    expect(hdl).toContain("METADATA|Worker|PersonNumber|EffectiveStartDate|FirstName|LastName|EmailAddress|City|Country|NationalId");
    expect(hdl).toContain("MERGE|Worker|PER_CAND-ABC|2026/07/01|سعود|المنصور|saud@company.sa|الرياض|SA|1098765432");
    expect(hdl).toContain("METADATA|WorkTerms|PersonNumber|EffectiveStartDate|ActionCode|LegalEmployerName");
    expect(hdl).toContain("MERGE|WorkTerms|PER_CAND-ABC|2026/07/01|HIRE|TawzeefX Employer");
    expect(hdl).toContain("METADATA|Assignment|PersonNumber|EffectiveStartDate|ActionCode|BusinessUnitShortCode|DepartmentName|JobCode|SalaryAmount");
    expect(hdl).toContain("MERGE|Assignment|PER_CAND-ABC|2026/07/01|HIRE|BU_SAUDI|إدارة تقنية المعلومات|مدير مشاريع تقنية|24000");
  });

  it("generates structured Enterprise REST Handoff JSON payload", () => {
    const json = generateEnterpriseHandoffJson(sampleEmployees[0], {
      targetHris: "sap",
      companyCode: "SA01",
    });

    expect(json.sourceSystem).toBe("TawzeefX_ATS");
    expect(json.targetSystem).toBe("SAP_SuccessFactors_EC");
    expect(json.eventType).toBe("CANDIDATE_HIRED_HANDOFF");

    const empData: any = json.employeeData;
    expect(empData.companyCode).toBe("SA01");
    expect(empData.personalInfo.firstName).toBe("سعود");
    expect(empData.compensationInfo.baseSalary).toBe(24000);
  });

  it("audits candidate readiness for enterprise HRIS handoff accurately", () => {
    const candidates = [
      {
        id: "c-1",
        name: "خالد السالم",
        email: "khaled@test.com",
        phone: "0555555555",
        status: "مقبول",
        role: "مهندس نظم",
      },
      {
        id: "c-2",
        name: "مرشح ناقص",
        email: null,
        phone: null,
        status: "مقبول",
      },
      {
        id: "c-3",
        name: "مرشح مرفوض",
        status: "مرفوض",
      },
    ];

    const report = validateHrisReadiness(candidates);
    expect(report.totalHired).toBe(2);
    expect(report.readyForHandoff).toBe(1);
    expect(report.readinessPercentage).toBe(50);
    expect(report.missingFieldsWarnings.length).toBe(1);
    expect(report.missingFieldsWarnings[0].missing).toContain("البريد الإلكتروني");
  });
});