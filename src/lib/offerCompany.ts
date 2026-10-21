/** Choose the tenant of linked hiring records before creating an offer. */
export function resolveOfferCompanyId({
  candidateCompanyId,
  jobCompanyId,
  activeCompanyId,
}: {
  candidateCompanyId?: string | null;
  jobCompanyId?: string | null;
  activeCompanyId?: string | null;
}): string | null {
  if (candidateCompanyId && jobCompanyId && candidateCompanyId !== jobCompanyId) {
    throw new Error("الوظيفة والمرشح تابعان لشركتين مختلفتين");
  }
  return candidateCompanyId || jobCompanyId || activeCompanyId || null;
}
