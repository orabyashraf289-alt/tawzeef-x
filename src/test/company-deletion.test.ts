import { describe, it, expect, beforeEach } from "vitest";

// =========================================================================
// SIMULATION MODELS & DATABASE FOR MULTI-TENANT CASCADE DELETION & AUTH
// =========================================================================

interface CompanyRecord {
  id: string;
  name: string;
  status: "active" | "inactive";
  parent_company_id: string | null;
  owner_user_id?: string | null;
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

interface AuthUserRecord {
  id: string;
  email: string;
  banned: boolean;
  activeSessions: string[];
  user_metadata?: Record<string, any>;
}

interface AuditRecord {
  id: string;
  user_id: string;
  action: string;
  company_id: string | null;
  details: any;
}

class MockMultiTenantSystem {
  companies: CompanyRecord[] = [];
  jobs: JobRecord[] = [];
  members: MemberRecord[] = [];
  candidates: CandidateRecord[] = [];
  authUsers: AuthUserRecord[] = [];
  auditLogs: AuditRecord[] = [];

  reset() {
    this.companies = [
      { id: "comp-tawzeefx", name: "TawzeefX Platform", status: "active", parent_company_id: null },
      { id: "comp-andalus", name: "شركة الأندلس التعليمية", status: "active", parent_company_id: null, owner_user_id: "u-andalus-owner" },
      { id: "comp-andalus-b1", name: "الأندلس - فرع الزهراء", status: "active", parent_company_id: "comp-andalus" },
      { id: "comp-andalus-b2", name: "الأندلس - فرع التحلية", status: "active", parent_company_id: "comp-andalus" },
      { id: "comp-client-b", name: "شركة المستقبل التقنية", status: "active", parent_company_id: null, owner_user_id: "u-future-owner" },
      { id: "comp-client-b-b1", name: "المستقبل - فرع الرياض", status: "active", parent_company_id: "comp-client-b" },
    ];

    this.jobs = [
      { id: "job-platform-1", company_id: "comp-tawzeefx", title: "مهندس منصة رئيسي" },
      { id: "job-and-1", company_id: "comp-andalus", title: "مدير مالي" },
      { id: "job-and-2", company_id: "comp-andalus-b1", title: "معلم علوم اعدادي" },
      { id: "job-and-3", company_id: "comp-andalus-b2", title: "مشرف أكاديمي" },
      { id: "job-fut-1", company_id: "comp-client-b", title: "مطور برمجيات Full Stack" },
    ];

    this.members = [
      { id: "m-p1", company_id: "comp-tawzeefx", user_id: "u-superadmin", role: "owner" },
      { id: "m-a1", company_id: "comp-andalus", user_id: "u-andalus-owner", role: "owner" },
      { id: "m-a2", company_id: "comp-andalus-b1", user_id: "u-andalus-habeeb", role: "recruiter" },
      { id: "m-a3", company_id: "comp-andalus-b2", user_id: "u-multicompany-staff", role: "hr" },
      { id: "m-b1", company_id: "comp-client-b", user_id: "u-future-owner", role: "owner" },
      { id: "m-b2", company_id: "comp-client-b", user_id: "u-multicompany-staff", role: "reviewer" }, // Member of both!
    ];

    this.candidates = [
      { id: "c-1", company_id: "comp-andalus", name: "مرشح أندلس 1" },
      { id: "c-2", company_id: "comp-andalus-b1", name: "مرشح أندلس 2" },
      { id: "c-3", company_id: "comp-client-b", name: "مرشح المستقبل" },
    ];

    this.authUsers = [
      { id: "u-superadmin", email: "tx@tawzeefx.com", banned: false, activeSessions: ["sess-super-1"], user_metadata: { role: "super_admin" } },
      { id: "u-andalus-owner", email: "director@andalus.edu.sa", banned: false, activeSessions: ["sess-and-owner-1"], user_metadata: { role: "admin" } },
      { id: "u-andalus-habeeb", email: "habeeb@tawzeefx.com", banned: false, activeSessions: ["sess-habeeb-1", "sess-habeeb-2"], user_metadata: { role: "recruiter" } },
      { id: "u-multicompany-staff", email: "consultant@multi.sa", banned: false, activeSessions: ["sess-multi-1"], user_metadata: { role: "recruiter" } },
      { id: "u-future-owner", email: "ceo@futuretech.com", banned: false, activeSessions: ["sess-future-1"], user_metadata: { role: "admin" } },
      { id: "u-candidate-1", email: "jobseeker@gmail.com", banned: false, activeSessions: ["sess-cand-1"], user_metadata: { account_type: "candidate" } },
    ];

    this.auditLogs = [];
  }

