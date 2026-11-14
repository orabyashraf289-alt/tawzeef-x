import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "supabase/migrations");
const FUNCTIONS_DIR = path.join(ROOT_DIR, "supabase/functions");
const AUDIT_SQL_PATH = path.join(ROOT_DIR, "supabase/audits/pre_release_security_audit.sql");
const SUPABASE_CONFIG_PATH = path.join(ROOT_DIR, "supabase/config.toml");

function stripSqlComments(sql: string, stripSingleQuotedLiterals = false): string {
  let out = "";
  let i = 0;

  while (i < sql.length) {
    // Line comment
    if (sql[i] === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1) break;
      out += "\n";
      i = nl + 1;
      continue;
    }

    // Block comment (supports nesting check minimally via non-greedy end)
    if (sql[i] === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) break;
      out += " ";
      i = end + 2;
      continue;
    }

    // Single-quoted string literal
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      out += stripSingleQuotedLiterals ? "''" : sql.slice(i, j);
      i = j;
      continue;
    }

    out += sql[i];
    i += 1;
  }

  return out;
}

function normalizeTableIdentifier(rawName: string): { schema?: string; table: string } {
  const cleaned = rawName.replace(/"/g, "").trim().toLowerCase();
  const parts = cleaned.split(".");
  if (parts.length === 2) {
    return { schema: parts[0], table: parts[1] };
  }
  return { table: cleaned };
}

function extractCreatedTables(sqlWithoutComments: string): string[] {
  const regex = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/gi;
  const tables: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sqlWithoutComments)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}

function hasRlsEnabledForTable(sqlWithoutComments: string, rawTableName: string): boolean {
  const { schema, table } = normalizeTableIdentifier(rawTableName);
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const schemaPattern = schema
    ? `(?:"?${schema.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"?\\s*\\.\\s*)?`
    : `(?:[a-zA-Z0-9_"]+\\s*\\.\\s*)?`;

  const rlsRegex = new RegExp(
    `\\bALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?${schemaPattern}"?${escapedTable}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\b`,
    "i",
  );
  return rlsRegex.test(sqlWithoutComments);
}

interface ParsedFunctionDef {
  name: string;
  outerHeaderAndOptions: string;
  isSecurityDefiner: boolean;
  hasSetSearchPath: boolean;
}

function extractFunctionDefinitions(sqlWithoutComments: string): ParsedFunctionDef[] {
  const results: ParsedFunctionDef[] = [];
  const fnStartRegex = /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_."]+)\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = fnStartRegex.exec(sqlWithoutComments)) !== null) {
    const name = match[1];
    let i = match.index;
    let outer = "";

    while (i < sqlWithoutComments.length) {
      // Dollar-quoted string / function body
      if (sqlWithoutComments[i] === "$") {
        const tagMatch = sqlWithoutComments.slice(i).match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/);
        if (tagMatch) {
          const tag = tagMatch[0];
          const closeIdx = sqlWithoutComments.indexOf(tag, i + tag.length);
          if (closeIdx !== -1) {
            outer += " ";
            i = closeIdx + tag.length;
            continue;
          }
        }
      }

      // Single-quoted string / function body
      if (sqlWithoutComments[i] === "'") {
        let j = i + 1;
        while (j < sqlWithoutComments.length) {
          if (sqlWithoutComments[j] === "'" && sqlWithoutComments[j + 1] === "'") {
            j += 2;
            continue;
          }
          if (sqlWithoutComments[j] === "'") {
            j += 1;
            break;
          }
          j += 1;
        }
        outer += " ";
        i = j;
        continue;
      }

      if (sqlWithoutComments[i] === ";") {
        break;
      }

      outer += sqlWithoutComments[i];
      i += 1;
    }

    const isSecurityDefiner = /\bSECURITY\s+DEFINER\b/i.test(outer);
    const hasSetSearchPath = /\bSET\s+search_path\b/i.test(outer);

    results.push({
      name,
      outerHeaderAndOptions: outer,
      isSecurityDefiner,
      hasSetSearchPath,
    });

    fnStartRegex.lastIndex = Math.max(fnStartRegex.lastIndex, i + 1);
  }

  return results;
}

