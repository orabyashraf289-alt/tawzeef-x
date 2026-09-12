import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  PUBLIC_ROUTES,
  PLATFORM_ADMIN_ROUTES,
  CANDIDATE_ROUTES,
  SCREEN_PERMISSIONS,
  ACTION_PERMISSIONS,
  isPublicRoute,
  isPlatformAdminRoute,
  isCandidateRoute,
  matchRoutePattern,
  evaluateScreenAccess,
  evaluateActionPermission,
} from "@/lib/permissionsRegistry";

describe("Permissions Registry & Deny-by-Default Architecture (PROMPT 03)", () => {
  describe("App.tsx Comprehensive Route Coverage Scan", () => {
    it("ensures EVERY protected and public route in App.tsx is explicitly registered in permissionsRegistry.ts", () => {
      const appTsxPath = path.resolve(__dirname, "../App.tsx");
      const appContent = fs.readFileSync(appTsxPath, "utf-8");

      // Extract all <Route path="..." ... /> patterns from App.tsx
      const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
      const discoveredRoutes: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = routeRegex.exec(appContent)) !== null) {
        const routePath = match[1];
        if (routePath !== "*") {
          discoveredRoutes.push(routePath);
        }
      }

      expect(discoveredRoutes.length).toBeGreaterThan(20);

      const unregisteredRoutes: string[] = [];

      for (const route of discoveredRoutes) {
        const isPublic = PUBLIC_ROUTES.some((p) => matchRoutePattern(p, route));
        const isPlatform = PLATFORM_ADMIN_ROUTES.some((p) => matchRoutePattern(p, route));
        const isCandidate = CANDIDATE_ROUTES.some((p) => matchRoutePattern(p, route));
        const isScreenProtected = Object.keys(SCREEN_PERMISSIONS).some((p) => matchRoutePattern(p, route));

        if (!isPublic && !isPlatform && !isCandidate && !isScreenProtected) {
          unregisteredRoutes.push(route);
        }
      }

      if (unregisteredRoutes.length > 0) {
        console.error("Unregistered routes found in App.tsx:", unregisteredRoutes);
      }

      // Zero Tolerance: No unregistered route can exist in App.tsx
      expect(unregisteredRoutes).toEqual([]);
    });
  });

  describe("Deny-by-Default Access Evaluation", () => {
    it("DENIES access to unknown or unregistered routes by default", () => {
      const access = evaluateScreenAccess({
        pathname: "/hidden-internal-debug-portal",
        role: "admin",
        isPlatformSuperAdmin: false,
      });

      expect(access).toBe(false);
    });

    it("DENIES access if permissions query is loading (Fail-Closed)", () => {
      const access = evaluateScreenAccess({
        pathname: "/dashboard",
        role: "admin",
        isPlatformSuperAdmin: false,
        isLoading: true,
      });

      expect(access).toBe(false);
    });

    it("DENIES access if permissions query resulted in an error (Fail-Closed)", () => {
      const access = evaluateScreenAccess({
        pathname: "/dashboard",
        role: "admin",
        isPlatformSuperAdmin: false,
        isError: true,
      });

      expect(access).toBe(false);
    });

    it("ALLOWS public routes for any unauthenticated caller", () => {
      expect(isPublicRoute("/")).toBe(true);
      expect(isPublicRoute("/auth")).toBe(true);
      expect(isPublicRoute("/pricing")).toBe(true);
      expect(isPublicRoute("/about")).toBe(true);
      expect(isPublicRoute("/apply/123-abc")).toBe(true);

      const access = evaluateScreenAccess({
        pathname: "/pricing",
        role: null,
        isPlatformSuperAdmin: false,
      });
      expect(access).toBe(true);
    });

    it("RESTRICTS platform admin routes exclusively to verified Platform Super Admins", () => {
      const platformRoutes = [
        "/admin/companies",
        "/admin/companies/123",
        "/admin/agencies",
        "/admin/quality",
        "/admin/blog",
        "/roadmap",
      ];

      for (const pRoute of platformRoutes) {
        // Tenant Admin MUST BE DENIED
        const tenantAdminAccess = evaluateScreenAccess({
          pathname: pRoute,
          role: "admin",
          isPlatformSuperAdmin: false,
        });
        expect(tenantAdminAccess).toBe(false);

        // Platform Super Admin MUST BE ALLOWED
        const superAdminAccess = evaluateScreenAccess({
          pathname: pRoute,
          role: "admin",
          isPlatformSuperAdmin: true,
        });
        expect(superAdminAccess).toBe(true);
      }
    });

    it("evaluates role restrictions based on DB permissions or strict code-level defaults", () => {
      // Reviewer trying to access team management
      const reviewerAccessTeam = evaluateScreenAccess({
        pathname: "/team",
        role: "reviewer",
        isPlatformSuperAdmin: false,
      });
      expect(reviewerAccessTeam).toBe(false);

      // Tenant Admin accessing team management
      const adminAccessTeam = evaluateScreenAccess({
        pathname: "/team",
        role: "admin",
        isPlatformSuperAdmin: false,
      });
      expect(adminAccessTeam).toBe(true);
    });
  });

  describe("Deny-by-Default Action Evaluation", () => {
    it("DENIES action.company.delete to Tenant Admins, allows ONLY Platform Super Admins", () => {
      const tenantAdminAllowed = evaluateActionPermission({
        actionKey: "action.company.delete",
        role: "admin",
        isPlatformSuperAdmin: false,
      });
      expect(tenantAdminAllowed).toBe(false);

      const superAdminAllowed = evaluateActionPermission({
        actionKey: "action.company.delete",
        role: "admin",
        isPlatformSuperAdmin: true,
      });
      expect(superAdminAllowed).toBe(true);
    });

    it("DENIES unknown actions by default", () => {
      const result = evaluateActionPermission({
        actionKey: "action.unknown.sensitive.operation",
        role: "admin",
        isPlatformSuperAdmin: false,
      });
      expect(result).toBe(false);
    });
  });
});
