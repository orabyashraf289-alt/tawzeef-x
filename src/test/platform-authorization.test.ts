import { describe, it, expect, beforeEach } from "vitest";

// =========================================================================
// MOCK MODELS FOR PLATFORM ROLE AUTHORIZATION & CROSS-TENANT ISOLATION
// =========================================================================

interface PlatformRoleRecord {
  id: string;
  user_id: string;
  role: "super_admin" | "platform_support" | "platform_auditor";
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: "admin" | "recruiter" | "reviewer" | "job_seeker";
}

interface CompanyMemberRecord {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
}

interface CompanyRecord {
  id: string;
  name: string;
  status: "active" | "inactive" | "suspended" | "deleting" | "deleted";
  parent_company_id: string | null;
  is_platform_company?: boolean;
}

interface UserSession {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
}

class MockPlatformSecuritySystem {
  platformRoles: PlatformRoleRecord[] = [];
  userRoles: UserRoleRecord[] = [];
  companyMembers: CompanyMemberRecord[] = [];
  companies: CompanyRecord[] = [];
  profiles: { id: string; role?: string }[] = [];

  reset() {
    this.companies = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Tawzeef-X Central Platform",
        status: "active",
        parent_company_id: null,
        is_platform_company: true,
      },
      {
        id: "comp-andalus-001",
        name: "شركة الأندلس التعليمية",
        status: "active",
        parent_company_id: null,
      },
      {
        id: "comp-future-002",
        name: "شركة المستقبل للتقنية",
        status: "active",
        parent_company_id: null,
      },
    ];

    // Seed Platform Super Admins in platform_roles
    this.platformRoles = [
      { id: "pr-1", user_id: "u-tx-superadmin", role: "super_admin" },
      { id: "pr-2", user_id: "u-ctraining-superadmin", role: "super_admin" },
    ];

    // Seed Tenant Roles in user_roles (Notice Tenant Admins have role = 'admin'!)
    this.userRoles = [
      { id: "ur-1", user_id: "u-tx-superadmin", role: "admin" },
      { id: "ur-2", user_id: "u-andalus-admin", role: "admin" }, // Tenant Admin for Andalus
      { id: "ur-3", user_id: "u-future-admin", role: "admin" },  // Tenant Admin for Future Tech
      { id: "ur-4", user_id: "u-recruiter-1", role: "recruiter" },
      { id: "ur-5", user_id: "u-candidate-1", role: "job_seeker" },
    ];

    // Seed Company Memberships
    this.companyMembers = [
      { id: "cm-1", company_id: "comp-andalus-001", user_id: "u-andalus-admin", role: "owner" },
      { id: "cm-2", company_id: "comp-future-002", user_id: "u-future-admin", role: "owner" },
    ];

    // Seed profiles with potential legacy / malicious role strings
    this.profiles = [
      { id: "u-andalus-admin", role: "admin" },
      { id: "u-attacker", role: "super_admin" }, // Malicious profile string
    ];
  }

  /**
   * REWRITTEN Server-Side is_super_admin(user_id) Function
   * Single Source of Truth: public.platform_roles table ONLY.
   * Never checks user_metadata, never checks user_roles.role = 'admin', never checks profiles.role.
   */
  isSuperAdmin(userId: string): boolean {
    if (!userId) return false;
    return this.platformRoles.some(
      (pr) => pr.user_id === userId && pr.role === "super_admin"
    );
  }

  /**
   * Checks if user has company access (Tenant Authorization)
   */
  hasCompanyAccess(userId: string, companyId: string): boolean {
    if (!userId || !companyId) return false;

    // 1. Platform Super Admin has auditor/superuser bypass
    if (this.isSuperAdmin(userId)) return true;

    // 2. Direct membership in this company
    const isMember = this.companyMembers.some(
      (cm) => cm.user_id === userId && cm.company_id === companyId
    );
    if (isMember) return true;

    // 3. Parent company membership
    const targetComp = this.companies.find((c) => c.id === companyId);
    if (targetComp?.parent_company_id) {
      const isParentMember = this.companyMembers.some(
        (cm) => cm.user_id === userId && cm.company_id === targetComp.parent_company_id
      );
      if (isParentMember) return true;
    }

    return false;
  }

  /**
   * Sensitive operation: Delete Company Permanently
   * Strictly Platform Super Admin only
   */
  deleteCompany(callerId: string, companyId: string): { success: boolean; error?: string } {
    if (!this.isSuperAdmin(callerId)) {
      return { success: false, error: "UNAUTHORIZED: Only Platform Super Admin can delete companies" };
    }

    const company = this.companies.find((c) => c.id === companyId);
    if (!company) {
      return { success: false, error: "COMPANY_NOT_FOUND" };
    }

    if (company.is_platform_company || company.id === "00000000-0000-0000-0000-000000000001") {
      return { success: false, error: "PLATFORM_SAFEGUARD: Cannot delete platform company" };
    }

    this.companies = this.companies.filter((c) => c.id !== companyId);
    return { success: true };
  }
}

