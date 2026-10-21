import type { JobCustomSpecs } from "./jobSpecsHelper";

interface JobIdentity {
  school_name?: unknown;
  companies?: { name?: unknown } | null;
}

/** Prefer the employer explicitly named on this vacancy over the account name. */
export function getPublicJobEmployerName(job: JobIdentity | null, specs: JobCustomSpecs): string {
  for (const name of [specs.school_name, job?.school_name, job?.companies?.name]) {
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "جهة التوظيف";
}
