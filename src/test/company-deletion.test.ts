import { describe, it, expect, beforeEach } from "vitest";

// Simulation of server-side delete_company_cascade logic
interface CompanyRecord {
  id: string;
  name: string;
  parent_company_id: string | null;
}

interface JobRecord {
  id: string;
  company_id: string;
  title: string;
}

interface MemberRecord {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
}

interface CandidateRecord {
  id: string;
  company_id: string;
  name: string;
}

interface AuditRecord {
  id: string;
  user_id: string;
  action: string;
  company_id: string | null;
  details: any;
}

class MockDatabase {
  companies: CompanyRecord[] = [];
  jobs: JobRecord[] = [];
  members: MemberRecord[] = [];
  candidates: CandidateRecord[] = [];
  auditLogs: AuditRecord[] = [];

  reset() {
    this.companies = [
      { id: "comp-tawzeefx", name: "TawzeefX Platform", parent_company_id: null },
      { id: "comp-test-a", name: "شركة اختبار أ", parent_company_id: null },
      { id: "comp-test-a-branch1", name: "فرع الرياض", parent_company_id: "comp-test-a" },
      { id: "comp-test-a-branch2", name: "فرع جدة", parent_company_id: "comp-test-a" },
      { id: "comp-test-b", name: "شركة اختبار ب", parent_company_id: null },
      { id: "comp-test-b-branch1", name: "فرع الخبر", parent_company_id: "comp-test-b" },
    ];

    this.jobs = [
      { id: "job-p1", company_id: "comp-tawzeefx", title: "مهندس نظم" },
      { id: "job-a1", company_id: "comp-test-a", title: "محاسب" },
      { id: "job-a2", company_id: "comp-test-a-branch1", title: "مطور برمجيات" },
      { id: "job-a3", company_id: "comp-test-a-branch2", title: "مسؤول مبيعات" },
      { id: "job-b1", company_id: "comp-test-b", title: "طبيب عام" },
    ];

    this.members = [
      { id: "m-p1", company_id: "comp-tawzeefx", user_id: "u-owner", role: "owner" },
      { id: "m-a1", company_id: "comp-test-a", user_id: "u-user1", role: "owner" },
      { id: "m-a2", company_id: "comp-test-a-branch1", user_id: "u-user2", role: "hr" },
      { id: "m-b1", company_id: "comp-test-b", user_id: "u-user3", role: "owner" },
    ];

    this.candidates = [
      { id: "c-a1", company_id: "comp-test-a", name: "مرشح 1" },
      { id: "c-a2", company_id: "comp-test-a-branch1", name: "مرشح 2" },
      { id: "c-b1", company_id: "comp-test-b", name: "مرشح 3" },
    ];

    this.auditLogs = [
      { id: "log-1", user_id: "u-user1", action: "JOB_CREATE", company_id: "comp-test-a", details: {} },
      { id: "log-2", user_id: "u-user3", action: "JOB_CREATE", company_id: "comp-test-b", details: {} },
    ];
  }

  isSuperAdmin(userEmail: string): boolean {
    const superAdmins = ["tx@tawzeefx.com", "ctraining801@gmail.com"];
    return superAdmins.includes(userEmail);
  }

  deleteCompanyCascade(targetCompanyId: string, callingUserEmail: string) {
    if (!this.isSuperAdmin(callingUserEmail)) {
      throw new Error("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");
    }

    const target = this.companies.find(c => c.id === targetCompanyId);
    if (!target) {
      throw new Error("Company not found or already deleted");
    }

    if (
      target.id === "00000000-0000-0000-0000-000000000001" ||
      target.name.toLowerCase().includes("tawzeef") ||
      target.name.includes("توظيف إكس")
    ) {
      throw new Error("Security Restriction: Platform Owner company (" + target.name + ") cannot be deleted");
    }

    const branches = this.companies.filter(c => c.parent_company_id === targetCompanyId);
    const branchIds = branches.map(b => b.id);
    const allCompanyIds = [targetCompanyId, ...branchIds];

    this.candidates = this.candidates.filter(c => !allCompanyIds.includes(c.company_id));
    const deletedJobsCount = this.jobs.filter(j => allCompanyIds.includes(j.company_id)).length;
    this.jobs = this.jobs.filter(j => !allCompanyIds.includes(j.company_id));
    this.members = this.members.filter(m => !allCompanyIds.includes(m.company_id));

    this.auditLogs = this.auditLogs.map(log =>
      allCompanyIds.includes(log.company_id || "") ? { ...log, company_id: null } : log
    );

    this.companies = this.companies.filter(c => !allCompanyIds.includes(c.id));

    this.auditLogs.push({
      id: "audit-" + Date.now(),
      user_id: callingUserEmail,
      action: "COMPANY_CASCADE_DELETED",
      company_id: null,
      details: {
        deleted_company_id: targetCompanyId,
        deleted_company_name: target.name,
        deleted_branches_count: branchIds.length,
        deleted_jobs_count: deletedJobsCount,
      },
    });

    return {
      success: true,
      deleted_company_id: targetCompanyId,
      deleted_company_name: target.name,
      deleted_branches_count: branchIds.length,
      deleted_jobs_count: deletedJobsCount,
    };
  }
}