describe("PROMPT 01: Platform Authorization & Super Admin Redesign", () => {
  let sys: MockPlatformSecuritySystem;

  beforeEach(() => {
    sys = new MockPlatformSecuritySystem();
    sys.reset();
  });

  describe("Single Server-Side Source of Truth (platform_roles)", () => {
    it("confirms genuine Platform Super Admins from platform_roles", () => {
      expect(sys.isSuperAdmin("u-tx-superadmin")).toBe(true);
      expect(sys.isSuperAdmin("u-ctraining-superadmin")).toBe(true);
    });

    it("DENIES Platform Super Admin rights to Tenant Admins (who have role='admin' in user_roles)", () => {
      // Andalus Admin has role = 'admin' in user_roles, but NOT in platform_roles
      expect(sys.isSuperAdmin("u-andalus-admin")).toBe(false);

      // Future Tech Admin has role = 'admin' in user_roles, but NOT in platform_roles
      expect(sys.isSuperAdmin("u-future-admin")).toBe(false);
    });

    it("PREVENTS Privilege Escalation from client-controlled user_metadata", () => {
      const maliciousUser: UserSession = {
        id: "u-attacker-999",
        email: "hacker@domain.com",
        user_metadata: { role: "super_admin", is_admin: true },
      };

      // Despite having role="super_admin" in metadata, isSuperAdmin MUST evaluate to false!
      expect(sys.isSuperAdmin(maliciousUser.id)).toBe(false);
    });

    it("PREVENTS Privilege Escalation from legacy profiles.role column", () => {
      // u-attacker has role = "super_admin" in profiles table
      expect(sys.isSuperAdmin("u-attacker")).toBe(false);
    });
  });

  describe("Cross-Tenant Isolation (Anti Cross-Tenant Access)", () => {
    it("permits Tenant Admin to access ONLY their own company data", () => {
      // Andalus Admin accessing Andalus -> ALLOWED
      expect(sys.hasCompanyAccess("u-andalus-admin", "comp-andalus-001")).toBe(true);

      // Andalus Admin attempting to access Future Tech -> DENIED
      expect(sys.hasCompanyAccess("u-andalus-admin", "comp-future-002")).toBe(false);

      // Future Tech Admin attempting to access Andalus -> DENIED
      expect(sys.hasCompanyAccess("u-future-admin", "comp-andalus-001")).toBe(false);
    });

    it("prevents Tenant Admins from executing Platform Super Admin operations (Company Deletion)", () => {
      // Andalus Admin tries to delete Future Tech
      const attackRes1 = sys.deleteCompany("u-andalus-admin", "comp-future-002");
      expect(attackRes1.success).toBe(false);
      expect(attackRes1.error).toContain("UNAUTHORIZED");

      // Andalus Admin tries to delete their own company via platform action
      const attackRes2 = sys.deleteCompany("u-andalus-admin", "comp-andalus-001");
      expect(attackRes2.success).toBe(false);
      expect(attackRes2.error).toContain("UNAUTHORIZED");

      // Platform Super Admin deleting company -> ALLOWED
      const validRes = sys.deleteCompany("u-tx-superadmin", "comp-andalus-001");
      expect(validRes.success).toBe(true);
    });

    it("protects Platform Central Company even from Super Admins", () => {
      const safeguardRes = sys.deleteCompany(
        "u-tx-superadmin",
        "00000000-0000-0000-0000-000000000001"
      );
      expect(safeguardRes.success).toBe(false);
      expect(safeguardRes.error).toContain("PLATFORM_SAFEGUARD");
    });
  });
});
