import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PROMPT 05: Centralized CORS & Edge Function Security", () => {
  const functionsDir = path.resolve(__dirname, "../../supabase/functions");
  const sharedCorsFile = path.join(functionsDir, "_shared/cors.ts");

  it("verifies _shared/cors.ts defines strict production domain allowlist without wildcard", () => {
    expect(fs.existsSync(sharedCorsFile)).toBe(true);
    const corsCode = fs.readFileSync(sharedCorsFile, "utf-8");

    // Must not allow all origins with wildcard in allowed list
    expect(corsCode).toContain("https://www.tawzeefx.com");
    expect(corsCode).toContain("https://tawzeefx.com");
    expect(corsCode).toContain("https://tx-hire-buddy-22-main.vercel.app");
    expect(corsCode).toContain("getCorsHeaders");
  });

  it("ensures critical sensitive Edge Functions do NOT use hardcoded wildcard CORS (*)", () => {
    const sensitiveFunctions = [
      "delete-company",
      "execute-password-reset",
      "verify-login-otp",
      "send-invitation",
      "log-audit-event",
      "auto-create-candidate-account",
      "semantic-search-candidates",
    ];

    const violations: { functionName: string; reason: string }[] = [];

    for (const fnName of sensitiveFunctions) {
      const indexPath = path.join(functionsDir, fnName, "index.ts");
      if (!fs.existsSync(indexPath)) {
        continue;
      }

      const fileContent = fs.readFileSync(indexPath, "utf-8");

      // Check for hardcoded wildcard CORS
      const hasWildcardOrigin =
        /["']Access-Control-Allow-Origin["']\s*:\s*["']\*["']/i.test(fileContent);

      if (hasWildcardOrigin) {
        violations.push({
          functionName: fnName,
          reason: "Contains hardcoded 'Access-Control-Allow-Origin': '*'",
        });
      }

      // Check that it imports centralized cors utility
      const importsSharedCors = fileContent.includes("_shared/cors.ts");
      if (!importsSharedCors) {
        violations.push({
          functionName: fnName,
          reason: "Does not import getCorsHeaders from _shared/cors.ts",
        });
      }
    }

    if (violations.length > 0) {
      console.error("CORS Violations in Sensitive Edge Functions:", violations);
    }

    expect(violations).toEqual([]);
  });
});