  isSuperAdmin(userEmail: string): boolean {
    return ["tx@tawzeefx.com", "ctraining801@gmail.com"].includes(userEmail.toLowerCase());
  }

  // =========================================================================
  // LOGIN GATEKEEPER IMPLEMENTATION (mirrors Auth.tsx & CompanyContext.tsx)
  // =========================================================================
  validateLoginGatekeeper(userEmail: string): { allowed: boolean; reason?: string } {
    const authUser = this.authUsers.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    if (!authUser) {
      return { allowed: false, reason: "المستخدم غير مسجل" };
    }

    if (authUser.banned) {
      return {
        allowed: false,
        reason: "تم حذف حساب هذه الشركة نهائياً من منصة Tawzeef-X، ولا يمكن تسجيل الدخول بهذا الحساب.",
      };
    }

    // 1. Super Admin bypass
    if (this.isSuperAdmin(authUser.email) || authUser.user_metadata?.role === "super_admin") {
      return { allowed: true };
    }

    // 2. Candidate bypass
    if (authUser.user_metadata?.account_type === "candidate" || authUser.user_metadata?.account_type === "job_seeker") {
      return { allowed: true };
    }

    // 3. Find tenant company associations
    const memberships = this.members.filter(m => m.user_id === authUser.id);
    const owned = this.companies.filter(c => c.owner_user_id === authUser.id);

    const userCompanyIds = Array.from(new Set([
      ...memberships.map(m => m.company_id),
      ...owned.map(c => c.id),
    ]));

    const userCompanies = this.companies.filter(c => userCompanyIds.includes(c.id));

    // CASE 1: Company deleted permanently (no company association found)
    if (userCompanies.length === 0) {
      return {
        allowed: false,
        reason: "تم حذف حساب هذه الشركة نهائياً من منصة Tawzeef-X، ولا يمكن تسجيل الدخول بهذا الحساب.",
      };
    }

    // CASE 2: Company deactivated (all associated companies are inactive)
    const hasActiveCompany = userCompanies.some(c => c.status === "active");
    if (!hasActiveCompany) {
      return {
        allowed: false,
        reason: "تم إيقاف حساب الشركة مؤقتاً من قِبل إدارة المنصة. يرجى التواصل مع إدارة Tawzeef-X.",
      };
    }

    return { allowed: true };
  }

  // =========================================================================
  // DEACTIVATE COMPANY (Preserves data, blocks login)
  // =========================================================================
  deactivateCompany(companyId: string) {
    const target = this.companies.find(c => c.id === companyId);
    if (!target) throw new Error("Company not found");

    target.status = "inactive";
    // Also deactivate branches
    this.companies
      .filter(c => c.parent_company_id === companyId)
      .forEach(b => { b.status = "inactive"; });

    return { success: true, status: "inactive" };
  }

  // =========================================================================
  // REACTIVATE COMPANY
  // =========================================================================
  reactivateCompany(companyId: string) {
    const target = this.companies.find(c => c.id === companyId);
    if (!target) throw new Error("Company not found");

    target.status = "active";
    this.companies
      .filter(c => c.parent_company_id === companyId)
      .forEach(b => { b.status = "active"; });

    return { success: true, status: "active" };
  }

