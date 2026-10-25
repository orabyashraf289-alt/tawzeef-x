/** Numeric experience statements only; ambiguous wording stays for human review. */
export function normalizeExperienceNumbers(value: string): string {
  return value.normalize("NFKC").replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  }).replace(/٫/g, ".").replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا").toLowerCase();
}

const number = "\\d+(?:\\.\\d+)?";
const unit = "(?:سنوات|سنه|سنة|اعوام|عام|years?|yrs?)(?![a-z\\u0621-\\u064a])";
const prefix = "(?:at least|minimum(?: of)?|at most|up to|maximum(?: of)?|more than|over|less than|under|على الاقل|بحد ادنى|بحد اقصى|حتى|اكثر من|اقل من)";
const pattern = new RegExp(`(?<![\\d.])(?:(${prefix})\\s+)?(?:من\\s+|between\\s+)?(${number})(?:\\s*(?:[-–—]|الى|to|and)\\s*(${number}))?\\s*(\\+)?\\s*${unit}(?:\\s*(\\+|على الاقل|فما فوق|او اكثر|على الاكثر))?`, "gi");

type YearsStatement = {
  min: number;
  max: number;
  exclusiveMin: boolean;
  exclusiveMax: boolean;
  text: string;
  index: number;
  exact: boolean;
};

function statements(value: string): YearsStatement[] {
  return [...value.matchAll(pattern)].map(match => {
    const first = Number(match[2]);
    const last = match[3] === undefined ? undefined : Number(match[3]);
    const modifier = match[1] || match[4] || match[5] || "";
    const upper = /^(at most|up to|maximum|بحد اقصى|حتى|على الاكثر)/.test(modifier);
    const exclusiveMax = /^(less than|under|اقل من)/.test(modifier);
    const exclusiveMin = /^(more than|over|اكثر من)/.test(modifier);
    return {
      min: upper || exclusiveMax ? 0 : first,
      max: upper || exclusiveMax ? first : last ?? Infinity,
      exclusiveMin, exclusiveMax, text: match[0], index: match.index!,
      exact: !modifier && last === undefined,
    };
  });
}

/** undefined = no numeric requirement; null = ambiguous or invalid. */
export function parseExperienceRequirement(value: string): (YearsStatement & { remaining: string }) | null | undefined {
  const normalized = normalizeExperienceNumbers(value);
  const found = statements(normalized);
  if (!found.length) return undefined;
  if (found.length !== 1) return null;
  const result = found[0];
  if (result.min > result.max || result.min > 80 || (result.max !== Infinity && result.max > 80)) return null;
  return { ...result, remaining: normalized.slice(0, result.index) + " " + normalized.slice(result.index + result.text.length) };
}

/** Do not truncate decimals, accept ranges as exact values, or guess from prose. */
export function parseEnteredExperience(value: string): number | null {
  const normalized = normalizeExperienceNumbers(value).trim();
  if (!new RegExp(`^${number}(?:\\s*${unit})?$`, "i").test(normalized)) return null;
  const years = Number.parseFloat(normalized);
  return years >= 0 && years <= 80 ? years : null;
}

export function meetsExperienceRequirement(years: number, requirement: YearsStatement): boolean {
  return (requirement.exclusiveMin ? years > requirement.min : years >= requirement.min) &&
    (requirement.exclusiveMax ? years < requirement.max : years <= requirement.max);
}

/** Only one consistent, explicit amount can prefill the editable experience field. */
export function extractStatedExperience(value: string): number | null {
  const normalized = normalizeExperienceNumbers(value);
  const found = statements(normalized);
  if (!found.length || found.some(item => !item.exact || item.min > 80 ||
    /(?:age|aged|عمر|العمر)\s*:?\s*$/.test(normalized.slice(Math.max(0, item.index - 20), item.index)) ||
    /^\s*old\b/.test(normalized.slice(item.index + item.text.length)))) return null;
  const distinct = new Set(found.map(item => item.min));
  return distinct.size === 1 ? found[0].min : null;
}