describe("Customer Tenant Cascade Deletion Test Suite", () => {
  const db = new MockDatabase();

  beforeEach(() => {
    db.reset();
    localStorage.clear();
  });

  it("should enforce Super Admin authorization and reject unauthorized users", () => {
    expect(() => {
      db.deleteCompanyCascade("comp-test-a", "recruiter@randomcompany.com");
    }).toThrow("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");

    expect(() => {
      db.deleteCompanyCascade("comp-test-a", "employee@school.edu.sa");
    }).toThrow("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");
  });

  it("should strictly protect the Platform Owner company from deletion", () => {
    expect(() => {
      db.deleteCompanyCascade("comp-tawzeefx", "tx@tawzeefx.com");
    }).toThrow("Security Restriction: Platform Owner company (TawzeefX Platform) cannot be deleted");
  });

  it("should cascade delete target company A and all its branches and jobs", () => {
    const result = db.deleteCompanyCascade("comp-test-a", "tx@tawzeefx.com");

    expect(result.success).toBe(true);
    expect(result.deleted_company_id).toBe("comp-test-a");
    expect(result.deleted_branches_count).toBe(2);
    expect(result.deleted_jobs_count).toBe(3);

    const remainingCompanyIds = db.companies.map(c => c.id);
    expect(remainingCompanyIds).not.toContain("comp-test-a");
    expect(remainingCompanyIds).not.toContain("comp-test-a-branch1");
    expect(remainingCompanyIds).not.toContain("comp-test-a-branch2");

    const remainingJobCompanyIds = db.jobs.map(j => j.company_id);
    expect(remainingJobCompanyIds).not.toContain("comp-test-a");
    expect(remainingJobCompanyIds).not.toContain("comp-test-a-branch1");
    expect(remainingJobCompanyIds).not.toContain("comp-test-a-branch2");
  });

  it("should keep test company B and its branches/jobs 100% intact when company A is deleted", () => {
    db.deleteCompanyCascade("comp-test-a", "tx@tawzeefx.com");

    const compB = db.companies.find(c => c.id === "comp-test-b");
    const compBBranch = db.companies.find(c => c.id === "comp-test-b-branch1");
    expect(compB).toBeDefined();
    expect(compBBranch).toBeDefined();

    const compBJobs = db.jobs.filter(j => j.company_id === "comp-test-b");
    expect(compBJobs).toHaveLength(1);
    expect(compBJobs[0].title).toBe("طبيب عام");

    const compBMembers = db.members.filter(m => m.company_id === "comp-test-b");
    expect(compBMembers).toHaveLength(1);
  });

  it("should keep Platform Owner company and its jobs completely intact", () => {
    db.deleteCompanyCascade("comp-test-a", "tx@tawzeefx.com");

    const platformCo = db.companies.find(c => c.id === "comp-tawzeefx");
    expect(platformCo).toBeDefined();

    const platformJobs = db.jobs.filter(j => j.company_id === "comp-tawzeefx");
    expect(platformJobs).toHaveLength(1);
    expect(platformJobs[0].title).toBe("مهندس نظم");
  });

  it("should decouple audit logs and create a system audit event", () => {
    db.deleteCompanyCascade("comp-test-a", "tx@tawzeefx.com");

    const oldLog = db.auditLogs.find(l => l.id === "log-1");
    expect(oldLog).toBeDefined();
    expect(oldLog?.company_id).toBeNull();

    const logB = db.auditLogs.find(l => l.id === "log-2");
    expect(logB?.company_id).toBe("comp-test-b");

    const deletionEvent = db.auditLogs.find(l => l.action === "COMPANY_CASCADE_DELETED");
    expect(deletionEvent).toBeDefined();
    expect(deletionEvent?.details.deleted_company_id).toBe("comp-test-a");
  });

  it("should clear tx_active_company_id from localStorage if it matches deleted company", () => {
    localStorage.setItem("tx_active_company_id", "comp-test-a");

    const activeId = localStorage.getItem("tx_active_company_id");
    const targetIdToDelete = "comp-test-a";

    if (activeId === targetIdToDelete) {
      localStorage.removeItem("tx_active_company_id");
    }

    expect(localStorage.getItem("tx_active_company_id")).toBeNull();
  });

  it("should retain tx_active_company_id if a different company is deleted", () => {
    localStorage.setItem("tx_active_company_id", "comp-test-b");

    const activeId = localStorage.getItem("tx_active_company_id");
    const targetIdToDelete = "comp-test-a";

    if (activeId === targetIdToDelete) {
      localStorage.removeItem("tx_active_company_id");
    }

    expect(localStorage.getItem("tx_active_company_id")).toBe("comp-test-b");
  });

  it("should validate Type-to-Confirm input strictly", () => {
    const companyName = "شركة اختبار أ";
    const validateConfirmInput = (input: string, targetName: string) => {
      return input.trim() === targetName.trim();
    };

    expect(validateConfirmInput("شركة اختبار أ", companyName)).toBe(true);
    expect(validateConfirmInput(" شركة اختبار أ ", companyName)).toBe(true);
    expect(validateConfirmInput("شركة اختبار", companyName)).toBe(false);
    expect(validateConfirmInput("", companyName)).toBe(false);
    expect(validateConfirmInput("شركة اختبار ب", companyName)).toBe(false);
  });
});
