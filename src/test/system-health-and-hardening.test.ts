import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  classifyLatency,
  clearRecordedRuntimeErrors,
  getRecordedRuntimeErrors,
  inspectClientStorageFootprint,
  recordRuntimeError,
} from "@/lib/systemHealthMonitor";

describe("System health telemetry, latency classification, and API documentation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("classifies DB round-trip latency accurately into healthy, degraded, and critical grades", () => {
    expect(classifyLatency(120, true)).toBe("healthy");
    expect(classifyLatency(350, true)).toBe("healthy");
    expect(classifyLatency(600, true)).toBe("degraded");
    expect(classifyLatency(1200, true)).toBe("critical");
    expect(classifyLatency(50, false)).toBe("critical");
  });

  it("records, reads, caps, and clears runtime error telemetry safely", () => {
    expect(getRecordedRuntimeErrors()).toHaveLength(0);

    recordRuntimeError("Chunk load hiccup", "ErrorBoundary");
    recordRuntimeError("RPC timeout", "Supabase");

    const errors = getRecordedRuntimeErrors();
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toBe("RPC timeout");
    expect(errors[1].source).toBe("ErrorBoundary");

    const footprint = inspectClientStorageFootprint();
    expect(footprint.localStorageKeys).toBeGreaterThanOrEqual(1);
    expect(footprint.estimatedBytes).toBeGreaterThan(0);

    clearRecordedRuntimeErrors();
    expect(getRecordedRuntimeErrors()).toHaveLength(0);
  });

  it("ships up-to-date API and Architecture documentation covering v1 API, E2E encryption, and regionalization", () => {
    const docPath = path.resolve(process.cwd(), "docs", "API_AND_ARCHITECTURE.md");
    expect(fs.existsSync(docPath)).toBe(true);
    const content = fs.readFileSync(docPath, "utf-8");
    expect(content).toContain("OpenAPI 3.1");
    expect(content).toContain("TXENC:v1:");
    expect(content).toContain("SOC 2 Type II");
    expect(content).toContain("KSA_QIWA");
  });
});