  // =========================================================================
  // PERMANENT CASCADE DELETION (mirrors delete-company Edge Function + DB RPC)
  // =========================================================================
  deleteCompanyPermanent(targetCompanyId: string, callingUserEmail: string) {
    if (!this.isSuperAdmin(callingUserEmail)) {
      throw new Error("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");
    }

    const target = this.companies.find(c => c.id === targetCompanyId);
    if (!target) {
      throw new Error("Company not found or already deleted");
    }

    if (
      target.id === "comp-tawzeefx" ||
      target.name.toLowerCase().includes("tawzeef") ||
      target.name.includes("توظيف إكس")
    ) {
      throw new Error("Security Restriction: Platform Owner company (" + target.name + ") cannot be deleted");
    }

    // 1. Collect all branches
    const branches = this.companies.filter(c => c.parent_company_id === targetCompanyId);
    const branchIds = branches.map(b => b.id);
    const allCompanyIds = [targetCompanyId, ...branchIds];

    // 2. Identify candidate users
    const associatedMemberUserIds = this.members
      .filter(m => allCompanyIds.includes(m.company_id))
      .map(m => m.user_id);

    const associatedOwnerIds = this.companies
      .filter(c => allCompanyIds.includes(c.id) && c.owner_user_id)
      .map(c => c.owner_user_id!);

    const allCandidateUserIds = Array.from(new Set([...associatedMemberUserIds, ...associatedOwnerIds]));

    let purgedUsersCount = 0;

    // 3. Purge exclusive users, invalidate tokens, protect multi-tenant users
    for (const userId of allCandidateUserIds) {
      const authUser = this.authUsers.find(u => u.id === userId);
      if (!authUser) continue;

      if (this.isSuperAdmin(authUser.email)) continue; // Protect Super Admin

      // Check if user has memberships in other companies outside this deletion scope
      const hasOtherMemberships = this.members.some(
        m => m.user_id === userId && !allCompanyIds.includes(m.company_id)
      );

      if (hasOtherMemberships) {
        // User belongs to other companies; do not delete user from auth
        continue;
      }

      // Exclusive user: Invalidate all sessions and remove/ban from auth
      authUser.activeSessions = [];
      authUser.banned = true;
      purgedUsersCount++;
    }

    // 4. Delete dependent records
    this.candidates = this.candidates.filter(c => !allCompanyIds.includes(c.company_id));
    const deletedJobsCount = this.jobs.filter(j => allCompanyIds.includes(j.company_id)).length;
    this.jobs = this.jobs.filter(j => !allCompanyIds.includes(j.company_id));
    this.members = this.members.filter(m => !allCompanyIds.includes(m.company_id));
    this.companies = this.companies.filter(c => !allCompanyIds.includes(c.id));

    return {
      success: true,
      deleted_company_id: targetCompanyId,
      deleted_company_name: target.name,
      deleted_branches_count: branchIds.length,
      deleted_jobs_count: deletedJobsCount,
      deleted_users_count: purgedUsersCount,
    };
  }
}

// =========================================================================
// TEST SUITE
// =========================================================================

describe("Company Permanent Deletion & Authentication Gatekeeper", () => {
  const system = new MockMultiTenantSystem();

  beforeEach(() => {
    system.reset();
  });

  // -----------------------------------------------------------------------
  // TEST 1: Normal active company login
  // -----------------------------------------------------------------------
  it("allows login for staff belonging to an active company", () => {
    const habeebLogin = system.validateLoginGatekeeper("habeeb@tawzeefx.com");
    expect(habeebLogin.allowed).toBe(true);

    const ownerLogin = system.validateLoginGatekeeper("director@andalus.edu.sa");
    expect(ownerLogin.allowed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TEST 2: Company Deactivation vs Deletion (Deactivate temporarily)
  // -----------------------------------------------------------------------
  it("strictly blocks login when company is deactivated without deleting data", () => {
    // 1. Deactivate Al-Andalus
    system.deactivateCompany("comp-andalus");

    // 2. Attempt login by Habeeb
    const habeebLogin = system.validateLoginGatekeeper("habeeb@tawzeefx.com");
    expect(habeebLogin.allowed).toBe(false);
    expect(habeebLogin.reason).toBe("تم إيقاف حساب الشركة مؤقتاً من قِبل إدارة المنصة. يرجى التواصل مع إدارة Tawzeef-X.");

    // 3. Verify company data still exists in DB
    const andalus = system.companies.find(c => c.id === "comp-andalus");
    expect(andalus).toBeDefined();
    expect(andalus?.status).toBe("inactive");

    const andalusJobs = system.jobs.filter(j => j.company_id.includes("andalus"));
    expect(andalusJobs.length).toBeGreaterThan(0);

    // 4. Reactivate company and verify login works again
    system.reactivateCompany("comp-andalus");
    const reactivatedLogin = system.validateLoginGatekeeper("habeeb@tawzeefx.com");
    expect(reactivatedLogin.allowed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // TEST 3: Permanent Delete completely purges company, users, and blocks login
  // -----------------------------------------------------------------------
  it("permanently deletes customer company and strictly blocks old credentials from logging in", () => {
    // 1. Confirm login works before deletion
    expect(system.validateLoginGatekeeper("habeeb@tawzeefx.com").allowed).toBe(true);
    expect(system.validateLoginGatekeeper("director@andalus.edu.sa").allowed).toBe(true);

    // 2. Platform Owner permanently deletes Al-Andalus
    const result = system.deleteCompanyPermanent("comp-andalus", "tx@tawzeefx.com");
    expect(result.success).toBe(true);
    expect(result.deleted_branches_count).toBe(2);
    expect(result.deleted_jobs_count).toBe(3);
    expect(result.deleted_users_count).toBe(2); // Habeeb + Director

    // 3. Try to log in with Habeeb's credentials
    const habeebAttempt = system.validateLoginGatekeeper("habeeb@tawzeefx.com");
    expect(habeebAttempt.allowed).toBe(false);
    expect(habeebAttempt.reason).toContain("تم حذف حساب هذه الشركة نهائياً من منصة Tawzeef-X");

    // 4. Try to log in with Director's credentials
    const directorAttempt = system.validateLoginGatekeeper("director@andalus.edu.sa");
    expect(directorAttempt.allowed).toBe(false);

    // 5. Verify active sessions were completely invalidated (token revocation)
    const habeebUser = system.authUsers.find(u => u.email === "habeeb@tawzeefx.com");
    expect(habeebUser?.activeSessions).toHaveLength(0);
    expect(habeebUser?.banned).toBe(true);

    // 6. Verify company and its branches and jobs no longer exist
    expect(system.companies.find(c => c.id === "comp-andalus")).toBeUndefined();
    expect(system.companies.find(c => c.id === "comp-andalus-b1")).toBeUndefined();
    expect(system.companies.find(c => c.id === "comp-andalus-b2")).toBeUndefined();
    expect(system.jobs.filter(j => j.company_id.includes("andalus"))).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // TEST 4: Multi-company staff is preserved for other companies
  // -----------------------------------------------------------------------
  it("preserves multi-company user access to other companies while removing deleted company access", () => {
    // consultant@multi.sa belongs to Al-Andalus and Future Tech
    expect(system.validateLoginGatekeeper("consultant@multi.sa").allowed).toBe(true);

    // Delete Al-Andalus
    system.deleteCompanyPermanent("comp-andalus", "tx@tawzeefx.com");

    // Multi-company user should still be able to log in to Future Tech!
    const multiAttempt = system.validateLoginGatekeeper("consultant@multi.sa");
    expect(multiAttempt.allowed).toBe(true);

    const multiUser = system.authUsers.find(u => u.email === "consultant@multi.sa");
    expect(multiUser?.banned).toBe(false);

    // But they have no membership in Al-Andalus
    const remainingMemberships = system.members.filter(m => m.user_id === "u-multicompany-staff");
    expect(remainingMemberships).toHaveLength(1);
    expect(remainingMemberships[0].company_id).toBe("comp-client-b");
  });

  // -----------------------------------------------------------------------
  // TEST 5: Super Admin and Candidates are never banned or blocked
  // -----------------------------------------------------------------------
  it("never deletes or bans Super Admin or Job Seeker accounts", () => {
    // Super Admin login
    expect(system.validateLoginGatekeeper("tx@tawzeefx.com").allowed).toBe(true);

    // Candidate login
    expect(system.validateLoginGatekeeper("jobseeker@gmail.com").allowed).toBe(true);

    // Delete all customer companies
    system.deleteCompanyPermanent("comp-andalus", "tx@tawzeefx.com");
    system.deleteCompanyPermanent("comp-client-b", "tx@tawzeefx.com");

    // Super Admin & Candidate still 100% allowed
    expect(system.validateLoginGatekeeper("tx@tawzeefx.com").allowed).toBe(true);
    expect(system.validateLoginGatekeeper("jobseeker@gmail.com").allowed).toBe(true);

    const superUser = system.authUsers.find(u => u.email === "tx@tawzeefx.com");
    expect(superUser?.banned).toBe(false);
  });

  // -----------------------------------------------------------------------
  // TEST 6: Platform Owner company cannot be deleted
  // -----------------------------------------------------------------------
  it("rejects deletion of the Platform Owner company", () => {
    expect(() => {
      system.deleteCompanyPermanent("comp-tawzeefx", "tx@tawzeefx.com");
    }).toThrow("Security Restriction: Platform Owner company (TawzeefX Platform) cannot be deleted");
  });

  // -----------------------------------------------------------------------
  // TEST 7: Unauthorized users cannot delete companies
  // -----------------------------------------------------------------------
  it("rejects non-super-admin users from executing deletion", () => {
    expect(() => {
      system.deleteCompanyPermanent("comp-andalus", "habeeb@tawzeefx.com");
    }).toThrow("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");

    expect(() => {
      system.deleteCompanyPermanent("comp-andalus", "random@domain.com");
    }).toThrow("Unauthorized: Only Platform Owner / Super Admin can delete customer companies");
  });
});