describe("Phase 0 & Phase 4 Release Readiness Security Audit", () => {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  describe("1. Global Migration Safety & Naming Invariants", () => {
    it("discovers active SQL migrations with valid unique 14-digit timestamps", () => {
      expect(migrationFiles.length).toBeGreaterThan(0);

      const versions = new Set<string>();
      for (const file of migrationFiles) {
        expect(file).toMatch(/^\d{14}_.+\.sql$/);
        const version = file.slice(0, 14);
        expect(versions.has(version)).toBe(false);
        versions.add(version);
      }
    });

    it("ensures NO active migration executes DELETE FROM auth.users (matches CI guard)", () => {
      const violations: string[] = [];

      for (const file of migrationFiles) {
        const rawSql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
        const strippedSql = stripSqlComments(rawSql);

        if (/\bDELETE\s+FROM\s+auth\.users\b/i.test(rawSql) || /\bDELETE\s+FROM\s+auth\.users\b/i.test(strippedSql)) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });

    it("verifies public.is_super_admin uses platform_roles only and delete_company_permanently is service_role-only", () => {
      const superAdminFiles = migrationFiles.filter((f) =>
        fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8").includes("FUNCTION public.is_super_admin("),
      );
      expect(superAdminFiles.length).toBeGreaterThan(0);

      const latestSuperAdminSql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, superAdminFiles[superAdminFiles.length - 1]),
        "utf-8",
      );
      expect(latestSuperAdminSql).toContain("public.platform_roles");
      expect(latestSuperAdminSql).not.toMatch(/user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com/i);

      const deleteCompanyFiles = migrationFiles.filter((f) =>
        fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8").includes("delete_company_permanently"),
      );
      expect(deleteCompanyFiles.length).toBeGreaterThan(0);

      const latestDeleteMigration = fs.readFileSync(
        path.join(MIGRATIONS_DIR, deleteCompanyFiles[deleteCompanyFiles.length - 1]),
        "utf-8",
      );
      expect(latestDeleteMigration).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.delete_company_permanently\(uuid,\s*uuid\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i,
      );
      expect(latestDeleteMigration).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.delete_company_permanently\(uuid,\s*uuid\)\s+TO\s+service_role/i,
      );
    });
  });

  describe("2. Phase 1/2/4 Migration RLS & SECURITY DEFINER Invariants (20261113170001*-20261113170003*)", () => {
    const phaseMigrations = migrationFiles.filter((f) => /^2026111317000[123].*\.sql$/.test(f));

    it("includes all Phase 1/2/4 migrations (20261113170001*, 20261113170002*, 20261113170003*)", () => {
      expect(phaseMigrations.some((f) => f.startsWith("20261113170001"))).toBe(true);
      expect(phaseMigrations.some((f) => f.startsWith("20261113170002"))).toBe(true);
      expect(phaseMigrations.some((f) => f.startsWith("20261113170003"))).toBe(true);
    });

    it("enables RLS on every table created by 20261113170001*/02*/03* migrations", () => {
      const missingRls: Array<{ file: string; table: string }> = [];

      for (const file of phaseMigrations) {
        const rawSql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
        const cleanSql = stripSqlComments(rawSql);
        const createdTables = extractCreatedTables(cleanSql);

        for (const table of createdTables) {
          if (!hasRlsEnabledForTable(cleanSql, table)) {
            missingRls.push({ file, table });
          }
        }
      }

      expect(missingRls).toEqual([]);
    });

    it("pins SET search_path on every SECURITY DEFINER function in 20261113170001*/02*/03* migrations", () => {
      const missingSearchPath: Array<{ file: string; fn: string }> = [];

      for (const file of phaseMigrations) {
        const rawSql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
        const cleanSql = stripSqlComments(rawSql);
        const functions = extractFunctionDefinitions(cleanSql);

        for (const fn of functions) {
          if (fn.isSecurityDefiner && !fn.hasSetSearchPath) {
            missingSearchPath.push({ file, fn: fn.name });
          }
        }
      }

      expect(missingSearchPath).toEqual([]);
    });

    it("enforces PDPL/GDPR schema bounds and strict tenant admin / super_admin RLS on company_retention_policies", () => {
      const retentionSql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "20261113170003_data_retention_policies.sql"),
        "utf-8",
      );
      const cleanSql = stripSqlComments(retentionSql);

      expect(cleanSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.company_retention_policies/i);
      expect(cleanSql).toMatch(/company_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.companies\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i);
      expect(cleanSql).toMatch(/UNIQUE\s*\(\s*company_id\s*\)/i);
      expect(cleanSql).toMatch(/candidate_retention_days\s+integer\s+NOT\s+NULL\s+DEFAULT\s+365\s+CHECK\s*\(\s*candidate_retention_days\s+BETWEEN\s+30\s+AND\s+3650\s*\)/i);
      expect(cleanSql).toMatch(/rejected_application_days\s+integer\s+NOT\s+NULL\s+DEFAULT\s+180\s+CHECK\s*\(\s*rejected_application_days\s+BETWEEN\s+30\s+AND\s+1825\s*\)/i);
      expect(cleanSql).toMatch(/audit_log_retention_days\s+integer\s+NOT\s+NULL\s+DEFAULT\s+730\s+CHECK\s*\(\s*audit_log_retention_days\s+BETWEEN\s+90\s+AND\s+3650\s*\)/i);
      expect(cleanSql).toMatch(/auto_anonymize_enabled\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i);

      // Strict tenant admin & super_admin checks, no blanket USING (true) or legacy admin leaks
      expect(cleanSql).toContain("public.is_super_admin");
      expect(cleanSql).toContain("public.company_members");
      expect(cleanSql).toMatch(/member_role\s+IN\s*\(\s*'owner'\s*,\s*'admin'\s*\)/i);
      expect(cleanSql).not.toMatch(/USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\)/i);
      expect(cleanSql).not.toMatch(/has_role\s*\(/i);
      expect(cleanSql).not.toMatch(/user_metadata/i);
      expect(retentionSql).not.toMatch(/\bDELETE\s+FROM\s+auth\.users\b/i);
    });
  });

  describe("3. Edge Function Fail-Closed Authorization (delete-company & resolve-tenant-route)", () => {
    const deleteCompanyCode = fs.readFileSync(
      path.join(FUNCTIONS_DIR, "delete-company/index.ts"),
      "utf-8",
    );
    const resolveTenantRouteCode = fs.readFileSync(
      path.join(FUNCTIONS_DIR, "resolve-tenant-route/index.ts"),
      "utf-8",
    );
    const configToml = fs.readFileSync(SUPABASE_CONFIG_PATH, "utf-8");

    it("enforces verify_jwt = true in supabase/config.toml for both critical Edge Functions", () => {
      expect(configToml).toMatch(/\[functions\.delete-company\]\s*\r?\nverify_jwt\s*=\s*true/);
      expect(configToml).toMatch(/\[functions\.resolve-tenant-route\]\s*\r?\nverify_jwt\s*=\s*true/);
    });

    it("enforces fail-closed platform_roles super_admin authorization in delete-company/index.ts", () => {
      // Must require Authorization header and verify JWT via auth.getUser() using anonKey (not serviceKey bypass)
      expect(deleteCompanyCode).toMatch(/const\s+authHeader\s*=\s*req\.headers\.get\(\s*["']Authorization["']\s*\)/);
      expect(deleteCompanyCode).toMatch(/status:\s*401/);
      expect(deleteCompanyCode).toMatch(/createClient\(\s*supabaseUrl\s*,\s*anonKey\s*,/);
      expect(deleteCompanyCode).toMatch(/userClient\.auth\.getUser\(\)/);

      // Must verify caller against public.platform_roles for role === "super_admin"
      expect(deleteCompanyCode).toMatch(/\.from\(\s*["']platform_roles["']\s*\)/);
      expect(deleteCompanyCode).toMatch(/platformRole\?\.role\s*!==\s*["']super_admin["']/);
      expect(deleteCompanyCode).toMatch(/status:\s*403/);

      // Must NOT trust user_metadata, user_roles.admin, or hardcoded admin emails for authorization
      expect(deleteCompanyCode).not.toMatch(/tx@tawzeefx\.com|ctraining801@gmail\.com/i);
      expect(deleteCompanyCode).not.toMatch(/user_metadata\?\.role/);

      // Must protect platform owner company and call delete_company_permanently RPC via service-role client
      expect(deleteCompanyCode).toContain("is_platform_company === true");
      expect(deleteCompanyCode).toContain('"delete_company_permanently"');
    });

    it("enforces fail-closed auth, no anonKey/serviceKey bypass, and membership/platform_roles check in resolve-tenant-route/index.ts", () => {
      // Must reject missing token, token === anonKey, token === serviceKey, and anonymous users
      expect(resolveTenantRouteCode).toMatch(/token\s*===\s*anonKey\s*\|\|\s*token\s*===\s*serviceKey/);
      expect(resolveTenantRouteCode).toMatch(/authError\s*\|\|\s*!user\s*\|\|\s*user\.is_anonymous/);
      expect(resolveTenantRouteCode).toMatch(/reply\(\s*401\s*,\s*\{\s*code:\s*["']AUTH_REQUIRED["']\s*\}\s*\)/);

      // Must validate active company & active parent company
      expect(resolveTenantRouteCode).toMatch(/company\.status\s*!==\s*["']active["']/);
      expect(resolveTenantRouteCode).toMatch(/parent\.status\s*!==\s*["']active["']/);

      // Must check company_members OR platform_roles super_admin and fail closed with 403 TENANT_ACCESS_DENIED
      expect(resolveTenantRouteCode).toMatch(/\.from\(\s*["']company_members["']\s*\)/);
      expect(resolveTenantRouteCode).toMatch(/\.from\(\s*["']platform_roles["']\s*\)/);
      expect(resolveTenantRouteCode).toMatch(/\.eq\(\s*["']role["']\s*,\s*["']super_admin["']\s*\)/);
      expect(resolveTenantRouteCode).toMatch(/!memberships\?\.length\s*&&\s*!adminRole/);
      expect(resolveTenantRouteCode).toMatch(/reply\(\s*403\s*,\s*\{\s*code:\s*["']TENANT_ACCESS_DENIED["']\s*\}\s*\)/);

      // Must fail closed on registry decision and catch errors (503 / 500)
      expect(resolveTenantRouteCode).toMatch(/decideTenantRoute/);
      expect(resolveTenantRouteCode).toMatch(/reply\(\s*503\s*,/);
      expect(resolveTenantRouteCode).toMatch(/reply\(\s*500\s*,/);
      expect(resolveTenantRouteCode).not.toContain("database_ref");
    });
  });

  describe("4. Pre-Release Read-Only Audit Script Integrity", () => {
    it("exists, is strictly read-only, and covers all required audit sections", () => {
      expect(fs.existsSync(AUDIT_SQL_PATH)).toBe(true);
      const rawSql = fs.readFileSync(AUDIT_SQL_PATH, "utf-8");
      const executableSql = stripSqlComments(rawSql, true);

      expect(executableSql).not.toMatch(
        /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COPY|VACUUM)\b/i,
      );

      expect(rawSql).toContain("legacy_candidate_links");
      expect(rawSql).toContain("platform_roles_and_admin_checks");
      expect(rawSql).toContain("legacy_rls_admin_policies");
      expect(rawSql).toContain("orphaned_memberships_and_tenants");
      expect(rawSql).toContain("assessment_attempts_sanity");
      expect(rawSql).toContain("booking_slots_sanity");
      expect(rawSql).toContain("hiring_private.assessment_attempts");
      expect(rawSql).toContain("hiring_private.booking_slots");
    });
  });
});
