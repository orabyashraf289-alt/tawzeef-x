/**
 * Candidate Deduplication & Smart Profile Merging Engine
 * Accurately detects and resolves duplicate candidate profiles across channels.
 */

export interface CandidateDeduplicationItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_id?: string | null;
  role?: string | null;
  stage?: string | null;
  status?: string | null;
  experience?: string | null;
  resume_url?: string | null;
  skills?: string[] | null;
  summary?: string | null;
  source?: string | null;
  tracking_code?: string | null;
  created_at?: string;
  ai_score?: number | null;
  rating?: number | null;
}

export interface DuplicateGroup {
  id: string;
  primaryCandidate: CandidateDeduplicationItem;
  duplicates: CandidateDeduplicationItem[];
  matchReason: string;
  confidence: number;
}

/**
 * Normalizes phone numbers by stripping country codes, spaces, dashes, and leading zeros
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");
  // Strip leading 00 or + if present in digits
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Strip 966 country code for Saudi numbers
  if (digits.startsWith("966") && digits.length >= 11) {
    digits = digits.slice(3);
  }
  // Strip leading 0
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Normalizes email address by trimming and lowercasing
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Computes token similarity between two Arabic or English names
 */
export function computeNameSimilarity(nameA?: string | null, nameB?: string | null): number {
  if (!nameA || !nameB) return 0;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .trim();

  const strA = clean(nameA);
  const strB = clean(nameB);

  if (strA === strB) return 1.0;

  // Unify common Arabic compounds like "عبد الله" vs "عبدالله"
  const unifyCompound = (s: string) => s.replace(/عبد\s+/g, "عبد");
  const compA = unifyCompound(strA);
  const compB = unifyCompound(strB);

  if (compA === compB) return 1.0;

  const noSpaceA = compA.replace(/\s+/g, "");
  const noSpaceB = compB.replace(/\s+/g, "");
  if (noSpaceA === noSpaceB) return 0.95;

  const tokensA = new Set(compA.split(/\s+/).filter((t) => t.length > 1));
  const tokensB = new Set(compB.split(/\s+/).filter((t) => t.length > 1));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Scans candidate list and returns grouped duplicates with match reasons and confidence
 */
export function detectCandidateDuplicates(candidates: CandidateDeduplicationItem[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const visitedIds = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const c1 = candidates[i];
    if (visitedIds.has(c1.id)) continue;

    const email1 = normalizeEmail(c1.email);
    const phone1 = normalizePhoneNumber(c1.phone);
    const matchedDuplicates: CandidateDeduplicationItem[] = [];
    let bestReason = "";
    let maxConfidence = 0;

    for (let j = i + 1; j < candidates.length; j++) {
      const c2 = candidates[j];
      if (visitedIds.has(c2.id)) continue;

      const email2 = normalizeEmail(c2.email);
      const phone2 = normalizePhoneNumber(c2.phone);
      const nameSim = computeNameSimilarity(c1.name, c2.name);

      let isMatch = false;
      let reason = "";
      let confidence = 0;

      // 1. Exact Email match (highest confidence)
      if (email1 && email2 && email1 === email2) {
        isMatch = true;
        reason = "تطابق كامل في البريد الإلكتروني (100%)";
        confidence = 100;
      }
      // 2. Exact Phone match (>= 8 digits)
      else if (phone1 && phone2 && phone1.length >= 8 && phone1 === phone2) {
        isMatch = true;
        reason = "تطابق في رقم الجوال الموحد (95%)";
        confidence = 95;
      }
      // 3. High Name similarity + matching phone prefix/partial
      else if (nameSim >= 0.75 && phone1 && phone2 && (phone1.includes(phone2) || phone2.includes(phone1))) {
        isMatch = true;
        reason = "تشابه كبير في الاسم وتطابق الهاتف (90%)";
        confidence = 90;
      }
      // 4. Very high name similarity + common specialty
      else if (nameSim >= 0.85 && c1.role && c2.role && c1.role.toLowerCase() === c2.role.toLowerCase()) {
        isMatch = true;
        reason = "تطابق في الاسم الكامل والمسمى الوظيفي (80%)";
        confidence = 80;
      }

      if (isMatch) {
        matchedDuplicates.push(c2);
        visitedIds.add(c2.id);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestReason = reason;
        }
      }
    }

    if (matchedDuplicates.length > 0) {
      visitedIds.add(c1.id);

      // Choose primary candidate: prefer the one with resume_url or higher AI score or later creation
      const allInGroup = [c1, ...matchedDuplicates];
      const sorted = [...allInGroup].sort((a, b) => {
        if (a.resume_url && !b.resume_url) return -1;
        if (!a.resume_url && b.resume_url) return 1;
        const scoreA = a.ai_score ?? 0;
        const scoreB = b.ai_score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return +new Date(b.created_at || 0) - +new Date(a.created_at || 0);
      });

      const primary = sorted[0];
      const duplicates = allInGroup.filter((c) => c.id !== primary.id);

      groups.push({
        id: `dup-${primary.id}`,
        primaryCandidate: primary,
        duplicates,
        matchReason: bestReason,
        confidence: maxConfidence,
      });
    }
  }

  return groups;
}

/**
 * Builds merged candidate payload from primary and secondary records
 */
export function buildMergedCandidatePayload(
  primary: CandidateDeduplicationItem,
  secondary: CandidateDeduplicationItem
): Partial<CandidateDeduplicationItem> {
  const mergedSkills = Array.from(
    new Set([...(primary.skills || []), ...(secondary.skills || [])])
  );

  const mergedSources = Array.from(
    new Set([primary.source, secondary.source].filter(Boolean))
  ).join(" + ");

  const mergeAudit = `[دمج ملف مكرر: ${secondary.name} (${secondary.id}) بتاريخ ${new Date().toLocaleDateString("ar-SA")}]`;
  const mergedSummary = [primary.summary, secondary.summary, mergeAudit]
    .filter(Boolean)
    .join("\n\n");

  const bestAiScore = Math.max(primary.ai_score ?? 0, secondary.ai_score ?? 0) || null;
  const bestRating = Math.max(primary.rating ?? 0, secondary.rating ?? 0) || null;

  return {
    name: primary.name || secondary.name,
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    resume_url: primary.resume_url || secondary.resume_url,
    skills: mergedSkills,
    source: mergedSources || primary.source || "مدمج",
    summary: mergedSummary,
    experience: primary.experience || secondary.experience,
    ai_score: bestAiScore,
    rating: bestRating,
  };
}